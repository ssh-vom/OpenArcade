from __future__ import annotations

import logging
import sys
import threading
import time


logger = logging.getLogger("OpenArcade")


class LatestReportMailbox:
    def __init__(self) -> None:
        self._condition = threading.Condition()
        self._latest_report: bytes | None = None
        self._last_published_report: bytes | None = None
        self._version = 0
        self._closed = False

    def publish(self, report: bytes | None) -> None:
        if report is None:
            return

        with self._condition:
            if self._closed:
                return

            report = bytes(report)
            if report == self._last_published_report:
                return

            self._latest_report = report
            self._last_published_report = report
            self._version += 1
            self._condition.notify()

    def wait_for_update(
        self,
        last_seen_version: int,
        timeout: float = 1.0,
    ) -> tuple[int, bytes | None]:
        with self._condition:
            if not self._closed and self._version == last_seen_version:
                self._condition.wait(timeout=timeout)
            return self._version, self._latest_report

    def close(self) -> None:
        with self._condition:
            self._closed = True
            self._condition.notify_all()


class HIDOutputWorker(threading.Thread):
    def __init__(
        self,
        mailbox: LatestReportMailbox,
        stop_event: threading.Event,
    ) -> None:
        super().__init__(name="HIDOutputWorker", daemon=True)
        self._mailbox = mailbox
        self._stop_event = stop_event

    def run(self) -> None:
        logger.info("HID output worker started")

        hid_device_path = "/dev/hidg0"
        use_mock = False
        hid_device = None

        try:
            hid_device = open(hid_device_path, "wb", buffering=0)
            logger.info("Using HID interface %s", hid_device_path)
        except (FileNotFoundError, PermissionError, OSError):
            use_mock = True
            logger.warning(
                "HID interface %s unavailable, using mock output", hid_device_path
            )

        last_seen_version = 0

        try:
            while not self._stop_event.is_set():
                version, report = self._mailbox.wait_for_update(last_seen_version)
                if version == last_seen_version or report is None:
                    continue

                last_seen_version = version

                try:
                    if use_mock:
                        keys = [f"0x{key:02X}" for key in report[2:] if key != 0]
                        output = (
                            f"\r[HID REPORT] Bytes: {report.hex()} | Keys: {keys}   "
                        )
                        sys.stdout.write(output)
                        sys.stdout.flush()
                    else:
                        hid_device.write(report)
                except Exception as exc:
                    logger.error("HID output worker write error: %s", exc)
                    time.sleep(1.0)
        finally:
            if hid_device is not None:
                try:
                    hid_device.close()
                except OSError:
                    pass

            logger.info("HID output worker exiting")
