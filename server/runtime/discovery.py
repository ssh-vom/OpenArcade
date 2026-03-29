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
        self._is_scanning = False

    async def start(self) -> None:
        self._loop = asyncio.get_running_loop()
        try:
            if self._scanner is None:
                self._scanner = BleakScanner(
                    detection_callback=self._handle_detection,
                )
            if self._is_scanning:
                return
            await self._scanner.start()
            self._is_scanning = True
            logger.info("BLE scanner started")
        except Exception as exc:
            logger.error("Failed to start BLE scanner: %s", exc)
            raise

    async def stop(self) -> None:
        if self._scanner is not None and self._is_scanning:
            try:
                await self._scanner.stop()
                self._is_scanning = False
            except Exception as exc:
                logger.warning("BLE scanner stop error: %s", exc)

    async def pause(self) -> None:
        await self.stop()

    async def resume(self) -> None:
        await self.start()

    def _handle_detection(self, device: Any, advertisement_data: Any) -> None:
        name = device.name or getattr(advertisement_data, "local_name", None)
        if name != TARGET_DEVICE_NAME or self._loop is None:
            return
        self._loop.call_soon_threadsafe(self._discovered_devices.put_nowait, device)
