import random
import boto3
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import jwt
from datetime import datetime, timedelta

from app.database import get_db, get_redis
from app.models.user import User  # Ensure this model exists!
from app.core.config import settings
from app.schemas.auth import OTPRequest, OTPVerify

router = APIRouter()

# AWS SNS Client
sns_client = boto3.client(
    "sns",
    aws_access_key_id=settings.CUSTOM_AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.CUSTOM_AWS_SECRET_ACCESS_KEY,
    region_name=settings.CUSTOM_AWS_REGION,
)

@router.post("/generate-otp")
async def generate_otp(payload: OTPRequest, db: AsyncSession = Depends(get_db), redis_conn = Depends(get_redis)):
    # Find user by user_id
    result = await db.execute(select(User).where(User.user_id == payload.user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User ID not recognized")

    # Create 6-digit OTP
    otp = f"{random.randint(100000, 999999)}"
    
    # Store in Redis for 5 minutes
    await redis_conn.setex(f"otp:{user.user_id}", 300, otp)

    # Dispatch via SNS
    try:
        sns_client.publish(
            PhoneNumber=user.phone_number,
            Message=f"Vitalvue Login Code: {otp}. Valid for 5 mins.",
            MessageAttributes={
                'AWS.SNS.SMS.SMSType': {'DataType': 'String', 'StringValue': 'Transactional'}
            }
        )
    except Exception as e:
        print(f"SNS Error: {e}")
        raise HTTPException(status_code=500, detail="SMS service unavailable")

    return {"message": "OTP sent"}

@router.post("/verify-otp")
async def verify_otp(payload: OTPVerify, db: AsyncSession = Depends(get_db), redis_conn = Depends(get_redis)):
    # Check Redis
    stored_otp = await redis_conn.get(f"otp:{payload.user_id}")
    
    if not stored_otp or stored_otp.decode('utf-8') != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid/Expired OTP")

    # Get User Data for Token
    result = await db.execute(select(User).where(User.user_id == payload.user_id))
    user = result.scalars().first()

    # Issue JWT
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {"sub": user.user_id, "role": user.role, "exp": expire}
    encoded_jwt = jwt.encode(token_data, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    
    await redis_conn.delete(f"otp:{payload.user_id}")

    return {"access_token": encoded_jwt, "token_type": "bearer"}