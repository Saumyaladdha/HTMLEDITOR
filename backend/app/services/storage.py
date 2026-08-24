import logging
import os
import uuid
from pathlib import Path

from app.config import settings

logger = logging.getLogger("book_editor.storage")

# --------------------------------------------------------------------------
# Where document HTML lives.
#
# Two backends behind one interface:
#
#   s3    — the real one. What production uses.
#   local — plain files under a directory on disk.
#
# The local backend exists because the S3 credentials this app uses are
# short-lived and have to be re-minted through MFA. Whenever they lapse,
# EVERY operation fails — upload, load, save, export — so the app cannot be
# run or demonstrated at all, even though nothing about it is broken. Being
# unable to start the thing you are working on because a token expired is a
# bad place to be, and "just refresh the token" is not always available.
#
# The layout mirrors the S3 key structure exactly, so switching backends
# changes nothing else and a local tree can be uploaded to S3 verbatim.
# --------------------------------------------------------------------------


def _key(*parts: str) -> str:
    return "/".join([settings.s3_prefix.strip("/"), *parts])


def original_key(user_id: uuid.UUID, book_id: uuid.UUID) -> str:
    return _key("users", str(user_id), "books", str(book_id), "original", "source.html")


def version_key(user_id: uuid.UUID, book_id: uuid.UUID, version_id: uuid.UUID) -> str:
    return _key("users", str(user_id), "books", str(book_id), "versions", f"{version_id}.html")


class LocalStorage:
    """Files on disk, keyed exactly as the S3 backend keys objects."""

    def __init__(self, root: str):
        self.root = Path(root).expanduser().resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        # Keys are built by this module from UUIDs, never from user input, but
        # resolve-and-check anyway so a malformed key can never escape the
        # storage root.
        path = (self.root / key).resolve()
        if not str(path).startswith(str(self.root)):
            raise ValueError(f"Refusing to write outside the storage root: {key!r}")
        return path

    def check_access(self) -> None:
        probe = self._path(_key(".healthcheck"))
        probe.parent.mkdir(parents=True, exist_ok=True)
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)

    def put_html(self, key: str, html: str) -> int:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        body = html.encode("utf-8")
        path.write_bytes(body)
        return len(body)

    def get_html(self, key: str) -> str:
        return self._path(key).read_text(encoding="utf-8")

    def delete_prefix(self, user_id: uuid.UUID, book_id: uuid.UUID) -> None:
        import shutil

        target = self._path(_key("users", str(user_id), "books", str(book_id)))
        shutil.rmtree(target, ignore_errors=True)


class S3Storage:
    """The real backend. The boto3 client is created lazily rather than at
    import time, so an unconfigured environment can still start the app and
    report the problem through /health instead of failing to import."""

    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            import boto3

            self._client = boto3.client("s3", region_name=settings.aws_region)
        return self._client

    def check_access(self) -> None:
        self.client.head_bucket(Bucket=settings.s3_bucket)

    def put_html(self, key: str, html: str) -> int:
        body = html.encode("utf-8")
        self.client.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=body,
            ContentType="text/html; charset=utf-8",
        )
        return len(body)

    def get_html(self, key: str) -> str:
        obj = self.client.get_object(Bucket=settings.s3_bucket, Key=key)
        return obj["Body"].read().decode("utf-8")

    def delete_prefix(self, user_id: uuid.UUID, book_id: uuid.UUID) -> None:
        prefix = _key("users", str(user_id), "books", str(book_id)) + "/"
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=settings.s3_bucket, Prefix=prefix):
            keys = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
            if keys:
                self.client.delete_objects(Bucket=settings.s3_bucket, Delete={"Objects": keys})


def _build_backend():
    choice = (settings.storage_backend or "s3").lower()
    if choice == "local":
        directory = settings.local_storage_dir or os.path.join(os.getcwd(), ".local_storage")
        logger.warning(
            "Using LOCAL disk storage at %s — development only, not durable, not shared.",
            directory,
        )
        return LocalStorage(directory)
    return S3Storage()


_backend = _build_backend()


def check_access() -> None:
    _backend.check_access()


def put_html(key: str, html: str) -> int:
    """Stores HTML, returning the byte size written."""
    return _backend.put_html(key, html)


def get_html(key: str) -> str:
    return _backend.get_html(key)


def delete_prefix(user_id: uuid.UUID, book_id: uuid.UUID) -> None:
    """Best-effort cleanup of everything belonging to a deleted book."""
    _backend.delete_prefix(user_id, book_id)


def describe() -> str:
    return type(_backend).__name__
