from fastapi import Request, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List

from app.database import get_db
from app.models.user import User, UserRole
from app.core.config import settings

# tokenUrl points to your verification endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/verify-otp", auto_error=False)

async def get_current_user(
    request: Request, 
    db: AsyncSession = Depends(get_db),
    token_from_header: Optional[str] = Depends(oauth2_scheme)
):
    # 1. Try to get token from Query Parameters (For SSE)
    token = request.query_params.get("token")

    # 2. Try to get token from Cookie (Primary for your Frontend/SSE if using cookies)
    if not token:
        token = request.cookies.get("access_token")
    
    # 3. Fallback to Header (Primary for Swagger UI and Band Simulator)
    if not token:
        token = token_from_header

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Not authenticated"
        )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        # user.role is your Enum from the User model
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {user.role} is not authorized to perform this action"
            )
        return user

# Define common gatekeepers for easier use
allow_admins = RoleChecker([UserRole.ORG_ADMIN, UserRole.MASTER_ADMIN])
allow_clinical_staff = RoleChecker([UserRole.NURSE, UserRole.DOCTOR, UserRole.MASTER_ADMIN])