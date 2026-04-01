from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.api.v1 import auth, discovery, patients

# 1. Lifespan context for startup/shutdown tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Logic to run when server starts (e.g. verify Redis/DB connection)
    print("Vitalvue Backend starting up...")
    yield
    # Shutdown: Logic to run when server stops
    print("Vitalvue Backend shutting down...")

app = FastAPI(
    title="Vitalvue API",
    description="Real-time Healthcare Monitoring System",
    version="1.0.0",
    lifespan=lifespan
)

# 2. CORS Configuration
# Set this to your frontend/mobile origin in production via .env
origins = [
    os.getenv("EXPECTED_ORIGIN", "http://localhost:5173"),
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Include Routers
# We use prefixes to version the API (v1)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(discovery.router, prefix="/api/v1/discovery", tags=["Discovery"])
app.include_router(patients.router, prefix="/api/v1/patients", tags=["Patients"])


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
