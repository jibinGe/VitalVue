"""Which patients a doctor/nurse can see — one rule shared by the patient list, notifications,
the live stream and push routing.

A clinician sees a patient when either:
  * they are the patient's directly assigned doctor/nurse, or
  * they are on the roster (station_doctors / station_nurses) of the nursing station the
    patient's bed (bed → ward → station) or room (room → station) sits under.
"""
from sqlalchemy import or_, select

from app.models.organization import Bed, Room, StationDoctor, StationNurse, Ward
from app.models.user import Patient, UserRole


async def station_ids_for_user(db, user) -> list[int]:
    """Nursing stations whose roster this doctor/nurse is on (empty for any other role)."""
    if user.role == UserRole.DOCTOR:
        stmt = select(StationDoctor.station_id).where(StationDoctor.doctor_id == user.id)
    elif user.role == UserRole.NURSE:
        stmt = select(StationNurse.station_id).where(StationNurse.nurse_id == user.id)
    else:
        return []
    return list((await db.execute(stmt)).scalars().all())


def _in_stations(station_ids):
    """SQL condition: the patient's bed or room sits under one of these stations."""
    return or_(
        Patient.bed_id.in_(
            select(Bed.id).join(Ward, Bed.ward_id == Ward.id).where(Ward.station_id.in_(station_ids))
        ),
        Patient.room_id.in_(select(Room.id).where(Room.station_id.in_(station_ids))),
    )


async def clinician_patient_filter(db, user):
    """WHERE clause limiting a Patient query to what this doctor/nurse can see.
    Returns None for non-clinical roles — callers keep their own admin/other handling."""
    if user.role == UserRole.DOCTOR:
        direct = Patient.doctor_id == user.id
    elif user.role == UserRole.NURSE:
        direct = Patient.nurse_id == user.id
    else:
        return None
    station_ids = await station_ids_for_user(db, user)
    return or_(direct, _in_stations(station_ids)) if station_ids else direct


async def can_view_patient(db, user, patient) -> bool:
    """Same rule as clinician_patient_filter, for a single already-loaded patient."""
    clause = await clinician_patient_filter(db, user)
    if clause is None:
        return True
    stmt = select(Patient.id).where(Patient.id == patient.id, clause)
    return (await db.execute(stmt)).scalar_one_or_none() is not None


async def station_id_for_patient(db, patient):
    """The nursing station the patient's bed or room sits under (None if unplaced/legacy)."""
    if patient.bed_id is not None:
        stmt = select(Ward.station_id).join(Bed, Bed.ward_id == Ward.id).where(Bed.id == patient.bed_id)
        return (await db.execute(stmt)).scalar_one_or_none()
    if patient.room_id is not None:
        return (await db.execute(select(Room.station_id).where(Room.id == patient.room_id))).scalar_one_or_none()
    return None


async def staff_ids_for_patient(db, patient) -> list[int]:
    """User ids of everyone who should get this patient's alerts: the assigned doctor/nurse
    plus the duty doctors and nurses rostered on the patient's nursing station."""
    ids = {sid for sid in (patient.doctor_id, patient.nurse_id) if sid is not None}
    station_id = await station_id_for_patient(db, patient)
    if station_id is not None:
        ids.update((await db.execute(
            select(StationDoctor.doctor_id).where(StationDoctor.station_id == station_id)
        )).scalars().all())
        ids.update((await db.execute(
            select(StationNurse.nurse_id).where(StationNurse.station_id == station_id)
        )).scalars().all())
    return list(ids)
