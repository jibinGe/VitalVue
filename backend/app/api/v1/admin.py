from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.api.deps import allow_admins
from app.models.organization import Organization, Department, Station, Ward, Bed
from app.models.user import Doctor, Nurse, UserRole
from app.schemas.organization import (
    OrganizationCreate, DepartmentCreate, StationCreate, WardCreate, BedCreate,
)

router = APIRouter()


@router.post("/organizations", status_code=201, dependencies=[Depends(allow_admins)])
async def create_organization(body: OrganizationCreate, db: AsyncSession = Depends(get_db)):
    obj = Organization(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.post("/departments", status_code=201, dependencies=[Depends(allow_admins)])
async def create_department(body: DepartmentCreate, db: AsyncSession = Depends(get_db)):
    obj = Department(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.post("/stations", status_code=201, dependencies=[Depends(allow_admins)])
async def create_station(body: StationCreate, db: AsyncSession = Depends(get_db)):
    obj = Station(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.post("/wards", status_code=201, dependencies=[Depends(allow_admins)])
async def create_ward(body: WardCreate, db: AsyncSession = Depends(get_db)):
    obj = Ward(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.post("/beds", status_code=201, dependencies=[Depends(allow_admins)])
async def create_bed(body: BedCreate, db: AsyncSession = Depends(get_db)):
    obj = Bed(**body.model_dump(), is_occupied=False)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.post("/doctors", status_code=201, dependencies=[Depends(allow_admins)])
async def create_doctor(body: dict, db: AsyncSession = Depends(get_db)):
    # Joined-table inheritance: instantiate Doctor directly → writes users + doctors in one go.
    try:
        doctor = Doctor(
            user_id=body["user_id"],
            full_name=body["full_name"],
            phone_number=body["phone_number"],
            organization_id=body.get("organization_id"),
            role=UserRole.DOCTOR,
            is_active=True,
            department_id=body.get("department_id"),
            specialization=body.get("specialization") or "",
            is_on_call=body.get("is_on_call"),
        )
        db.add(doctor)
        await db.commit()
        await db.refresh(doctor)
        return doctor
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="user_id or phone already exists")


@router.post("/nurses", status_code=201, dependencies=[Depends(allow_admins)])
async def create_nurse(body: dict, db: AsyncSession = Depends(get_db)):
    try:
        nurse = Nurse(
            user_id=body["user_id"],
            full_name=body["full_name"],
            phone_number=body["phone_number"],
            organization_id=body.get("organization_id"),
            role=UserRole.NURSE,
            is_active=True,
            license_no=body["license_no"],
        )
        db.add(nurse)
        await db.commit()
        await db.refresh(nurse)
        return nurse
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="user_id or phone already exists")
