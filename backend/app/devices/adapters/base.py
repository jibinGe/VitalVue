"""What every protocol adapter provides. A codec instance serves ONE connection: it keeps the
bytes of a half-received frame between reads, and whatever it learns about the watch's dialect."""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

# A frame bigger than this (or a stream with no frame boundary for this long) is garbage.
MAX_BUFFER = 64 * 1024


@dataclass
class Decoded:
    imei: Optional[str]
    name: str                             # vendor message type, e.g. "upBP" / "BPUP" (raw log topic)
    events: list = field(default_factory=list)
    dedupe_key: Optional[str] = None      # stable id of an upload the watch may resend
    is_reply: bool = False                # the watch answering one of our commands (no ack back)
    signature_ok: Optional[bool] = None   # Wonlex encryptionCode: True / False / None (absent)
    error: Optional[str] = None           # set when the frame couldn't be parsed at all
    raw: dict = field(default_factory=dict)   # parsed fields, for building the reply


class Codec:
    device_type: str = ""

    def __init__(self) -> None:
        self.buffer = bytearray()
        self.dropped_bytes = 0            # garbage skipped while looking for frames

    def feed(self, data: bytes) -> list[bytes]:
        """Add received bytes; return every complete frame now available."""
        self.buffer.extend(data)
        frames = self._frames()
        if len(self.buffer) > MAX_BUFFER:     # never let one connection grow without bound
            self.dropped_bytes += len(self.buffer)
            self.buffer.clear()
        return frames

    def _frames(self) -> list[bytes]:
        raise NotImplementedError

    def decode(self, frame: bytes, now: datetime) -> Decoded:
        raise NotImplementedError

    def reply(self, decoded: Decoded, bound: bool, now: datetime) -> Optional[bytes]:
        """The acknowledgement for an uplink, or None when it needs none."""
        raise NotImplementedError

    def encode(self, imei: str, command, now: datetime) -> list[bytes]:
        """Bytes for a canonical command; [] when this watch can't do it."""
        raise NotImplementedError


def epoch_ms(dt: datetime) -> int:
    return int(dt.replace(tzinfo=timezone.utc).timestamp() * 1000) if dt.tzinfo is None else int(dt.timestamp() * 1000)


def from_epoch(value, unit: str = "s") -> Optional[datetime]:
    """Naive-UTC datetime from epoch seconds or milliseconds; None when unreadable."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    if unit == "ms":
        v /= 1000.0
    try:
        return datetime.fromtimestamp(v, tz=timezone.utc).replace(tzinfo=None)
    except (OverflowError, OSError, ValueError):
        return None


def to_int(value) -> Optional[int]:
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return None


def to_float(value) -> Optional[float]:
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None
