import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.book import Book
from app.models.book_version import BookVersion
from app.models.user import User
from app.routers.books import _get_owned_book
from app.schemas.book import BookVersionOut, CreateVersionRequest
from app.services import s3_service
from app.services.html_sanitize import strip_editor_chrome
from app.services.html_validate import count_pages, validate_saved_html

router = APIRouter(prefix="/books/{book_id}/versions", tags=["versions"])


def _get_version(db: Session, book: Book, version_id: uuid.UUID) -> BookVersion:
    version = db.get(BookVersion, version_id)
    if version is None or version.book_id != book.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found")
    return version


@router.get("", response_model=list[BookVersionOut])
def list_versions(
    book_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Paginated, newest first. Autosave fires every time the document is
    dirty on a timer, so a long editing session produces hundreds of rows —
    returning the entire unbounded history on every panel open (the previous
    behaviour) gets slower for the rest of the book's life."""
    book = _get_owned_book(db, book_id, user)
    return (
        db.query(BookVersion)
        .filter(BookVersion.book_id == book.id)
        .order_by(BookVersion.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/{version_id}", response_class=Response)
def get_version_html(
    book_id: uuid.UUID,
    version_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    book = _get_owned_book(db, book_id, user)
    version = _get_version(db, book, version_id)
    html = s3_service.get_html(version.s3_key)
    return Response(content=html, media_type="text/html; charset=utf-8")


@router.post("", response_model=BookVersionOut, status_code=status.HTTP_201_CREATED)
def create_version(
    book_id: uuid.UUID,
    body: CreateVersionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    book = _get_owned_book(db, book_id, user)

    parent_id = body.parent_version_id or book.current_version_id
    if parent_id is not None:
        _get_version(db, book, parent_id)  # 404s if it doesn't belong to this book

    # Optimistic concurrency. The client always sends the version it started
    # editing from; if that's no longer the head, someone else (another tab,
    # another device, a stale session) has saved in the meantime. Previously
    # this was accepted silently, moving the head to a version whose content
    # never included the other save — that work stayed in the table but
    # vanished from the document, with nothing anywhere to indicate a fork
    # had happened. `force` is the client's explicit "yes, overwrite".
    if (
        not body.force
        and book.current_version_id is not None
        and parent_id != book.current_version_id
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This book was saved elsewhere since you started editing. "
            "Reload to get the latest version, or save again to overwrite it.",
        )

    html = strip_editor_chrome(validate_saved_html(body.html))

    version_id = uuid.uuid4()
    key = s3_service.version_key(user.id, book.id, version_id)
    size = s3_service.put_html(key, html)

    version = BookVersion(
        id=version_id,
        book_id=book.id,
        s3_key=key,
        parent_version_id=parent_id,
        label=body.label,
        page_count=count_pages(html),
        size_bytes=size,
        created_by=user.id,
    )
    db.add(version)
    db.flush()

    book.current_version_id = version.id
    db.commit()
    db.refresh(version)
    return version


@router.post("/{version_id}/revert", response_model=BookVersionOut, status_code=status.HTTP_201_CREATED)
def revert_to_version(
    book_id: uuid.UUID,
    version_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Reverting never rewrites history — it copies an old version's HTML
    into a brand-new version row/object and makes that current, keeping the
    version chain linear and append-only."""
    book = _get_owned_book(db, book_id, user)
    old_version = _get_version(db, book, version_id)
    html = s3_service.get_html(old_version.s3_key)

    new_id = uuid.uuid4()
    key = s3_service.version_key(user.id, book.id, new_id)
    size = s3_service.put_html(key, html)

    new_version = BookVersion(
        id=new_id,
        book_id=book.id,
        s3_key=key,
        parent_version_id=book.current_version_id,
        label=f"Reverted to {old_version.created_at:%Y-%m-%d %H:%M}",
        page_count=old_version.page_count,
        size_bytes=size,
        created_by=user.id,
    )
    db.add(new_version)
    db.flush()

    book.current_version_id = new_version.id
    db.commit()
    db.refresh(new_version)
    return new_version
