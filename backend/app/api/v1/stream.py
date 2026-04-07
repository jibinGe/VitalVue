import asyncio
from sse_starlette.sse import EventSourceResponse
from app.database import get_redis
from fastapi import Request, APIRouter, Depends, HTTPException
from sqlalchemy.future import select
from app.models.user import User
from app.api.deps import get_current_user
import json
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import UserRole, Patient

router = APIRouter()

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

                # FIXED: Removed 'ignore_subscribe_defaults=True'
                message = await pubsub.get_message()
                
                if message and message['type'] == 'message':
                    channel = message['channel'].decode()
                    yield {
                        "event": "update" if "stream" in channel else "alert",
                        "data": message['data'].decode()
                    }
                await asyncio.sleep(0.1)
        finally:
            await pubsub.unsubscribe()

    return EventSourceResponse(event_generator())

@router.get("/assigned/stream")
async def stream_assigned_patients(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    redis = await get_redis()
    pubsub = redis.pubsub()

    # 1. Identify which patients are assigned to this user
    query = select(Patient.id)
    if current_user.role == UserRole.NURSE:
        query = query.where(Patient.nurse_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        query = query.where(Patient.doctor_id == current_user.id)
    elif current_user.role in [UserRole.ORG_ADMIN, UserRole.MASTER_ADMIN]:
        query = query.where(Patient.organization_id == current_user.organization_id)
    else:
        raise HTTPException(status_code=403, detail="Role not authorized for streaming")

    result = await db.execute(query)
    assigned_ids = result.scalars().all()

    if not assigned_ids:
        # If no patients are assigned, we still open the stream but it will be quiet
        assigned_ids = []

    # 2. Subscribe to the specific streams for THESE patients
    for p_id in assigned_ids:
        await pubsub.subscribe(f"patient:{p_id}:stream")
        await pubsub.subscribe(f"patient:{p_id}:alerts")

    async def event_generator():
        try:
            # OPTIONAL: Send initial "Welcome" or Snapshot event
            yield {
                "event": "connection_established",
                "data": json.dumps({"monitoring_count": len(assigned_ids)})
            }

            while True:
                if await request.is_disconnected():
                    break

                message = await pubsub.get_message(ignore_subscribe_messages=True)
                
                if message and message['type'] == 'message':
                    channel = message['channel'].decode()
                    # Determine if it's a vital update or a critical alert
                    event_type = "patient_vital_update" if "stream" in channel else "critical_alert"
                    
                    yield {
                        "event": event_type,
                        "data": message['data'].decode()
                    }
                
                # Small sleep to prevent CPU spiking
                await asyncio.sleep(0.1)
                
        finally:
            await pubsub.unsubscribe()
            await pubsub.close()

    return EventSourceResponse(event_generator())

# @router.get("/ward-stream/{ward_id}")
# async def stream_ward_vitals(ward_id: int, request: Request):
#     redis = await get_redis()
#     pubsub = redis.pubsub()
    
#     await pubsub.subscribe(f"ward:{ward_id}:stream")
#     await pubsub.subscribe(f"ward:{ward_id}:alerts")

#     async def event_generator():
#         try:
#             while True:
#                 if await request.is_disconnected():
#                     break

#                 # FIXED: Removed 'ignore_subscribe_defaults=True'
#                 message = await pubsub.get_message()
                
#                 if message and message['type'] == 'message':
#                     channel = message['channel'].decode()
#                     event_type = "ward_vital_update" if "stream" in channel else "ward_alert"
                    
#                     yield {
#                         "event": event_type,
#                         "data": message['data'].decode()
#                     }
#                 await asyncio.sleep(0.1)
#         finally:
#             await pubsub.unsubscribe()

#     return EventSourceResponse(event_generator())