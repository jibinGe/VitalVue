from app.core.config import settings
from app.database import redis_client

REDIS_KEY = "api_log:enabled"


async def logging_enabled() -> bool:
    """Effective API-logging flag: Redis runtime override wins; else the env default (API_LOG_ENABLED)."""
    val = await redis_client.get(REDIS_KEY)
    if val is not None:
        return val == b"1" or val == "1"
    return getattr(settings, "API_LOG_ENABLED", True)


async def set_logging(on: bool) -> None:
    await redis_client.set(REDIS_KEY, "1" if on else "0")
