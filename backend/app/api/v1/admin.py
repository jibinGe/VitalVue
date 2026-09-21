from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, inspect as sa_inspect
from app.database import get_db
from app.api.deps import allow_admins
from app.models.organization import Organization, Department, Station, Ward, Bed, Room, StationDoctor, StationNurse
from app.models.user import Doctor, Nurse, UserRole
from app.core.security import get_password_hash
from app.schemas.organization import (
    OrganizationCreate, DepartmentCreate, StationCreate, WardCreate, BedCreate, BedBatchCreate, RoomCreate,
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


@router.post("/beds/batch", status_code=201, dependencies=[Depends(allow_admins)])
async def create_beds_batch(body: BedBatchCreate, db: AsyncSession = Depends(get_db)):
    ward = await db.get(Ward, body.ward_id)
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")
    existing_stmt = select(Bed.bed_no).where(Bed.ward_id == body.ward_id)
    existing_beds = set((await db.execute(existing_stmt)).scalars().all())

    created = []
    for num in body.bed_numbers:
        clean_num = str(num).strip()
        if not clean_num or clean_num in existing_beds:
            continue
        bed = Bed(bed_no=clean_num, ward_id=body.ward_id, is_occupied=False, is_active=True)
        db.add(bed)
        created.append(bed)
        existing_beds.add(clean_num)

    if not created:
        raise HTTPException(status_code=400, detail="No new valid beds to create (they may already exist)")

    await db.commit()
    for b in created:
        await db.refresh(b)
    return created


@router.post("/rooms", status_code=201, dependencies=[Depends(allow_admins)])
async def create_room(body: RoomCreate, db: AsyncSession = Depends(get_db)):
    """Create a dept-level room (department_id) or ward-level room (ward_id).
    Exactly one parent must be provided — enforced by the RoomCreate schema validator.
    """
    obj = Room(**body.model_dump(), is_occupied=False)
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
            doctor_type=body.get("doctor_type"),
            hashed_password=get_password_hash(body["password"]) if body.get("password") else None,
        )
        db.add(doctor)
        await db.commit()
        await db.refresh(doctor)
        return _row(doctor)
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
            nurse_type=body.get("nurse_type"),
            hashed_password=get_password_hash(body["password"]) if body.get("password") else None,
        )
        db.add(nurse)
        await db.commit()
        await db.refresh(nurse)
        return _row(nurse)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="user_id or phone already exists")


# --- Soft-disable / enable (org-hierarchy v2) ---
from pydantic import BaseModel


class StatusIn(BaseModel):
    is_active: bool


# entity path-segment -> model. Staff use users.is_active (inherited by Doctor/Nurse).
_STATUS_ENTITIES = {
    "organizations": Organization,
    "departments": Department,
    "stations": Station,
    "wards": Ward,
    "beds": Bed,
    "rooms": Room,
    "doctors": Doctor,
    "nurses": Nurse,
}


