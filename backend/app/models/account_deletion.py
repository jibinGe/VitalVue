from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class AccountDeletionRequest(Base):
    """A user-submitted request to delete their account and associated data.

    Filed from the public web form (Google Play data-deletion requirement). No auth
    required to submit — the requester supplies an identifier (user_id or email) plus a
    contact email. Staff review pending rows and action the deletion out-of-band.
    """
    __tablename__ = "account_deletion_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    identifier: Mapped[str] = mapped_column(String(128), index=True)  # user_id or email as typed
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    matched_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # users.id if resolved
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)  # pending|done|rejected
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
