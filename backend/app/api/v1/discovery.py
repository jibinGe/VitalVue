from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.organization import Organization, Department, Ward, Room, Station, Bed
from app.models.user import Doctor, Nurse
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.geo import haversine_m
from app.core.comorbidities import COMORBIDITIES

router = APIRouter()

# 1. Get Organizations by Location & Keyword
@router.get("/organizations")
async def get_organizations(
    country: str,
    state: str,
    city: str,
    search: str = Query(None),
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db)
):
    query = select(Organization).where(
        Organization.country == country,
        Organization.state == state,
        Organization.city == city
    )
    if not include_inactive:
        query = query.where(Organization.is_active == True)
    if search:
        query = query.where(Organization.name.ilike(f"%{search}%"))

    result = await db.execute(query)
    return result.scalars().all()

# 2. Get Departments for a specific Org
@router.get("/organizations/{org_id}/departments")
async def get_departments(org_id: int, include_inactive: bool = False, db: AsyncSession = Depends(get_db)):
    q = select(Department).where(Department.organization_id == org_id)
    if not include_inactive:
        q = q.where(Department.is_active == True)
    result = await db.execute(q)
    return result.scalars().all()

# 3. Get Doctors for a specific Org
@router.get("/organizations/{org_id}/doctors")
async def get_doctors(org_id: int, include_inactive: bool = False, db: AsyncSession = Depends(get_db)):
    q = select(Doctor).where(Doctor.organization_id == org_id)
    if not include_inactive:
        q = q.where(Doctor.is_active == True)
    result = await db.execute(q)
    return result.scalars().all()

# 3b. Get Nurses for a specific Org (Manage list — doctors already have a list above)
@router.get("/organizations/{org_id}/nurses")
async def get_nurses(org_id: int, include_inactive: bool = False, db: AsyncSession = Depends(get_db)):
    q = select(Nurse).where(Nurse.organization_id == org_id)
    if not include_inactive:
        q = q.where(Nurse.is_active == True)
    result = await db.execute(q)
    return result.scalars().all()

# 4. Get Wards for a specific Department
@router.get("/departments/{dept_id}/wards")
async def get_wards(dept_id: int, include_inactive: bool = False, db: AsyncSession = Depends(get_db)):
    q = select(Ward).where(Ward.department_id == dept_id)
    if not include_inactive:
        q = q.where(Ward.is_active == True)
    result = await db.execute(q)
    return result.scalars().all()

# 5. Get Rooms for a specific Ward
@router.get("/wards/{ward_id}/rooms")
async def get_rooms(ward_id: int, db: AsyncSession = Depends(get_db)):
    # Only return rooms that are NOT occupied
    result = await db.execute(
        # select(Room).where(Room.ward_id == ward_id, Room.is_occupied == False)
        select(Room).where(Room.ward_id == ward_id)
    )
    return result.scalars().all()

# --- org-hierarchy v2 (RUN-024) ---

@router.get("/organizations/nearby")
async def nearby(lat: float, lon: float, radius_m: float = 200, db: AsyncSession = Depends(get_db)):
    orgs = (await db.execute(
        select(Organization).where(
            Organization.latitude.isnot(None),
            Organization.longitude.isnot(None),
            Organization.is_active == True,
        )
    )).scalars().all()
    nearby_orgs = []
    for o in orgs:
        dist = haversine_m(lat, lon, o.latitude, o.longitude)
        if dist <= radius_m:
            nearby_orgs.append({
                "id": o.id, "name": o.name, "city": o.city,
                "latitude": o.latitude, "longitude": o.longitude, "distance_m": round(dist, 1),
            })
    return sorted(nearby_orgs, key=lambda x: x["distance_m"])

@router.get("/departments/{dept_id}/doctors")
async def doctors_by_dept(dept_id: int, include_inactive: bool = False, db: AsyncSession = Depends(get_db)):
    q = select(Doctor).where(Doctor.department_id == dept_id)
    if not include_inactive:
        q = q.where(Doctor.is_active == True)
    return (await db.execute(q)).scalars().all()

@router.get("/departments/{dept_id}/stations")
async def stations_by_dept(dept_id: int, include_inactive: bool = False, db: AsyncSession = Depends(get_db)):
    q = select(Station).where(Station.department_id == dept_id)
    if not include_inactive:
        q = q.where(Station.is_active == True)
    return (await db.execute(q)).scalars().all()

@router.get("/stations/{station_id}/wards")
async def wards_by_station(station_id: int, include_inactive: bool = False, db: AsyncSession = Depends(get_db)):
    q = select(Ward).where(Ward.station_id == station_id)
    if not include_inactive:
        q = q.where(Ward.is_active == True)
    return (await db.execute(q)).scalars().all()

@router.get("/wards/{ward_id}/beds")
async def beds_by_ward(ward_id: int, include_occupied: bool = False, include_inactive: bool = False, db: AsyncSession = Depends(get_db)):
    q = select(Bed).where(Bed.ward_id == ward_id)
    if not include_occupied:
        q = q.where(Bed.is_occupied == False)
    if not include_inactive:
        q = q.where(Bed.is_active == True)
    return (await db.execute(q)).scalars().all()

@router.get("/comorbidities")
async def comorbidities():
    return COMORBIDITIES
