from sqlalchemy import ForeignKey, String, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Location for Screen 1 filtering
    country: Mapped[str] = mapped_column(String(100), index=True)
    state: Mapped[str] = mapped_column(String(100), index=True)
    city: Mapped[str] = mapped_column(String(100), index=True)

    # Relationships
    departments: Mapped[list["Department"]] = relationship(back_populates="organization")
    users: Mapped[list["User"]] = relationship(back_populates="organization")

class Department(Base):
    __tablename__ = "departments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))

    organization: Mapped["Organization"] = relationship(back_populates="departments")
    wards: Mapped[list["Ward"]] = relationship(back_populates="department")

class Ward(Base):
    __tablename__ = "wards"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False) # e.g., "ICU", "General-A"
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))

    department: Mapped["Department"] = relationship(back_populates="wards")
    rooms: Mapped[list["Room"]] = relationship(back_populates="ward")

class Room(Base):
    __tablename__ = "rooms"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    room_number: Mapped[str] = mapped_column(String(50), nullable=False)
    is_occupied: Mapped[bool] = mapped_column(Boolean, default=False)
    ward_id: Mapped[int] = mapped_column(ForeignKey("wards.id"))

    ward: Mapped["Ward"] = relationship(back_populates="rooms")
