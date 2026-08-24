import re
import unicodedata
import uuid
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.book import Book
from app.models.user import User
from app.routers.books import _get_owned_book
from app.routers.versions import _get_version
from app.services import storage

router = APIRouter(prefix="/books/{book_id}/export", tags=["export"])

# Anything that has no business in a filename, plus the quote/backslash/CR/LF
# that would let a crafted title break out of the quoted header value
# entirely and inject a header of its own.
_UNSAFE_FILENAME_CHARS = re.compile(r'[\\/:*?"<>|\x00-\x1f]')


def _content_disposition(title: str, extension: str) -> str:
    """Builds an RFC 6266 Content-Disposition for a book title.

    Two problems with interpolating the title straight into
    `filename="{title}"`, which is what this used to do:

    1. HTTP header values are latin-1. Every title in this pipeline is
       Hindi, so `"अध्याय 1".encode("latin-1")` raised UnicodeEncodeError
       and the export endpoint returned a 500 — HTML export was simply
       broken for the entire real corpus.
    2. `title` is an arbitrary user-supplied query parameter at upload
       time. A quote closed the quoted-string early and a CR/LF could
       append a header of the server's own.

    RFC 6266 solves both: a conservative ASCII `filename` for old clients,
    plus a percent-encoded UTF-8 `filename*` that every current browser
    prefers and that preserves the real Hindi title.
    """
    safe_title = _UNSAFE_FILENAME_CHARS.sub("", title).strip() or "document"

    # ASCII fallback: decompose accents to their base letters where possible,
    # drop whatever still isn't representable, and never emit an empty name.
    ascii_title = (
        unicodedata.normalize("NFKD", safe_title).encode("ascii", "ignore").decode("ascii").strip()
    )
    ascii_name = (re.sub(r"\s+", "_", ascii_title) or "document") + extension
    utf8_name = quote(f"{safe_title}{extension}", safe="")
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{utf8_name}"


@router.get("")
def export_book(
    book_id: uuid.UUID,
    format: str = "html",
    version_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    book = _get_owned_book(db, book_id, user)
    target_version_id = version_id or book.current_version_id
    if target_version_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This book has no saved versions yet")
    version = _get_version(db, book, target_version_id)
    html = storage.get_html(version.s3_key)

    if format == "html":
        return Response(
            content=html,
            media_type="text/html; charset=utf-8",
            headers={"Content-Disposition": _content_disposition(book.title, ".html")},
        )
    if format == "pdf":
        # Phase 3 (per plan): reuse HTML_Automation/skills/skill_pdf_exporter's
        # headless-Chrome pattern (>=15000ms virtual-time-budget). Not wired
        # up yet — fail loudly rather than silently returning HTML as "pdf".
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "PDF export isn't implemented yet")
    raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown export format: {format!r}")
