import re

from fastapi import HTTPException, status

from app.config import settings

_PAGE_COLS_RE = re.compile(r'class="[^"]*\bpage__cols\b[^"]*"')
_PAGE_RE = re.compile(r'class="[^"]*(?<!__cols)\bpage\b[^"]*"')


def validate_upload(raw: bytes) -> str:
    """Sanity-checks an uploaded chapter HTML file before it's ever stored.
    Not a full HTML validator — just enough to reject obviously-wrong
    uploads early (wrong file type, empty file, oversized file) rather than
    silently storing garbage a teacher can never open in the editor."""
    if len(raw) == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded file is empty")
    if len(raw) > settings.max_upload_bytes:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"File too large ({len(raw)} bytes, max {settings.max_upload_bytes})",
        )
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File is not valid UTF-8 HTML")

    if not _PAGE_COLS_RE.search(text) or not _PAGE_RE.search(text):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This doesn't look like a paginated chapter export — "
            "expected .page / .page__cols divs from the book pipeline",
        )
    return text


def count_pages(html: str) -> int:
    return len(_PAGE_RE.findall(html))
