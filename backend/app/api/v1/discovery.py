from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.organization import Organization, Department, Ward, Room
from app.models.user import Doctor
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

# 1. Get Organizations by Location & Keyword
@router.get("/organizations")
async def get_organizations(
    country: str, 
    state: str, 
    city: str, 
    search: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(Organization).where(
        Organization.country == country,
        Organization.state == state,
        Organization.city == city
    )
    if search:
        query = query.where(Organization.name.ilike(f"%{search}%"))
    
    result = await db.execute(query)
    return result.scalars().all()

# 2. Get Departments for a specific Org
@router.get("/organizations/{org_id}/departments")
async def get_departments(org_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).where(Department.organization_id == org_id))
    return result.scalars().all()

# 3. Get Doctors for a specific Org
@router.get("/organizations/{org_id}/doctors")
async def get_doctors(org_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Doctor).where(Doctor.organization_id == org_id))
    return result.scalars().all()

# 4. Get Wards for a specific Department
@router.get("/departments/{dept_id}/wards")
async def get_wards(dept_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ward).where(Ward.department_id == dept_id))
    return result.scalars().all()

# 5. Get Rooms for a specific Ward
@router.get("/wards/{ward_id}/rooms")
async def get_rooms(ward_id: int, db: AsyncSession = Depends(get_db)):
    # Only return rooms that are NOT occupied
    result = await db.execute(
        select(Room).where(Room.ward_id == ward_id, Room.is_occupied == False)
    )
    return result.scalars().all()
