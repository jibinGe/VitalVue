import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv(interpolate=True)

class Settings(BaseSettings):
    # DB & Redis
    DATABASE_URL: str
    REDIS_URL: str
    
    # Security
    JWT_SECRET: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 Day
    SECRET_KEY: str
    
    # AWS SNS
    CUSTOM_AWS_ACCESS_KEY_ID: str
    CUSTOM_AWS_SECRET_ACCESS_KEY: str
    CUSTOM_AWS_REGION: str

    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str

    # Twilio
    TWILIO_ACCOUNT_SID: str 
    TWILIO_AUTH_TOKEN: str
    TWILIO_WHATSAPP_NUMBER: str
    
    # model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_file_encoding='utf-8')
    model_config = SettingsConfigDict(extra="ignore")

settings = Settings()