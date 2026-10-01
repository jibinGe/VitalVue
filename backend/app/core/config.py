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

    # --- TCP watches (Wonlex, CLOC BPW8) via the device-gateway. A port of 0 disables that type. ---
    GATEWAY_WONLEX_PORT: int = 7700
    GATEWAY_BPW8_PORT: int = 7701
    GATEWAY_PUBLIC_HOST: str = ""           # host name given to Wonlex watches (DNS only, not CloudFront)
    GATEWAY_PUBLIC_IP: str = ""             # fixed (Elastic) IP given to BPW8 watches by SMS
    GATEWAY_IDLE_TIMEOUT_S: int = 600       # close a connection that sends nothing for this long
    GATEWAY_FIRST_FRAME_S: int = 30         # a new connection must identify itself within this time
    WONLEX_SIGN_KEY: str = ""               # shared key for the encryptionCode signature
    WONLEX_SIGNATURE: str = "warn"          # off | warn (log mismatches) | enforce (drop them)

    # Readable log of every device message and stored reading (app/devices/event_log.py).
    # Shows vitals per patient ID: turn on for bring-up / debugging, not routine production.
    LOG_DEVICE_EVENTS: bool = False
    LOG_DEVICE_EVENTS_RAW_CHARS: int = 400  # longest raw frame printed in full
    # Heartbeat + baseline background jobs. Set false in the API container when the separate
    # scheduler service runs them, so they never run twice.
    RUN_BACKGROUND_JOBS: bool = True

    # --- Vitals archiving (app.services.archive): discharged patients' raw readings move from
    # `vitals` to `vitals_archive` (same database), and back on readmit. Runs with the jobs above.
    ARCHIVE_ENABLED: bool = True
    ARCHIVE_DAYS: str = "mon,thu"           # weekdays to run, comma-separated (mon..sun)
    ARCHIVE_TIME: str = "02:00"             # time of day to run (HH:MM), in ARCHIVE_TZ_MINUTES
    ARCHIVE_TZ_MINUTES: int = 330           # offset of ARCHIVE_TIME from UTC (IST = UTC+5:30)
    ARCHIVE_AFTER_DAYS: int = 30            # only patients discharged at least this long ago
    ARCHIVE_BATCH_SIZE: int = 20000         # rows moved per transaction

    # model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_file_encoding='utf-8')
    model_config = SettingsConfigDict(extra="ignore")

settings = Settings()