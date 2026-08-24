import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.book import Book
from app.models.user import User
from app.routers.books import _get_owned_book
from app.routers.versions import _get_version
from app.services import s3_service

router = APIRouter(prefix="/books/{book_id}/export", tags=["export"])


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
    html = s3_service.get_html(version.s3_key)

    if format == "html":
        filename = f"{book.title.replace(' ', '_')}.html"
        return Response(
            content=html,
            media_type="text/html; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    if format == "pdf":
        # Phase 3 (per plan): reuse HTML_Automation/skills/skill_pdf_exporter's
        # headless-Chrome pattern (>=15000ms virtual-time-budget). Not wired
        # up yet — fail loudly rather than silently returning HTML as "pdf".
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "PDF export isn't implemented yet")
    raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown export format: {format!r}")
