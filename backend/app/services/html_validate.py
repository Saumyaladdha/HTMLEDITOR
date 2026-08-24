import re

from fastapi import HTTPException, status

from app.config import settings

# Matches every class="..." attribute; membership is then tested against the
# SPLIT token list rather than with a word-boundary regex. `\bpage\b` looked
# right but also matched `class="page-number"` / `class="page-footer"`
# (hyphen is a word boundary), silently inflating the page count shown in
# version history. Exact token comparison can't make that mistake.
_CLASS_ATTR_RE = re.compile(r'class="([^"]*)"')

# Any element at all in the body — the only real "is this HTML?" test worth
# making. Deliberately NOT a structural check for this pipeline's own
# `.page`/`.page__cols` divs: the editor accepts arbitrary HTML now, so
# requiring those would reject every document that isn't a packaged chapter.
_HAS_ELEMENT_RE = re.compile(r"<[a-zA-Z][^>]*>")


def validate_upload(raw: bytes) -> str:
    """Sanity-checks an uploaded HTML file before it's ever stored.

    Deliberately permissive: it rejects things that are definitely not
    editable HTML (empty, oversized, not UTF-8, no markup at all) and
    nothing else. It used to additionally require `.page`/`.page__cols`
    divs from this repo's own chapter pipeline, which made every other
    HTML document — a Word export, an EPUB chapter, someone else's
    textbook — impossible to upload at all. Structure is now DETECTED
    (see `looks_paginated`) and used to pick an editing mode, never used
    as an admission test.
    """
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

    if not _HAS_ELEMENT_RE.search(text):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This file doesn't contain any HTML markup — expected an .html document",
        )
    return text


def validate_saved_html(html: str) -> str:
    """The same size/emptiness guards as `validate_upload`, applied to HTML
    arriving via `POST /versions`. That endpoint previously accepted a body
    of any size and any content at all, so a bug (or a bad client) could
    store an empty or multi-hundred-MB document that only failed later, at
    LOAD time, as an unexplained blank canvas. Guarding the write side is
    what actually keeps bad data out."""
    if not html.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Refusing to save an empty document")
    size = len(html.encode("utf-8"))
    if size > settings.max_upload_bytes:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Document too large to save ({size} bytes, max {settings.max_upload_bytes})",
        )
    return html


def count_pages(html: str) -> int:
    """Number of `.page` elements — 0 for a non-paginated (flow) document,
    which is a normal and expected result, not an error."""
    return sum(1 for m in _CLASS_ATTR_RE.finditer(html) if "page" in m.group(1).split())


def looks_paginated(html: str) -> bool:
    return count_pages(html) > 0
