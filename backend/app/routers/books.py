import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.book import Book
from app.models.book_version import BookVersion
from app.models.user import User
from app.schemas.book import BookOut
from app.services import s3_service
from app.services.html_validate import count_pages, validate_upload

router = APIRouter(prefix="/books", tags=["books"])


def _get_owned_book(db: Session, book_id: uuid.UUID, user: User) -> Book:
    book = db.get(Book, book_id)
    if book is None or book.owner_id != user.id:
        # Same 404 whether it doesn't exist or belongs to someone else —
        # never leak "this book exists but isn't yours" to another user.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Book not found")
    return book


@router.post("", response_model=BookOut, status_code=status.HTTP_201_CREATED)
async def upload_book(
    file: UploadFile,
    title: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    raw = await file.read()
    html = validate_upload(raw)

    book_id = uuid.uuid4()
    version_id = uuid.uuid4()
    original_key = s3_service.original_key(user.id, book_id)
    version_s3_key = s3_service.version_key(user.id, book_id, version_id)

    size = s3_service.put_html(original_key, html)
    s3_service.put_html(version_s3_key, html)

    book = Book(id=book_id, owner_id=user.id, title=title, original_s3_key=original_key)
    db.add(book)
    db.flush()

    version = BookVersion(
        id=version_id,
        book_id=book.id,
        s3_key=version_s3_key,
        parent_version_id=None,
        label="Uploaded",
        page_count=count_pages(html),
        size_bytes=size,
        created_by=user.id,
    )
    db.add(version)
    db.flush()

    book.current_version_id = version.id
    db.commit()
    db.refresh(book)
    return book


@router.get("", response_model=list[BookOut])
def list_books(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(Book)
        .filter(Book.owner_id == user.id)
        .order_by(Book.updated_at.desc())
        .all()
    )


@router.get("/{book_id}", response_model=BookOut)
def get_book(book_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get_owned_book(db, book_id, user)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    book = _get_owned_book(db, book_id, user)
    # current_version_id must be cleared before the cascade delete removes
    # book_versions rows, otherwise Postgres rejects the delete: the FK from
    # books.current_version_id would be left pointing at a row about to be
    # deleted (use_alter on that column only defers constraint *creation*,
    # not enforcement order at delete time).
    book.current_version_id = None
    db.flush()
    s3_service.delete_prefix(user.id, book.id)
    db.delete(book)
    db.commit()
