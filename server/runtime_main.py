from __future__ import annotations

import argparse
import asyncio
import logging
import signal
import threading

from hid_output_worker import HIDOutputWorker, LatestReportMailbox
from runtime import RuntimeApplication


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(processName)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("OpenArcade")


async def run_runtime(
    report_mailbox: LatestReportMailbox,
    config_path: str | None = None,
) -> None:
    shutdown_signal = asyncio.Event()
    loop = asyncio.get_running_loop()

    for signum in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(signum, shutdown_signal.set)
        except NotImplementedError:
            pass

    app = RuntimeApplication(report_sink=report_mailbox, config_path=config_path)
    await app.run(shutdown_signal)


def main() -> int:
    parser = argparse.ArgumentParser(description="OpenArcade BLE runtime")
    parser.add_argument(
        "--config",
        help="Path to the persistent config store JSON file",
    )
    args = parser.parse_args()

    logger.info("Initializing OpenArcade runtime")

    report_mailbox = LatestReportMailbox()
    worker_stop_event = threading.Event()
    worker = HIDOutputWorker(report_mailbox, worker_stop_event)
    worker.start()

    return_code = 0

    try:
        asyncio.run(run_runtime(report_mailbox=report_mailbox, config_path=args.config))
    except KeyboardInterrupt:
        logger.info("Shutdown signal received")
    except Exception:
        logger.exception("Runtime crashed")
        return_code = 1
    else:
        return_code = 0
    finally:
        worker_stop_event.set()
        report_mailbox.close()
        worker.join(timeout=5.0)
        if worker.is_alive():
            logger.warning("HID output worker did not exit cleanly")

    logger.info("System shutdown complete")
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
