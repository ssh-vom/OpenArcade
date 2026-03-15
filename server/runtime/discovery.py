from __future__ import annotations

import asyncio
from typing import Any

from bleak import BleakScanner


TARGET_DEVICE_NAME = "NimBLE_GATT"


class DiscoveryService:
    def __init__(self, discovered_devices: asyncio.Queue[Any]) -> None:
        self._discovered_devices = discovered_devices
        self._loop: asyncio.AbstractEventLoop | None = None
        self._scanner: BleakScanner | None = None

    async def start(self) -> None:
        self._loop = asyncio.get_running_loop()
        self._scanner = BleakScanner(detection_callback=self._handle_detection)
        await self._scanner.start()

    async def stop(self) -> None:
        if self._scanner is not None:
            await self._scanner.stop()

    def _handle_detection(self, device: Any, advertisement_data: Any) -> None:
        name = device.name or getattr(advertisement_data, "local_name", None)
        if name != TARGET_DEVICE_NAME or self._loop is None:
            return
        self._loop.call_soon_threadsafe(self._discovered_devices.put_nowait, device)
