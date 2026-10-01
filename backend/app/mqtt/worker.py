"""mqtt-worker: the single process that receives Veepoo 4G watch traffic.

Run exactly one instance (`python -m app.mqtt.worker`). An MQTT subscription delivers every
message to every subscriber, so running the listener inside the (multi-worker) API would store
each reading several times. To scale out later, set MQTT_SHARED_GROUP so EMQX spreads
messages across workers via a shared subscription.
"""
import asyncio
import json
import logging
import signal
import ssl

import aiomqtt

from app.core.config import settings
from app.database import SessionLocal, get_redis
from app.models.device import Device
from app.mqtt import protocol as p
from app.mqtt.handlers import Handlers
from app.services.monitoring import COMMAND_QUEUE

log = logging.getLogger("mqtt.worker")

SYS_TOPICS = ("$SYS/brokers/+/clients/+/connected", "$SYS/brokers/+/clients/+/disconnected")
RECONNECT_DELAY = 5


def _filter(topic: str) -> str:
    return f"$share/{settings.MQTT_SHARED_GROUP}/{topic}" if settings.MQTT_SHARED_GROUP else topic


async def _command_loop(client: aiomqtt.Client, handlers: Handlers, redis) -> None:
    """Commands queued by the API (e.g. "apply this patient's new schedule")."""
    while True:
        item = await redis.blpop(COMMAND_QUEUE, timeout=5)
        if not item:
            continue
        try:
            cmd = json.loads(item[1])
            async with SessionLocal() as db:
                device = await db.get(Device, cmd.get("device_id"))
                if device is None or device.transport != "mqtt":
                    continue
                if cmd["type"] == "apply_config" and device.is_online:
                    await handlers.apply_config(db, device, force=True)
                elif cmd["type"] == "realtime":
                    await handlers.publish(p.cmd_topic(device.client_id), p.build_realtime(bool(cmd.get("on"))))
                await db.commit()
        except Exception:
            log.exception("command failed: %r", item)


async def _periodic_loop(handlers: Handlers) -> None:
    ticks = 0
    while True:
        await asyncio.sleep(60)
        ticks += 1
        try:
            await handlers.retry_configs()
            if ticks % (24 * 60) == 0:
                await handlers.purge_raw()
        except Exception:
            log.exception("periodic job failed")


async def run() -> None:
    if not settings.MQTT_WORKER_PASS:
        raise SystemExit("MQTT_WORKER_PASS is not set — refusing to start the mqtt-worker")
    redis = await get_redis()
    tls = ssl.create_default_context() if settings.MQTT_TLS else None
    while True:
        try:
            async with aiomqtt.Client(
                hostname=settings.MQTT_HOST, port=settings.MQTT_PORT,
                username=settings.MQTT_WORKER_USER, password=settings.MQTT_WORKER_PASS,
                identifier="vitalvue-mqtt-worker", tls_context=tls, keepalive=30,
            ) as client:
                async def publish(topic: str, payload: bytes) -> None:
                    await client.publish(topic, payload, qos=0)

                handlers = Handlers(SessionLocal, redis, publish)
                await client.subscribe(_filter(p.device_topic_filter()), qos=0)
                for t in SYS_TOPICS:
                    await client.subscribe(t, qos=0)
                log.info("connected to %s:%s, listening on %s", settings.MQTT_HOST, settings.MQTT_PORT,
                         p.device_topic_filter())
                tasks = [asyncio.create_task(_command_loop(client, handlers, redis)),
                         asyncio.create_task(_periodic_loop(handlers))]
                try:
                    async for message in client.messages:
                        try:
                            await handlers.on_message(str(message.topic), bytes(message.payload or b""))
                        except Exception:  # DB outage etc. — log and keep consuming
                            log.exception("message on %s could not be processed", message.topic)
                finally:
                    for t in tasks:
                        t.cancel()
        except aiomqtt.MqttError as e:
            log.warning("broker connection lost (%s); reconnecting in %ss", e, RECONNECT_DELAY)
            await asyncio.sleep(RECONNECT_DELAY)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s", force=True)
    logging.getLogger("mqtt").setLevel(logging.INFO)     # imported app modules lower the root level
    loop = asyncio.new_event_loop()
    task = loop.create_task(run())
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, task.cancel)
    try:
        loop.run_until_complete(task)
    except asyncio.CancelledError:
        log.info("mqtt-worker stopped")


if __name__ == "__main__":
    main()
