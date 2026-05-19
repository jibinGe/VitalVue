import random
import boto3
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta
from jose import jwt
from fastapi.security import OAuth2PasswordRequestForm
from app.database import get_db, get_redis
from app.models.user import User , Doctor, Patient, Nurse, OrgAdmin, MasterAdmin, UserRole
from app.core.config import settings
from app.schemas.auth import OTPRequest, OTPVerify
from sqlalchemy import func # Import func for lower()
from app.api.deps import get_current_user
from app.models.organization import Room, Ward, Department
from sqlalchemy.orm import joinedload

router = APIRouter()

# AWS SNS Client
sns_client = boto3.client(
    "sns",
    aws_access_key_id=settings.CUSTOM_AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.CUSTOM_AWS_SECRET_ACCESS_KEY,
    region_name=settings.CUSTOM_AWS_REGION,
)

@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get currently logged in user profile with role-specific details"""
    
    # 1. Start with the base response (Common to all roles)
    response = {
        "id": current_user.id,
        "user_id": current_user.user_id,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "organization_id": current_user.organization_id,
        "phone_number": current_user.phone_number
    }

    # 2. Handle Patient-Specific Details (Resolving Doctor and Location names)
    if current_user.role == UserRole.PATIENT:
        # Re-fetch with relationships
        # Ensure 'room' matches the relationship name in your Patient model
        stmt = (
            select(Patient)
            .options(
                joinedload(Patient.assigned_doctor),
                joinedload(Patient.room).joinedload(Room.ward).joinedload(Ward.department)
            )
            .where(Patient.id == current_user.id)
        )
        result = await db.execute(stmt)
        patient_full = result.scalars().first()

        if not patient_full:
            raise HTTPException(status_code=404, detail="Patient profile not found")

        response.update({
            "age": patient_full.age,
            "gender": patient_full.gender,
            "height": patient_full.height,
            "weight": patient_full.weight,
            "blood_group": patient_full.blood_group,
            "alt_phone": patient_full.alt_phone,
            "device_id": patient_full.device_id,
            "nurse_id": patient_full.nurse_id,
            
            # Resolved Names
            "doctor_name": patient_full.assigned_doctor.full_name if patient_full.assigned_doctor else None,
            "room_number": patient_full.room.room_number if patient_full.room else None,
            "ward_name": patient_full.room.ward.name if (patient_full.room and patient_full.room.ward) else None,
            "department_name": patient_full.room.ward.department.name if (patient_full.room and patient_full.room.ward and patient_full.room.ward.department) else None
        })
        
    # 3. Handle Doctor-Specific Details
    elif current_user.role == UserRole.DOCTOR:
        # Cast to Doctor to access specialization
        doctor = await db.get(Doctor, current_user.id)
        response.update({
            "specialization": doctor.specialization if doctor else None,
            "is_on_call": doctor.is_on_call if doctor else False
        })
        
    # 4. Handle Nurse-Specific Details
    elif current_user.role == UserRole.NURSE:
        nurse = await db.get(Nurse, current_user.id)
        response.update({
            "license_no": nurse.license_no if nurse else None
        })
        
    # 5. Handle Admin-Specific Details
    elif current_user.role == UserRole.ORG_ADMIN:
        admin = await db.get(OrgAdmin, current_user.id)
        response.update({
            "organization_name": admin.organization_name if admin else None
        })
        
    elif current_user.role == UserRole.MASTER_ADMIN:
        m_admin = await db.get(MasterAdmin, current_user.id)
        response.update({
            "super_level": m_admin.super_level if m_admin else None
        })

    return response

@router.post("/login-initiate")
async def initiate_login(
    payload: OTPRequest, 
    db: AsyncSession = Depends(get_db), 
    redis_conn = Depends(get_redis)
):
    """Step 1: Case-insensitive User ID check and OTP dispatch"""
    
    # --- MODIFICATION: Case-Insensitive Lookup ---
    # We lower() the database column and the incoming payload ID
    result = await db.execute(
        select(User).where(func.lower(User.user_id) == func.lower(payload.user_id))
    )
    # ----------------------------------------------
    
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User ID not recognized")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # Generate 6-digit OTP (Keeping your static 123456 for now)
    otp = "123456"
    
    # Store in Redis (Always use the canonical user_id from the DB as the key)
    await redis_conn.setex(f"otp:{user.user_id}", 300, otp)

    try:
        # Re-enabling the SNS publish call as requested
        sns_client.publish(
            PhoneNumber=user.phone_number,
            Message=f"Vitalvue Login Code: {otp}. Valid for 5 mins.",
            MessageAttributes={
                'AWS.SNS.SMS.SenderID': {'DataType': 'String', 'StringValue': 'Vitalvue'},
                'AWS.SNS.SMS.SMSType': {'DataType': 'String', 'StringValue': 'Transactional'}
            }
        )
    except Exception as e:
        print(f"SNS Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send SMS")

    return {"message": "OTP sent to your registered mobile number"}


@router.post("/verify-otp")
async def verify_otp(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db), 
    redis_conn = Depends(get_redis)
):
    input_id = form_data.username
    otp = form_data.password

    # STEP A: Find the real User object first
    result = await db.execute(
        select(User).where(func.lower(User.user_id) == func.lower(input_id))
    )
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # STEP B: Use the DATABASE ID (user.user_id) to check Redis
    # If user typed 'vt-101' but DB has 'VT-101', this looks for 'otp:VT-101'
    stored_otp = await redis_conn.get(f"otp:{user.user_id}")
    
    if not stored_otp:
        # This triggers if 5 mins passed or key name is wrong
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    if stored_otp.decode('utf-8') != otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # 3. Create Access Token (Short-lived)
    access_expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = jwt.encode(
        {"sub": user.user_id, "role": user.role.value, "exp": access_expire, "type": "access"}, 
        settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    
    # 4. Create Refresh Token (Long-lived)
    refresh_expire = datetime.utcnow() + timedelta(days=7)
    refresh_token = jwt.encode(
        {"sub": user.user_id, "exp": refresh_expire, "type": "refresh"}, 
        settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )

    # 5. Store Refresh Token in Redis & Cleanup OTP
    await redis_conn.setex(f"refresh_token:{user.user_id}", 604800, refresh_token)
    await redis_conn.delete(f"otp:{user.user_id}")

    # 6. Set HttpOnly Cookies
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=604800,
        path="/api/v1/auth/refresh",
        samesite="lax",
        secure=False
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=604800,
        path="/",  # <-- Change this from "/api/v1/auth/refresh" to "/"
        samesite="lax",
        secure=False 
    )

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
        if not stored_token:
            raise HTTPException(status_code=401, detail="Refresh token session has expired")
        if stored_token.decode('utf-8') != refresh_token:
            raise HTTPException(status_code=401, detail="Refresh token has been revoked")
        
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
            path="/",  # <-- Explicitly set to root
            samesite="lax"
        )

        return {"access_token": new_access_token, "token_type": "bearer"}

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    

