import uuid

import boto3

from app.config import settings

_s3 = boto3.client("s3", region_name=settings.aws_region)


def _key(*parts: str) -> str:
    return "/".join([settings.s3_prefix.strip("/"), *parts])


def original_key(user_id: uuid.UUID, book_id: uuid.UUID) -> str:
    return _key("users", str(user_id), "books", str(book_id), "original", "source.html")


def version_key(user_id: uuid.UUID, book_id: uuid.UUID, version_id: uuid.UUID) -> str:
    return _key("users", str(user_id), "books", str(book_id), "versions", f"{version_id}.html")


def check_access() -> None:
    """Cheapest call that actually proves the credentials work and the bucket
    is reachable — raises (ClientError / NoCredentialsError / the
    expired-token error) if not. Used by /health so an expired AWS session
    token shows up as a red dependency instead of as mysteriously failing
    saves hours later."""
    _s3.head_bucket(Bucket=settings.s3_bucket)


def put_html(key: str, html: str) -> int:
    """Uploads HTML text to S3, returns the byte size written."""
    body = html.encode("utf-8")
    _s3.put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=body,
        ContentType="text/html; charset=utf-8",
    )
    return len(body)


def get_html(key: str) -> str:
    obj = _s3.get_object(Bucket=settings.s3_bucket, Key=key)
    return obj["Body"].read().decode("utf-8")


def delete_prefix(user_id: uuid.UUID, book_id: uuid.UUID) -> None:
    """Best-effort cleanup of every object under a deleted book's key prefix."""
    prefix = _key("users", str(user_id), "books", str(book_id)) + "/"
    paginator = _s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=settings.s3_bucket, Prefix=prefix):
        keys = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
        if keys:
            _s3.delete_objects(Bucket=settings.s3_bucket, Delete={"Objects": keys})
