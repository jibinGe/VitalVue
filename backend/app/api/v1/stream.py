import asyncio
import json
from sse_starlette.sse import EventSourceResponse
from app.database import get_redis
from fastapi import Request, APIRouter

router = APIRouter()

# --- Single Patient Stream (For Doctors) ---
@router.get("/vitals-stream/{patient_id}")
async def stream_vitals(patient_id: int, request: Request):
    redis = await get_redis()
    pubsub = redis.pubsub()
    
    await pubsub.subscribe(f"patient:{patient_id}:stream")
    await pubsub.subscribe(f"patient:{patient_id}:alerts")

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break

                message = await pubsub.get_message(ignore_subscribe_defaults=True)
                if message:
                    channel = message['channel'].decode()
                    yield {
                        "event": "update" if "stream" in channel else "alert",
                        "data": message['data'].decode()
                    }
                await asyncio.sleep(0.1) 
        finally:
            await pubsub.unsubscribe() # Clean up!

    return EventSourceResponse(event_generator())

# --- Multi-Patient Ward Stream (For Nurses) ---
@router.get("/ward-stream/{ward_id}")
async def stream_ward_vitals(ward_id: int, request: Request):
    redis = await get_redis()
    pubsub = redis.pubsub()
    
    await pubsub.subscribe(f"ward:{ward_id}:stream")
    await pubsub.subscribe(f"ward:{ward_id}:alerts")

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break

                message = await pubsub.get_message(ignore_subscribe_defaults=True)
                if message:
                    channel = message['channel'].decode()
                    # Nurse UI needs to know if it's a generic vital update or an urgent alert
                    event_type = "ward_vital_update" if "stream" in channel else "ward_alert"
                    
                    yield {
                        "event": event_type,
                        "data": message['data'].decode()
                    }
                await asyncio.sleep(0.1)
        finally:
            await pubsub.unsubscribe()

    return EventSourceResponse(event_generator())
