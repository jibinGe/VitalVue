from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
import os
from typing import AsyncGenerator
import redis.asyncio as redis
from app.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL)
DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")

# Connection pool, tunable per environment via .env. Keep
# (DB_POOL_SIZE + DB_MAX_OVERFLOW) × number of backend processes below Postgres max_connections
# (default 100), leaving room for other clients (migrations, admin tools, other deployments).
engine = create_async_engine(
    DATABASE_URL,
    pool_size=int(os.getenv("DB_POOL_SIZE", "20")),        # connections kept open
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),  # extra connections allowed under burst load
    pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),  # seconds to wait for a free connection
    pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),  # replace connections older than 30 min
    pool_pre_ping=True,  # check a connection is alive before use (network drops / DB restarts)
)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

# Add this dependency here
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def get_redis():
    return redis_client
