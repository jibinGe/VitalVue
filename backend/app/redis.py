import os
from redis import asyncio as aioredis

REDIS_URL = os.getenv("REDIS_URL")

async def get_redis():
    client = aioredis.from_url(REDIS_URL, decode_responses=True)
    try:
        yield client
    finally:
        await client.close()
