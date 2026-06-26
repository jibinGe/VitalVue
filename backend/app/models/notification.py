from datetime import datetime
from sqlalchemy import ForeignKey, String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class DeviceToken(Base):
    """FCM push token for a staff (nurse/doctor) device. One user → many devices.
    Registered on staff login, removed on logout / patient-login (Plan D, RUN-024)."""
    __tablename__ = "device_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    platform: Mapped[str] = mapped_column(String(20), default="android")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
