"""Protocol adapters: one per watch vendor. Pure code (no DB, no Redis, no sockets)."""
from app.devices.adapters.bpw8 import Bpw8Codec
from app.devices.adapters.wonlex import WonlexCodec
from app.models.device import DEVICE_BPW8, DEVICE_WONLEX

CODECS = {DEVICE_WONLEX: WonlexCodec, DEVICE_BPW8: Bpw8Codec}


def new_codec(device_type: str):
    """A fresh codec for one TCP connection (it holds that connection's stream buffer)."""
    return CODECS[device_type]()
