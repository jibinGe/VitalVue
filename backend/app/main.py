from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import asyncio

from app.api.v1 import auth, discovery, patients, vitals, stream, s3, admin, account, devices, internal_emqx, watch_data
from app.core.config import settings
from app.cron.heartbeat import monitor_device_heartbeats

async def heartbeat_cron_worker():
    """
    An endless loop worker that executes the heartbeat checker 
    exactly once every 60 seconds.
    """
    print("[CRON] Device heartbeat background worker started.")
    while True:
        try:
            # Execute the heartbeat sweeping logic we built
            await monitor_device_heartbeats()
        except Exception as e:
            # Safeguard: Log exceptions so a database crash doesn't kill the whole cron process
            print(f"[CRON ERROR] Exception caught in heartbeat worker: {e}")
        
        # Sleep for 60 seconds before executing the sweep loop again
        await asyncio.sleep(60)

async def baseline_cron_worker():
    """Baseline Engine v1 (shadow mode). Its own task, session and error handling so a slow or
    failing cycle can never delay the device-offline heartbeat sweep. Wakes every 60 seconds;
    only does work once a 10-minute window has closed."""
    from app.database import SessionLocal, get_redis
    from app.services.baseline.job import run_baseline_cycle

    print("[CRON] Baseline engine background worker started.")
    while True:
        try:
            async with SessionLocal() as db:
                await run_baseline_cycle(db, await get_redis())
        except Exception as e:
            print(f"[CRON ERROR] Exception caught in baseline worker: {e}")
        await asyncio.sleep(60)

async def archive_cron_worker():
    """Vitals archiving on the ARCHIVE_DAYS / ARCHIVE_TIME schedule. Checks every 5 minutes
    whether a scheduled run is due; the last run is kept in Redis, so a restart neither repeats
    a run nor skips one that came due while the scheduler was down."""
    from datetime import datetime
    from app.database import get_redis
    from app.services.archive import last_slot, parse_schedule, run_archive_cycle

    if not settings.ARCHIVE_ENABLED:
        return
    try:
        days, at = parse_schedule(settings.ARCHIVE_DAYS, settings.ARCHIVE_TIME)
    except ValueError as e:
        print(f"[CRON ERROR] Vitals archive worker not started: {e}")
        return

    print(f"[CRON] Vitals archive worker started ({settings.ARCHIVE_DAYS} at {settings.ARCHIVE_TIME}).")
    while True:
        try:
            redis = await get_redis()
            slot = last_slot(datetime.utcnow(), days, at, settings.ARCHIVE_TZ_MINUTES)
            last = await redis.get("archive:last_slot")
            if last is None:
                # First start: wait for the next scheduled time rather than running on deploy.
                await redis.set("archive:last_slot", slot.isoformat())
            elif datetime.fromisoformat(last.decode() if isinstance(last, bytes) else last) < slot:
                # The lock keeps a second scheduler (misconfigured RUN_BACKGROUND_JOBS) from running it too.
                if await redis.set("archive:running", "1", nx=True, ex=6 * 3600):
                    try:
                        # Mark the slot done even if the cycle fails: it resumes cleanly next time,
                        # and a persistent error shouldn't retry every 5 minutes.
                        await redis.set("archive:last_slot", slot.isoformat())
                        print(f"[CRON] Vitals archive: {await run_archive_cycle()}")
                    finally:
                        await redis.delete("archive:running")
        except Exception as e:
            print(f"[CRON ERROR] Exception caught in vitals archive worker: {e}")
        await asyncio.sleep(300)

# 1. Lifespan context for startup/shutdown tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Logic to run when server starts (e.g. verify Redis/DB connection)
    print("Vitalvue Backend starting up...")
    # Heartbeat, baseline and archive jobs must run exactly once. With several API workers (or the separate
    # `scheduler` service, see app/scheduler.py) set RUN_BACKGROUND_JOBS=false here.
    tasks = []
    if settings.RUN_BACKGROUND_JOBS:
        tasks = [asyncio.create_task(heartbeat_cron_worker()), asyncio.create_task(baseline_cron_worker()),
                 asyncio.create_task(archive_cron_worker())]
    yield
    # Shutdown: Logic to run when server stops
    for task in tasks:
        task.cancel()
    # Wait for them to stop so a cancelled cycle releases its DB connection before shutdown.
    await asyncio.gather(*tasks, return_exceptions=True)
    print("Vitalvue Backend shutting down...")

app = FastAPI(
    title="Vitalvue API",
    description="Real-time Healthcare Monitoring System",
    version="1.0.0",
    lifespan=lifespan
)

# 2. CORS Configuration
# Set this to your frontend/mobile origin in production via .env
# Dynamically handle origins from environment or default to local development
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,https://vitalvue.genesysailabs.com"
).split(",")
origins = [origin.strip() for origin in ALLOWED_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # Must be explicit origins (not "*") for credentialed requests
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API error logging (RUN-024) — records every request + tracebacks for forensics (toggle in Redis/env)
from starlette.middleware.base import BaseHTTPMiddleware
from app.middleware.api_logger import api_log_middleware
app.add_middleware(BaseHTTPMiddleware, dispatch=api_log_middleware)

# 3. Include Routers
# We use prefixes to version the API (v1)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(discovery.router, prefix="/api/v1/discovery", tags=["Discovery"])
app.include_router(patients.router, prefix="/api/v1/patients", tags=["Patients"])
app.include_router(vitals.router, prefix="/api/v1/vitals", tags=["Vitals"])
app.include_router(stream.router, prefix="/api/v1/stream", tags=["Stream"])
app.include_router(s3.router, prefix="/api/v1/s3", tags=["S3"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(account.router, prefix="/api/v1/account", tags=["Account"])
app.include_router(devices.router, prefix="/api/v1/devices", tags=["Devices (4G watches)"])
app.include_router(watch_data.router, prefix="/api/v1/devices", tags=["Devices (4G watches)"])
# Broker hooks — internal only (nginx blocks /api/v1/internal/, and a shared secret is required)
app.include_router(internal_emqx.router, prefix="/api/v1/internal/emqx", tags=["Internal"], include_in_schema=False)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "project": "Vitalvue",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
