from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import Patient
from app.schemas.user import PatientCreate, PatientUpdate
from app.crud.base import CRUDBase

class CRUDPatient(CRUDBase[Patient, PatientCreate, PatientUpdate]):
    async def get_by_user_id(self, db: AsyncSession, user_id: str):
        result = await db.execute(select(self.model).where(self.model.user_id == user_id))
        return result.scalar_one_or_none()

patient = CRUDPatient(Patient)
