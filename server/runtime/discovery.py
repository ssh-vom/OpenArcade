from __future__ import annotations

import asyncio
import logging
from typing import Any

from bleak import BleakScanner


TARGET_DEVICE_NAME = "NimBLE_GATT"

logger = logging.getLogger("OpenArcade")


class DiscoveryService:
    def __init__(self, discovered_devices: asyncio.Queue[Any]) -> None:
        self._discovered_devices = discovered_devices
        self._loop: asyncio.AbstractEventLoop | None = None
        self._scanner: BleakScanner | None = None

    async def start(self) -> None:
        self._loop = asyncio.get_running_loop()
        try:
            self._scanner = BleakScanner(
                detection_callback=self._handle_detection,
                bluez={"or_patterns": []},
            )
            await self._scanner.start()
            logger.info("BLE scanner started")
        except Exception as exc:
            logger.error("Failed to start BLE scanner: %s", exc)
            raise

    async def stop(self) -> None:
        if self._scanner is not None:
            try:
                await self._scanner.stop()
            except Exception as exc:
                logger.warning("BLE scanner stop error: %s", exc)

    def _handle_detection(self, device: Any, advertisement_data: Any) -> None:
        name = device.name or getattr(advertisement_data, "local_name", None)
        if name != TARGET_DEVICE_NAME or self._loop is None:
            return
        self._loop.call_soon_threadsafe(self._discovered_devices.put_nowait, device)
