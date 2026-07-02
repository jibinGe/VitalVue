import boto3
from datetime import datetime, timedelta
from app.core.config import settings
from jose import JWTError, jwt
import bcrypt
# Initialize SNS Client
sns_client = boto3.client(
    "sns",
    aws_access_key_id=settings.CUSTOM_AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.CUSTOM_AWS_SECRET_ACCESS_KEY,
    region_name=settings.CUSTOM_AWS_REGION,
)

def send_sms_otp(phone_number: str, otp: str):
    message = f"<Vitalvue> Your verification code is {otp}. Valid for 5 minutes."
    sns_client.publish(
        PhoneNumber=phone_number,
        Message=message,
        MessageAttributes={
            'AWS.SNS.SMS.SenderID': {'DataType': 'String', 'StringValue': 'Vitalvue'},
            'AWS.SNS.SMS.SMSType': {'DataType': 'String', 'StringValue': 'Transactional'}
        }
    )

def verify_password(plain_password, hashed_password):
    # bcrypt directly (passlib 1.7.4 crashes on bcrypt>=4.1's 72-byte detection). Truncate to 72 bytes.
    if not hashed_password:
        return False
    return bcrypt.checkpw(str(plain_password).encode("utf-8")[:72], hashed_password.encode("utf-8"))

def get_password_hash(password):
    return bcrypt.hashpw(str(password).encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")