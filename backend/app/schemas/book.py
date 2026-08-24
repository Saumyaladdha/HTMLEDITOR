import uuid
from datetime import datetime

from pydantic import BaseModel


class BookOut(BaseModel):
    id: uuid.UUID
    title: str
    current_version_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BookVersionOut(BaseModel):
    id: uuid.UUID
    book_id: uuid.UUID
    parent_version_id: uuid.UUID | None
    label: str | None
    page_count: int | None
    size_bytes: int
    created_by: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class CreateVersionRequest(BaseModel):
    html: str
    label: str | None = None
    parent_version_id: uuid.UUID | None = None
    # Set by the client only after the user has been shown the 409 conflict
    # and explicitly chosen to overwrite whatever was saved elsewhere.
    force: bool = False
