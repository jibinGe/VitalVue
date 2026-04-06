import boto3
from datetime import datetime, timedelta
from app.core.config import settings
from jose import JWTError, jwt
from passlib.context import CryptContext
# Initialize SNS Client
sns_client = boto3.client(
    "sns",
    aws_access_key_id=settings.CUSTOM_AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.CUSTOM_AWS_SECRET_ACCESS_KEY,
    region_name=settings.CUSTOM_AWS_REGION,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")