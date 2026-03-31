from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.schemas.user import PatientCreate
from app.crud.user import patient as crud_patient
from app.models.organization import Room
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.post("/register")
async def register_patient(
    obj_in: PatientCreate, 
    db: AsyncSession = Depends(get_db)
):
    # 1. Verify Room Availability
    room = await db.get(Room, obj_in.room_id)
    if not room or room.is_occupied:
        raise HTTPException(status_code=400, detail="Selected room is unavailable")

    # 2. Create Patient (Uses the generic CRUD we built)
    new_patient = await crud_patient.create(db, obj_in=obj_in)

    # 3. Mark Room as Occupied
    room.is_occupied = True
    await db.commit()

    return new_patient
