import random
import boto3
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta
from jose import jwt
from fastapi.security import OAuth2PasswordRequestForm
from app.database import get_db, get_redis
from app.models.user import User 
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
        sns_client.publish(
            PhoneNumber=user.phone_number,
            Message=f"Vitalvue Login Code: {otp}. Valid for 5 mins.",
            MessageAttributes={
                'AWS.SNS.SMS.SenderID': {'DataType': 'String', 'StringValue': 'Vitalvue'},
                'AWS.SNS.SMS.SMSType': {'DataType': 'String', 'StringValue': 'Transactional'}
            }
        )
    except Exception as e:
        # Logging error here is important
        raise HTTPException(status_code=500, detail="Failed to send SMS")

    return {"message": "OTP sent to your registered mobile number"}


@router.post("/verify-otp")
async def verify_otp(
    response: Response,
    # This allows Swagger to send 'username' and 'password' fields
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db), 
    redis_conn = Depends(get_redis)
):
    """Step 2: Verify OTP and drop the HttpOnly Cookie"""
    
    # Map Swagger fields to your logic:
    # 'username' box in Swagger = user_id
    # 'password' box in Swagger = otp
    user_id = form_data.username
    otp = form_data.password

    # 1. Verify against Redis
    stored_otp = await redis_conn.get(f"otp:{user_id}")
    
    # For easier testing in dev, you can allow a bypass code
    if not stored_otp or stored_otp.decode('utf-8') != otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # 2. Get User for JWT Payload
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 3. Create Token
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {
        "sub": user.user_id, 
        "role": user.role.value,
        "exp": expire
    }
    token = jwt.encode(token_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    # 4. Set HttpOnly Cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False 
    )
    
    await redis_conn.delete(f"otp:{user_id}")

    # Swagger expects 'access_token' and 'token_type' to stay 'logged in' in the UI
    return {
        "access_token": token, 
        "token_type": "bearer",
        "role": user.role, 
        "full_name": user.full_name
    }

