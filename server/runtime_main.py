from __future__ import annotations

import argparse
import asyncio
import logging
import multiprocessing
import signal
from multiprocessing.queues import Queue

from hid_output_worker import hid_output_worker_process
from runtime import RuntimeApplication


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(processName)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("OpenArcade")


async def run_runtime(
    report_queue: Queue,
    config_path: str | None = None,
) -> None:
    shutdown_signal = asyncio.Event()
    loop = asyncio.get_running_loop()

    for signum in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(signum, shutdown_signal.set)
        except NotImplementedError:
            pass

    app = RuntimeApplication(report_queue=report_queue, config_path=config_path)
    await app.run(shutdown_signal)


def main() -> int:
    parser = argparse.ArgumentParser(description="OpenArcade BLE runtime")
    parser.add_argument(
        "--config",
        help="Path to the persistent config store JSON file",
    )
    args = parser.parse_args()

    logger.info("Initializing OpenArcade runtime")

    report_queue: Queue = multiprocessing.Queue(maxsize=1)
    worker_stop_event = multiprocessing.Event()
    worker = multiprocessing.Process(
        target=hid_output_worker_process,
        args=(report_queue, worker_stop_event),
        name="HIDOutputWorker",
    )
    worker.start()

    return_code = 0

    try:
        asyncio.run(run_runtime(report_queue=report_queue, config_path=args.config))
    except KeyboardInterrupt:
        logger.info("Shutdown signal received")
    except Exception:
        logger.exception("Runtime crashed")
        return_code = 1
    else:
        return_code = 0
    finally:
        worker_stop_event.set()
        worker.join(timeout=5.0)
        if worker.is_alive():
            logger.warning("HID output worker did not exit cleanly, terminating")
            worker.terminate()
        report_queue.close()
        report_queue.join_thread()

    logger.info("System shutdown complete")
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