@router.patch("/{entity}/{obj_id}/status", dependencies=[Depends(allow_admins)])
async def set_status(entity: str, obj_id: int, body: StatusIn, db: AsyncSession = Depends(get_db)):
    """Soft-disable (is_active=False) or re-enable (True) any org-hierarchy entity or staff member.
    Disabled rows stay in the DB (FK history intact) but are hidden from active pickers."""
    model = _STATUS_ENTITIES.get(entity)
    if model is None:
        raise HTTPException(status_code=404, detail="Unknown entity")
    obj = await db.get(model, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{entity[:-1]} not found")
    # Safety: never disable a bed that still has a patient in it.
    if entity == "beds" and not body.is_active and getattr(obj, "is_occupied", False):
        raise HTTPException(status_code=409, detail="Bed is occupied — discharge the patient before disabling")
    obj.is_active = body.is_active
    await db.commit()
    await db.refresh(obj)
    return {"id": obj_id, "entity": entity, "is_active": obj.is_active}


# --- Generic admin CRUD: list + detail + update (edit). "Delete" = /status disable above. ---
# Reuses the same entity map as /status. Editable fields per entity (name + details).
_ENTITIES = _STATUS_ENTITIES

_EDITABLE = {
    "organizations": {"name", "country", "state", "city", "latitude", "longitude"},
    "departments":   {"name", "organization_id"},
    "stations":      {"name", "station_no", "department_id"},
    "wards":         {"name", "ward_no", "department_id", "station_id"},
    "beds":          {"bed_no", "ward_id"},
    "rooms":         {"room_number", "ward_id", "department_id", "is_occupied"},
    "doctors":       {"full_name", "phone_number", "specialization", "is_on_call", "department_id", "organization_id", "doctor_type"},
    "nurses":        {"full_name", "phone_number", "license_no", "organization_id", "nurse_type"},
}

# Optional parent filters accepted on list (applied only if the model has the column).
_FILTER_COLS = ("organization_id", "department_id", "station_id", "ward_id")


_SENSITIVE_COLS = {"hashed_password"}


def _row(obj) -> dict:
    """Serialize an ORM row to scalar columns only (avoids async lazy-load on relationships).
    Never emit sensitive columns (e.g. a doctor/nurse PIN hash via joined-table inheritance)."""
    return {c.key: getattr(obj, c.key) for c in sa_inspect(obj).mapper.column_attrs
            if c.key not in _SENSITIVE_COLS}


@router.get("/{entity}", dependencies=[Depends(allow_admins)])
async def list_entity(
    entity: str,
    include_inactive: bool = Query(False),
    organization_id: int | None = None,
    department_id: int | None = None,
    station_id: int | None = None,
    ward_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all rows of an entity (admin view — shows inactive when include_inactive=true).
    Optional parent filters (organization_id/department_id/station_id/ward_id) apply where the column exists."""
    model = _ENTITIES.get(entity)
    if model is None:
        raise HTTPException(status_code=404, detail="Unknown entity")
    stmt = select(model)
    cols = {c.key for c in sa_inspect(model).mapper.column_attrs}
    if not include_inactive and "is_active" in cols:
        stmt = stmt.where(model.is_active == True)  # noqa: E712
    for name, val in (("organization_id", organization_id), ("department_id", department_id),
                      ("station_id", station_id), ("ward_id", ward_id)):
        if val is not None and name in cols:
            stmt = stmt.where(getattr(model, name) == val)
    rows = (await db.execute(stmt)).scalars().all()
    return [_row(r) for r in rows]


@router.get("/{entity}/{obj_id}", dependencies=[Depends(allow_admins)])
async def get_entity(entity: str, obj_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch one entity by id (all scalar fields)."""
    model = _ENTITIES.get(entity)
    if model is None:
        raise HTTPException(status_code=404, detail="Unknown entity")
    obj = await db.get(model, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{entity[:-1]} not found")
    return _row(obj)


@router.patch("/{entity}/{obj_id}", dependencies=[Depends(allow_admins)])
async def update_entity(entity: str, obj_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    """Edit an entity's name/details. Partial — only provided, editable fields are applied.
    Staff name is `full_name`. Unknown/non-editable keys are ignored. is_active is NOT editable here
    (use /{entity}/{id}/status). Deletion is soft-disable via /status, never a hard delete."""
    model = _ENTITIES.get(entity)
    if model is None:
        raise HTTPException(status_code=404, detail="Unknown entity")
    obj = await db.get(model, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{entity[:-1]} not found")
    allowed = _EDITABLE.get(entity, set())
    applied = {k: v for k, v in (body or {}).items() if k in allowed}
    if not applied:
        raise HTTPException(status_code=422, detail=f"No editable fields for {entity}. Allowed: {sorted(allowed)}")
    columns = sa_inspect(model).columns
    for k, v in applied.items():
        # HTML <select>/<input> values always arrive as strings. asyncpg is strict about
        # bind types (unlike psycopg2, it won't cast "4" -> int), so coerce to the column's
        # actual Python type. An empty string (a cleared dropdown) means NULL for non-string columns.
        if isinstance(v, str) and k in columns and columns[k].type.python_type is not str:
            py_type = columns[k].type.python_type
            if v == "":
                v = None
            elif py_type is bool:
                v = v.lower() in ("true", "1", "yes")
            else:
                try:
                    v = py_type(v)
                except (TypeError, ValueError):
                    raise HTTPException(status_code=422, detail=f"Invalid value for {k}: {v!r}")
        setattr(obj, k, v)
    try:
        await db.commit()
        await db.refresh(obj)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="constraint violation (duplicate or bad FK)")
    return _row(obj)


# --- Station staff rosters (many-to-many: a doctor/nurse may cover several stations) ---

async def _get_station_or_404(station_id: int, db: AsyncSession) -> Station:
    station = await db.get(Station, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Nursing station not found")
    return station


@router.get("/stations/{station_id}/doctors", dependencies=[Depends(allow_admins)])
async def list_station_doctors(station_id: int, db: AsyncSession = Depends(get_db)):
    await _get_station_or_404(station_id, db)
    stmt = select(Doctor).join(StationDoctor, StationDoctor.doctor_id == Doctor.id).where(
        StationDoctor.station_id == station_id
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_row(r) for r in rows]


@router.post("/stations/{station_id}/doctors", status_code=201, dependencies=[Depends(allow_admins)])
async def assign_station_doctor(station_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    await _get_station_or_404(station_id, db)
    doctor_id = body.get("doctor_id")
    if not doctor_id:
        raise HTTPException(status_code=422, detail="doctor_id is required")
    if not await db.get(Doctor, doctor_id):
        raise HTTPException(status_code=404, detail="Doctor not found")
    db.add(StationDoctor(station_id=station_id, doctor_id=doctor_id))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Doctor is already assigned to this station")
    return {"station_id": station_id, "doctor_id": doctor_id}


@router.delete("/stations/{station_id}/doctors/{doctor_id}", dependencies=[Depends(allow_admins)])
async def unassign_station_doctor(station_id: int, doctor_id: int, db: AsyncSession = Depends(get_db)):
    link = await db.get(StationDoctor, {"station_id": station_id, "doctor_id": doctor_id})
    if not link:
        raise HTTPException(status_code=404, detail="Doctor is not assigned to this station")
    await db.delete(link)
    await db.commit()
    return {"success": True}


@router.get("/stations/{station_id}/nurses", dependencies=[Depends(allow_admins)])
async def list_station_nurses(station_id: int, db: AsyncSession = Depends(get_db)):
    await _get_station_or_404(station_id, db)
    stmt = select(Nurse).join(StationNurse, StationNurse.nurse_id == Nurse.id).where(
        StationNurse.station_id == station_id
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_row(r) for r in rows]


@router.post("/stations/{station_id}/nurses", status_code=201, dependencies=[Depends(allow_admins)])
async def assign_station_nurse(station_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    await _get_station_or_404(station_id, db)
    nurse_id = body.get("nurse_id")
    if not nurse_id:
        raise HTTPException(status_code=422, detail="nurse_id is required")
    if not await db.get(Nurse, nurse_id):
        raise HTTPException(status_code=404, detail="Nurse not found")
    db.add(StationNurse(station_id=station_id, nurse_id=nurse_id))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Nurse is already assigned to this station")
    return {"station_id": station_id, "nurse_id": nurse_id}


@router.delete("/stations/{station_id}/nurses/{nurse_id}", dependencies=[Depends(allow_admins)])
async def unassign_station_nurse(station_id: int, nurse_id: int, db: AsyncSession = Depends(get_db)):
    link = await db.get(StationNurse, {"station_id": station_id, "nurse_id": nurse_id})
    if not link:
        raise HTTPException(status_code=404, detail="Nurse is not assigned to this station")
    await db.delete(link)
    await db.commit()
    return {"success": True}


# --- API logging toggle (RUN-024) ---
from app.core.log_config import logging_enabled, set_logging

@router.post("/logging/on", dependencies=[Depends(allow_admins)])
async def logging_on():
    await set_logging(True)
    return {"enabled": True}

@router.post("/logging/off", dependencies=[Depends(allow_admins)])
async def logging_off():
    await set_logging(False)
    return {"enabled": False}

@router.get("/logging/status", dependencies=[Depends(allow_admins)])
async def logging_status():
    return {"enabled": await logging_enabled()}
