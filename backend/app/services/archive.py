"""Vitals archiving: discharged patients' raw readings move from `vitals` to `vitals_archive`.

Both tables live in the same database, so every batch is one transaction — rows are never lost
or duplicated. A cycle (run on ARCHIVE_DAYS at ARCHIVE_TIME by the scheduler):
  1. moves back the rows of readmitted patients whose restore did not finish;
  2. moves the rows of patients discharged more than ARCHIVE_AFTER_DAYS ago;
  3. VACUUMs the tables it deleted from, so the freed space is reused by new readings.
Readmit restores a patient's rows straight away (restore_patient_vitals, after the response).

Each batch first locks the patient row and re-checks the discharge state, and readmit locks the
same row, so a readmit can never race an archive batch and lose live readings.

Run by hand:  python -m app.services.archive [--dry-run]
"""
import argparse
import asyncio
from datetime import datetime, time, timedelta

from sqlalchemy import text

from app.core.config import settings
from app.database import SessionLocal, engine

WEEKDAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")

# Lock the patient row and confirm it is still in the state the move expects.
_LOCK_DISCHARGED = text(
    "SELECT 1 FROM patients WHERE id = :pid AND is_discharged AND discharged_at < :cutoff FOR UPDATE")
_LOCK_READMITTED = text("SELECT 1 FROM patients WHERE id = :pid AND NOT is_discharged FOR UPDATE")

_TO_ARCHIVE = text("""
    SELECT p.id FROM patients p
    WHERE p.is_discharged AND p.discharged_at < :cutoff
      AND EXISTS (SELECT 1 FROM vitals v WHERE v.patient_id = p.id)
    ORDER BY p.id""")
_TO_RESTORE = text("""
    SELECT p.id FROM patients p
    WHERE NOT p.is_discharged
      AND EXISTS (SELECT 1 FROM vitals_archive a WHERE a.patient_id = p.id)
    ORDER BY p.id""")
_ARCHIVE_ROWS = text("""
    SELECT count(*) FROM vitals v JOIN patients p ON p.id = v.patient_id
    WHERE p.is_discharged AND p.discharged_at < :cutoff""")
_RESTORE_ROWS = text("""
    SELECT count(*) FROM vitals_archive a JOIN patients p ON p.id = a.patient_id
    WHERE NOT p.is_discharged""")


def parse_schedule(days: str, at: str) -> tuple[frozenset[int], time]:
    """ "mon,thu", "02:00" → ({0, 3}, 02:00). Raises ValueError on a bad value."""
    names = [d.strip().lower()[:3] for d in days.split(",") if d.strip()]
    if not names or any(n not in WEEKDAYS for n in names):
        raise ValueError(f"ARCHIVE_DAYS must be weekdays like 'mon,thu', got {days!r}")
    hour, _, minute = at.strip().partition(":")
    return frozenset(WEEKDAYS.index(n) for n in names), time(int(hour), int(minute or 0))


def last_slot(now_utc: datetime, days: frozenset[int], at: time, tz_minutes: int) -> datetime:
    """The most recent scheduled run at or before now_utc. Naive UTC in and out."""
    offset = timedelta(minutes=tz_minutes)
    local_now = now_utc + offset
    for back in range(8):
        day = (local_now - timedelta(days=back)).date()
        slot = datetime.combine(day, at)
        if day.weekday() in days and slot <= local_now:
            return slot - offset
    raise ValueError("no weekday in schedule")


async def _columns(db, table: str) -> list[str]:
    rows = await db.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema = current_schema() AND table_name = :t ORDER BY ordinal_position"), {"t": table})
    return [r[0] for r in rows]


async def _move_columns(db) -> str:
    """Column list for both directions — every `vitals` column, read from the live schema so a
    column added without updating vitals_archive stops the job instead of losing its data."""
    live = await _columns(db, "vitals")
    archived = set(await _columns(db, "vitals_archive"))
    missing = [c for c in live if c not in archived]
    if missing:
        raise RuntimeError(f"vitals_archive is missing columns {missing}: add them to VitalsArchive "
                           "and migrate before archiving")
    return ", ".join(f'"{c}"' for c in live)


