"""Entry point: `python -m app.gateway`. Run exactly one instance."""
import asyncio
import logging
import signal

from app.database import SessionLocal, get_redis
from app.gateway.server import Gateway

log = logging.getLogger("gateway")


async def run() -> None:
    redis = await get_redis()
    gateway = Gateway(SessionLocal, redis)
    await gateway.start()
    if not gateway.servers:
        raise SystemExit("no TCP watch type is enabled (GATEWAY_*_PORT are all 0)")
    try:
        await asyncio.gather(gateway.command_loop(), gateway.periodic_loop())
    finally:
        await gateway.stop()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s", force=True)
    logging.getLogger("gateway").setLevel(logging.INFO)    # imported app modules lower the root level
    loop = asyncio.new_event_loop()
    task = loop.create_task(run())
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, task.cancel)
    try:
        loop.run_until_complete(task)
    except asyncio.CancelledError:
        log.info("device-gateway stopped")


if __name__ == "__main__":
    main()
