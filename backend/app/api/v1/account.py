"""Public account-deletion request endpoint + staff review list.

Backs the public /delete-account web page (Google Play data-deletion requirement).
Submitting requires no auth; listing/actioning requires a logged-in staff user.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from typing import Optional

from app.database import get_db
from app.models.account_deletion import AccountDeletionRequest
from app.models.user import User, UserRole
from app.api.deps import get_current_user

router = APIRouter()


class DeletionRequestIn(BaseModel):
    identifier: str = Field(..., min_length=1, max_length=128, description="Your login ID (user_id) or email")
    contact_email: Optional[str] = Field(None, max_length=255)
    reason: Optional[str] = Field(None, max_length=2000)


@router.post("/deletion-request", status_code=status.HTTP_201_CREATED)
async def submit_deletion_request(body: DeletionRequestIn, db: AsyncSession = Depends(get_db)):
    """Public: record a request to delete an account + its data. No auth required."""
    identifier = body.identifier.strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="An account identifier is required")

    # Best-effort resolve to an existing user (by user_id, case-insensitive). Not found is fine —
    # we still record the request so staff can follow up.
    matched_user_id = None
    row = (await db.execute(
        select(User.id).where(func.lower(User.user_id) == identifier.lower())
    )).scalar_one_or_none()
    if row is not None:
        matched_user_id = row

    req = AccountDeletionRequest(
        identifier=identifier,
        contact_email=(body.contact_email or "").strip() or None,
        reason=(body.reason or "").strip() or None,
        matched_user_id=matched_user_id,
        status="pending",
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    return {
        "reference_id": f"DEL-{req.id:06d}",
        "status": "pending",
        "message": "Your account deletion request has been received. We will process it within 30 days "
                   "and email you at the address provided once complete.",
    }


@router.get("/deletion-requests")
async def list_deletion_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Staff-only: list deletion requests for review (admins/master admins)."""
    if current_user.role not in (UserRole.ORG_ADMIN, UserRole.MASTER_ADMIN):
        raise HTTPException(status_code=403, detail="Not authorized")
    rows = (await db.execute(
        select(AccountDeletionRequest).order_by(AccountDeletionRequest.created_at.desc())
    )).scalars().all()
    return [
        {
            "reference_id": f"DEL-{r.id:06d}",
            "identifier": r.identifier,
            "contact_email": r.contact_email,
            "reason": r.reason,
            "matched_user_id": r.matched_user_id,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