async def _move_patient(db, patient_id: int, lock, lock_params: dict, src: str, dst: str,
                        cols: str, batch: int) -> int:
    """Move one patient's rows src → dst in batches, one transaction each. Stops early if the
    patient's state changes (lock check fails), e.g. readmitted mid-archive."""
    move = text(
        f"WITH moved AS (DELETE FROM {src} WHERE id IN "
        f"(SELECT id FROM {src} WHERE patient_id = :pid LIMIT :n) RETURNING {cols}) "
        f"INSERT INTO {dst} ({cols}) SELECT {cols} FROM moved")
    total = 0
    while True:
        if not (await db.execute(lock, {"pid": patient_id, **lock_params})).first():
            await db.rollback()
            return total
        moved = (await db.execute(move, {"pid": patient_id, "n": batch})).rowcount
        await db.commit()
        total += moved
        if moved < batch:
            return total


async def _vacuum(*tables: str) -> None:
    # VACUUM can't run in a transaction. Plain VACUUM doesn't block reads or writes.
    async with engine.connect() as conn:
        conn = await conn.execution_options(isolation_level="AUTOCOMMIT")
        for table in tables:
            await conn.execute(text(f"VACUUM (ANALYZE) {table}"))


async def restore_patient_vitals(patient_id: int) -> int:
    """Move a readmitted patient's archived rows back to `vitals`. Safe to fire and forget:
    errors are logged and the next archive cycle finishes the restore."""
    try:
        async with SessionLocal() as db:
            cols = await _move_columns(db)
            restored = await _move_patient(db, patient_id, _LOCK_READMITTED, {}, "vitals_archive", "vitals",
                                           cols, settings.ARCHIVE_BATCH_SIZE)
        if restored:
            print(f"[ARCHIVE] restored {restored} readings for readmitted patient {patient_id}")
        return restored
    except Exception as e:
        print(f"[ARCHIVE ERROR] restore for patient {patient_id} failed (next cycle retries): {e}")
        return 0


async def run_archive_cycle(dry_run: bool = False) -> dict:
    cutoff = datetime.utcnow() - timedelta(days=settings.ARCHIVE_AFTER_DAYS)
    batch = settings.ARCHIVE_BATCH_SIZE
    async with SessionLocal() as db:
        cols = await _move_columns(db)
        to_restore = (await db.execute(_TO_RESTORE)).scalars().all()
        to_archive = (await db.execute(_TO_ARCHIVE, {"cutoff": cutoff})).scalars().all()
        if dry_run:
            return {
                "dry_run": True, "cutoff": cutoff.isoformat(),
                "patients_to_archive": len(to_archive),
                "readings_to_archive": await db.scalar(_ARCHIVE_ROWS, {"cutoff": cutoff}),
                "patients_to_restore": len(to_restore),
                "readings_to_restore": await db.scalar(_RESTORE_ROWS),
            }
        await db.rollback()  # end the read transaction before the per-batch ones

        restored = archived = 0
        for pid in to_restore:
            restored += await _move_patient(db, pid, _LOCK_READMITTED, {}, "vitals_archive", "vitals", cols, batch)
        for pid in to_archive:
            archived += await _move_patient(db, pid, _LOCK_DISCHARGED, {"cutoff": cutoff}, "vitals",
                                            "vitals_archive", cols, batch)

    vacuumed = [t for t, n in (("vitals", archived), ("vitals_archive", restored)) if n]
    if vacuumed:
        await _vacuum(*vacuumed)
    return {"patients_archived": len(to_archive), "readings_archived": archived,
            "patients_restored": len(to_restore), "readings_restored": restored}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run one vitals archive cycle now.")
    parser.add_argument("--dry-run", action="store_true", help="only report what would move")
    args = parser.parse_args()
    print(asyncio.run(run_archive_cycle(dry_run=args.dry_run)))


if __name__ == "__main__":
    main()
