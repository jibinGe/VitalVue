"""EMQX HTTP authentication / authorization hooks for Veepoo 4G watches.

Called by the broker over the internal Docker network only (nginx denies /api/v1/internal/
from outside) and additionally protected by the X-Emqx-Secret header.

- auth:  a watch logs in with username = its clientId and the password issued at registration;
         the mqtt-worker logs in as MQTT_WORKER_USER and is a superuser.
- authz: a watch may only publish vpwatch/{its clientId}/v1/# and subscribe server/{its clientId}/v1/#.
"""
import hmac

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import verify_password
from app.database import get_db
from app.models.device import DEVICE_4G, Device

router = APIRouter()

ALLOW = {"result": "allow", "is_superuser": False}
DENY = {"result": "deny"}


PLACEHOLDER_SECRET = "not-set"   # emqx.conf default until the env override is applied


def _secret_ok(secret: str | None) -> bool:
    configured = settings.EMQX_HOOK_SECRET
    if not configured or configured == PLACEHOLDER_SECRET:
        return False
    return hmac.compare_digest(secret or "", configured)


class AuthIn(BaseModel):
    username: str = ""
    password: str = ""
    clientid: str = ""


class AuthzIn(BaseModel):
    username: str = ""
    clientid: str = ""
    topic: str = ""
    action: str = ""      # "publish" | "subscribe"


@router.post("/auth")
async def emqx_auth(body: AuthIn, x_emqx_secret: str | None = Header(default=None),
                    db: AsyncSession = Depends(get_db)):
    if not _secret_ok(x_emqx_secret):
        return DENY
    if settings.MQTT_WORKER_PASS and body.username == settings.MQTT_WORKER_USER:
        ok = hmac.compare_digest(body.password, settings.MQTT_WORKER_PASS)
        return {"result": "allow", "is_superuser": True} if ok else DENY
    # A watch's username must equal the clientId it was issued for.
    if not body.clientid or body.username != body.clientid:
        return DENY
    device = (await db.execute(select(Device).where(Device.client_id == body.clientid))).scalar_one_or_none()
    # TCP watches (Wonlex, BPW8) have no MQTT login at all.
    if device is None or not device.is_active or not device.mqtt_password_hash or device.type != DEVICE_4G:
        return DENY
    return ALLOW if verify_password(body.password, device.mqtt_password_hash) else DENY


@router.post("/authz")
async def emqx_authz(body: AuthzIn, x_emqx_secret: str | None = Header(default=None)):
    if not _secret_ok(x_emqx_secret):
        return DENY
    cid = body.clientid
    if not cid or "/" in cid or "+" in cid or "#" in cid:
        return DENY
    if body.action == "publish" and body.topic.startswith(f"vpwatch/{cid}/v1/"):
        return {"result": "allow"}
    if body.action == "subscribe" and body.topic.startswith(f"server/{cid}/v1/"):
        return {"result": "allow"}
    return DENY
