"""Devices (BLE bands and 4G watches: Veepoo over MQTT, Wonlex and CLOC BPW8 over TCP), their
patient assignments, monitoring schedules and the raw traffic of 4G watches."""
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, LargeBinary, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

DEVICE_BLE = "ble_band"
DEVICE_4G = "veepoo_4g"
DEVICE_WONLEX = "wonlex_4g"
DEVICE_BPW8 = "bpw8_4g"


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(20), default=DEVICE_4G)
    # Veepoo: MQTT clientId = MAC + "_" + DeviceNumber, e.g. F1F2F3F4F5F6_9999 (also the MQTT
    # username). Wonlex / BPW8: the 15-digit IMEI.
    client_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    transport: Mapped[str] = mapped_column(String(10), default="mqtt")     # mqtt | tcp (registry)
    mac: Mapped[Optional[str]] = mapped_column(String(17), nullable=True)
    device_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mqtt_password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    organization_id: Mapped[Optional[int]] = mapped_column(ForeignKey("organizations.id"), nullable=True)
    patient_id: Mapped[Optional[int]] = mapped_column(ForeignKey("patients.id"), nullable=True, index=True)

    # Reported by the watch (device_info_report / device_status_report)
    firmware: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    hardware: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    iccid: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    timezone_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    capabilities: Mapped[dict] = mapped_column(JSONB, default=dict)
    battery_percent: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    battery_state: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    sim_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    reported_config: Mapped[dict] = mapped_column(JSONB, default=dict)    # settings changed on the watch
    last_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_connected_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duplicate_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    # Archived = retired from use (lost, broken, returned): disabled, unlinked and hidden from
    # lists, but kept so its history (who wore it when, its readings) stays intact.
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)
    archived_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    archive_reason: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)


class DeviceAssignment(Base):
    """History of which patient wore which device, so every reading maps to the right patient."""
    __tablename__ = "device_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    unassigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    assigned_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)


class MonitoringProfile(Base):
    """Measurement schedule for 4G watches, at three levels:
    patient_id set                         that patient's override (doctor or admin)
    patient_id NULL, organization_id set   that hospital's default (its org admin)
    both NULL                              the global default (master admin)
    Intervals are in minutes; None = that vital's automatic measurement is off."""
    __tablename__ = "monitoring_profiles"
    # One row per patient, one per hospital and exactly one global row: three partial unique
    # indexes (created in the migration — a plain UNIQUE would allow several NULL rows).

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[Optional[int]] = mapped_column(ForeignKey("patients.id"), nullable=True)
    organization_id: Mapped[Optional[int]] = mapped_column(ForeignKey("organizations.id"), nullable=True)
    hr_interval_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    bp_interval_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    spo2_interval_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    temp_interval_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    hrv_interval_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stress_interval_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    upload_interval_min: Mapped[int] = mapped_column(Integer, default=5)
    window_start: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)   # "HH:MM", None = all day
    window_end: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    updated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DeviceConfigState(Base):
    """Delivery state of the current schedule to one watch (pending → sent → applied / failed /
    unsupported), plus the limits the watch reported back (E7)."""
    __tablename__ = "device_config_states"

    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), primary_key=True)
    profile_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    applied_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    device_limits: Mapped[dict] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MqttRawMessage(Base):
    """Every packet from a 4G watch, kept for audit and re-parsing (retention 30 days). Despite
    the name it also holds TCP frames (transport "tcp"; topic = the vendor's message type)."""
    __tablename__ = "mqtt_raw_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[str] = mapped_column(String(64), index=True)
    patient_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    transport: Mapped[str] = mapped_column(String(10), default="mqtt")
    topic: Mapped[str] = mapped_column(String(128))
    head: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    payload: Mapped[bytes] = mapped_column(LargeBinary)
    parse_status: Mapped[str] = mapped_column(String(20), default="received")
    parse_error: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class DeviceDataBlock(Base):
    """One processed 5-minute daily-data block — the dedupe key so a re-sent upload (QoS 0
    retries) never creates duplicate vitals."""
    __tablename__ = "device_data_blocks"
    __table_args__ = (UniqueConstraint("device_id", "day", "block_no", "crc", name="uq_device_data_blocks"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    day: Mapped[str] = mapped_column(String(10))          # calendar date the block belongs to
    block_no: Mapped[int] = mapped_column(Integer)        # 1..288
    crc: Mapped[int] = mapped_column(Integer)
    measured_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DeviceMessageKey(Base):
    """One processed upload from a TCP watch — the dedupe key, so an upload the watch resends
    after a missed reply never creates duplicate vitals (purged after 30 days)."""
    __tablename__ = "device_message_keys"

    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), primary_key=True)
    dedupe_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
