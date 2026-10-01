"""scheduler: runs the heartbeat (device offline), baseline and vitals archive background jobs exactly once.

Start one instance (`python -m app.scheduler`) and set RUN_BACKGROUND_JOBS=false on the API,
so scaling the API to several workers never duplicates these jobs.
"""
import asyncio
import signal

from app.main import archive_cron_worker, baseline_cron_worker, heartbeat_cron_worker


async def run() -> None:
    await asyncio.gather(heartbeat_cron_worker(), baseline_cron_worker(), archive_cron_worker())


def main() -> None:
    loop = asyncio.new_event_loop()
    task = loop.create_task(run())
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, task.cancel)
    try:
        loop.run_until_complete(task)
    except asyncio.CancelledError:
        print("scheduler stopped")


if __name__ == "__main__":
    main()
