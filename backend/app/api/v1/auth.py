import random
import boto3
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta
from jose import jwt
from fastapi.security import OAuth2PasswordRequestForm
from app.database import get_db, get_redis
from app.models.user import User , Doctor, Patient, Nurse, OrgAdmin, MasterAdmin
from app.core.config import settings
from app.schemas.auth import OTPRequest, OTPVerify

from app.api.deps import get_current_user

router = APIRouter()

# AWS SNS Client
sns_client = boto3.client(
    "sns",
    aws_access_key_id=settings.CUSTOM_AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.CUSTOM_AWS_SECRET_ACCESS_KEY,
    region_name=settings.CUSTOM_AWS_REGION,
)

@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get currently logged in user profile with role-specific details"""
    
    # 1. Start with the current base response (Do not change)
    response = {
        "id": current_user.id,
        "user_id": current_user.user_id,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "organization_id": current_user.organization_id,
    }

    # 2. Dynamically add sub-table details based on Role
    if isinstance(current_user, Patient):
        response.update({
            "age": current_user.age,
            "gender": current_user.gender,
            "height": current_user.height,
            "weight": current_user.weight,
            "blood_group": current_user.blood_group,
            "alt_phone": current_user.alt_phone,
            "device_id": current_user.device_id,
            "doctor_id": current_user.doctor_id,
            "nurse_id": current_user.nurse_id,
            "room_id": current_user.room_id
        })
    
    elif isinstance(current_user, Doctor):
        response.update({
            "specialization": current_user.specialization,
            "is_on_call": current_user.is_on_call
        })
        
    elif isinstance(current_user, Nurse):
        response.update({
            "license_no": current_user.license_no
        })
        
    elif isinstance(current_user, OrgAdmin):
        response.update({
            "organization_name": current_user.organization_name
        })
        
    elif isinstance(current_user, MasterAdmin):
        response.update({
            "super_level": current_user.super_level
        })

    return response

@router.post("/login-initiate")
async def initiate_login(
    payload: OTPRequest, # Contains user_id (e.g., VT-101)
    db: AsyncSession = Depends(get_db), 
    redis_conn = Depends(get_redis)
):
    """Step 1: Check if User ID exists and send OTP to their registered phone"""
    # Use user_id as the lookup field
    result = await db.execute(select(User).where(User.user_id == payload.user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User ID not recognized")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # Generate 6-digit OTP
    # otp = f"{random.randint(100000, 999999)}"
    otp = "123456"
    
    # Store in Redis for 5 minutes (Keyed by user_id)
    await redis_conn.setex(f"otp:{user.user_id}", 300, otp)

    # Dispatch via SNS using the phone_number from your User table
    try:
        print(otp)
        # sns_client.publish(
        #     PhoneNumber=user.phone_number,
        #     Message=f"Vitalvue Login Code: {otp}. Valid for 5 mins.",
        #     MessageAttributes={
        #         'AWS.SNS.SMS.SenderID': {'DataType': 'String', 'StringValue': 'Vitalvue'},
        #         'AWS.SNS.SMS.SMSType': {'DataType': 'String', 'StringValue': 'Transactional'}
        #     }
        # )
    except Exception as e:
        # Logging error here is important
        raise HTTPException(status_code=500, detail="Failed to send SMS")

    return {"message": "OTP sent to your registered mobile number"}


@router.post("/verify-otp")
async def verify_otp(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db), 
    redis_conn = Depends(get_redis)
):
    """
    Step 2: Verify OTP, generate Dual Tokens (Access + Refresh), 
    and set secure HttpOnly cookies.
    """
    user_id = form_data.username
    otp = form_data.password

    # 1. Verify OTP against Redis
    stored_otp = await redis_conn.get(f"otp:{user_id}")
    
    if not stored_otp or stored_otp.decode('utf-8') != otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    # 2. Get User from Database
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    # 3. Create Access Token (Short-lived)
    access_expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token_payload = {
        "sub": user.user_id, 
        "role": user.role.value, 
        "exp": access_expire, 
        "type": "access"
    }
    access_token = jwt.encode(access_token_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    # 4. Create Refresh Token (Long-lived: 7 Days)
    refresh_expire = datetime.utcnow() + timedelta(days=7)
    refresh_token_payload = {
        "sub": user.user_id, 
        "exp": refresh_expire, 
        "type": "refresh"
    }
    refresh_token = jwt.encode(refresh_token_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    # 5. Store Refresh Token in Redis (Enables revocation)
    # 604800 seconds = 7 days
    await redis_conn.setex(f"refresh_token:{user.user_id}", 604800, refresh_token)
    
    # 6. Cleanup used OTP
    await redis_conn.delete(f"otp:{user_id}")

    # 7. Set HttpOnly Cookies
    # Access Token Cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False  # Set to True in Production with HTTPS
    )
    
    # Refresh Token Cookie (Scoped only to the /refresh endpoint)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60, # 7 days in seconds
        path="/api/v1/auth/refresh", # Security: Browser only sends this to the refresh API
        samesite="lax",
        secure=False  # Set to True in Production with HTTPS
    )

    # Return payload for Swagger/Frontend state management
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role, 
        "full_name": user.full_name,
        "user_id": user.user_id
    }

@router.post("/refresh")
async def refresh_access_token(
    response: Response,
    refresh_token: str = Cookie(None), # Extract from HttpOnly cookie
    db: AsyncSession = Depends(get_db),
    redis_conn = Depends(get_redis)
):
    """Exchange a valid Refresh Token for a new Access Token"""
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    try:
        # 1. Decode and Validate JWT
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        # 2. Check Redis to see if the token was revoked (Security check)
        stored_token = await redis_conn.get(f"refresh_token:{user_id}")
        if not stored_token or stored_token.decode('utf-8') != refresh_token:
            raise HTTPException(status_code=401, detail="Refresh token expired or revoked")

        # 3. Fetch User
        result = await db.execute(select(User).where(User.user_id == user_id))
        user = result.scalars().first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User inactive or not found")

        # 4. Generate New Access Token
        access_expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        new_access_token = jwt.encode(
            {"sub": user.user_id, "role": user.role.value, "exp": access_expire, "type": "access"},
            settings.SECRET_KEY, algorithm=settings.ALGORITHM
        )

        # 5. Drop the new Access Token in a cookie
        response.set_cookie(
            key="access_token",
            value=new_access_token,
            httponly=True,
            samesite="lax"
        )

        return {"access_token": new_access_token, "token_type": "bearer"}

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")