import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class BookVersion(Base):
    __tablename__ = "book_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    book_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("books.id"), nullable=False, index=True)
    s3_key: Mapped[str] = mapped_column(String, nullable=False)
    # ON DELETE SET NULL: a version chain can be several deep (revert ->
    # revert -> revert), so deleting a book means deleting every one of its
    # versions in one shot — some of which are still referenced as another
    # row's parent. Without this, Postgres rejects the delete outright
    # (ForeignKeyViolation) the moment a still-referenced parent row is
    # removed, since self-referential FKs aren't ordered by cascade="all,
    # delete-orphan" on the Book side. current_version_id on Book has the
    # same issue and is handled by explicitly nulling it before delete in
    # the router; this is the same fix at the schema level instead, since
    # there's no single place in app code that owns every parent link.
    parent_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("book_versions.id", ondelete="SET NULL"), nullable=True,
    )
    label: Mapped[str | None] = mapped_column(String, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    book: Mapped["Book"] = relationship(back_populates="versions", foreign_keys=[book_id])
