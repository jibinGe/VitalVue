from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import asyncio

from app.api.v1 import auth, discovery, patients, vitals, stream, s3, admin
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

# 1. Lifespan context for startup/shutdown tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Logic to run when server starts (e.g. verify Redis/DB connection)
    print("Vitalvue Backend starting up...")
    cron_task = asyncio.create_task(heartbeat_cron_worker())
    yield
    # Shutdown: Logic to run when server stops
    cron_task.cancel()
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

# 3. Include Routers
# We use prefixes to version the API (v1)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(discovery.router, prefix="/api/v1/discovery", tags=["Discovery"])
app.include_router(patients.router, prefix="/api/v1/patients", tags=["Patients"])
app.include_router(vitals.router, prefix="/api/v1/vitals", tags=["Vitals"])
app.include_router(stream.router, prefix="/api/v1/stream", tags=["Stream"])
app.include_router(s3.router, prefix="/api/v1/s3", tags=["S3"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])

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
