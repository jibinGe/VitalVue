import time
import uuid
import traceback
import logging
from starlette.requests import Request
from app.database import SessionLocal
from app.models.api_log import ApiLog
from app.core.log_config import logging_enabled

log = logging.getLogger(__name__)


async def api_log_middleware(request: Request, call_next):
    """Record every request (method/path/status/latency) + exception traceback for forensics.
    SAFETY: never reads body/query/headers (no PHI/secret leak); never breaks the request (the DB
    write is swallowed on failure); re-raises handler exceptions so they still propagate."""
    if not await logging_enabled():
        return await call_next(request)

    start = time.monotonic()
    rid = uuid.uuid4().hex
    status_code = 500
    err_type = err_detail = tb = None

    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    except Exception as e:
        err_type = type(e).__name__
        err_detail = str(e)[:2000]
        tb = traceback.format_exc()[:8000]
        status_code = 500
        raise
    finally:
        latency = int((time.monotonic() - start) * 1000)
        try:
            async with SessionLocal() as db:
                db.add(ApiLog(
                    method=request.method,
                    path=request.url.path,
                    status_code=status_code,
                    latency_ms=latency,
                    client_host=(request.client.host if request.client else None),
                    request_id=rid,
                    error_type=err_type,
                    error_detail=err_detail,
                    traceback=tb,
                ))
                await db.commit()
        except Exception as log_err:
            log.warning("api_log write failed: %s", log_err)
