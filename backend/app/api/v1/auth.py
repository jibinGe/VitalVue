from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import  get_db
from app.schemas.user import PatientCreate, PatientResponse
from app.models.user import Patient
from app.crud.user import patient as crud_patient

router = APIRouter()

@router.post("/register/patient", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def register_patient(
    obj_in: PatientCreate, 
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new patient. 
    If you add a field to PatientBase, it automatically works here.
    """
    # 1. Check if user_id or phone already exists
    # (Simplified check - you can expand this in CRUD)
    existing_user = await crud_patient.get_by_user_id(db, user_id=obj_in.user_id)
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="User ID already registered"
        )

    # 2. Use the Generic CRUD to save the patient
    # This automatically maps all fields from PatientCreate to the Patient Model
    new_patient = await crud_patient.create(db, obj_in=obj_in)
    
    return new_patient
