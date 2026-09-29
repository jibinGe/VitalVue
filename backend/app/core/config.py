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

    # API error logging (RUN-024) — env default; runtime override lives in Redis (see log_config)
    API_LOG_ENABLED: bool = True
    API_LOG_RETENTION_HOURS: int = 48

    MSG91_AUTH_KEY: str
    MSG91_INTEGRATED_NUMBER : str

    # --- Veepoo 4G watches (MQTT). All optional: without them the BLE system runs unchanged. ---
    MQTT_HOST: str = "emqx"                 # broker as seen by the mqtt-worker
    MQTT_PORT: int = 1883                   # internal plain port (Docker network only)
    MQTT_TLS: bool = False
    MQTT_WORKER_USER: str = "vitalvue-worker"
    MQTT_WORKER_PASS: str = ""              # empty = worker login refused
    MQTT_SHARED_GROUP: str = ""             # e.g. "vitalvue" → $share/vitalvue/… when running >1 worker
    MQTT_PUBLIC_HOST: str = ""              # host/port given to watches at provisioning (TLS)
    MQTT_PUBLIC_PORT: int = 8883
    EMQX_HOOK_SECRET: str = ""              # shared secret for /internal/emqx/*; empty = deny all
    MQTT_DEFAULT_TZ_MINUTES: int = 330      # time zone pushed to watches (IST = UTC+5:30)
    MQTT_UPLOAD_GRACE_MIN: int = 5          # 4G patient counts as online for upload interval + grace
    # Heartbeat + baseline background jobs. Set false in the API container when the separate
    # scheduler service runs them, so they never run twice.
    RUN_BACKGROUND_JOBS: bool = True

    # model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_file_encoding='utf-8')
    model_config = SettingsConfigDict(extra="ignore")

settings = Settings()