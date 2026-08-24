import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.book import Book
from app.models.book_version import BookVersion
from app.models.user import User
from app.schemas.book import BookOut
from app.services import storage
from app.services.html_flatten import flatten_if_needed
from app.services.html_ingest import is_script_rendered
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

    # Some single-file exports carry no editable markup at all: the content is
    # unpacked and rendered by JavaScript on load, so the file itself is one
    # "this page requires JavaScript" line plus a few hundred KB of bundled
    # modules. The editor cannot run that script (the canvas is same-origin
    # with the app, so untrusted code there would reach the user's session),
    # which means such a document would open as a blank page with no
    # explanation. Rendering it ONCE here — server-side, in a throwaway
    # headless browser — turns it into ordinary HTML the editor handles well.
    #
    # The original bytes are stored unchanged under original_s3_key regardless,
    # so flattening only ever adds an editable representation.
    note: str | None = None
    editable_html = html
    if is_script_rendered(html):
        editable_html, note = flatten_if_needed(html)

    book_id = uuid.uuid4()
    version_id = uuid.uuid4()
    original_key = storage.original_key(user.id, book_id)
    version_s3_key = storage.version_key(user.id, book_id, version_id)

    storage.put_html(original_key, html)
    # The version's recorded size must describe what the VERSION holds, not
    # the original upload — those differ whenever flattening changed the
    # document, and version history reports this number to the user.
    size = storage.put_html(version_s3_key, editable_html)

    book = Book(id=book_id, owner_id=user.id, title=title, original_s3_key=original_key)
    db.add(book)
    db.flush()

    version = BookVersion(
        id=version_id,
        book_id=book.id,
        s3_key=version_s3_key,
        parent_version_id=None,
        label="Uploaded (converted from a JavaScript-rendered page)" if note else "Uploaded",
        page_count=count_pages(editable_html),
        size_bytes=size,
        created_by=user.id,
    )
    db.add(version)
    db.flush()

    book.current_version_id = version.id
    db.commit()
    db.refresh(book)
    # `note` rides along on the response so the client can explain what
    # happened; BookOut ignores unknown attributes, so it is attached only
    # for the schema field declared for it.
    book.ingest_note = note
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
    storage.delete_prefix(user.id, book.id)
    db.delete(book)
    db.commit()
