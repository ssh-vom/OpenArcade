from __future__ import annotations

import asyncio
import struct
from collections.abc import Callable
from typing import Any

from bleak import BleakClient

from constants import CHAR_UUID


StateUpdateCallback = Callable[[str, int], None]


class DeviceSession:
    def __init__(
        self,
        device: Any,
        stop_event: asyncio.Event,
        on_state_update: StateUpdateCallback,
        connect_timeout: float = 30.0,
    ) -> None:
        self.device = device
        self.address = str(device.address)
        self._stop_event = stop_event
        self._on_state_update = on_state_update
        self._connect_timeout = connect_timeout
        self._client: BleakClient | None = None
        self._disconnect_event = asyncio.Event()
        self._loop: asyncio.AbstractEventLoop | None = None

    @property
    def is_connected(self) -> bool:
        return bool(self._client and self._client.is_connected)

    async def connect(self) -> None:
        self._loop = asyncio.get_running_loop()
        self._disconnect_event.clear()
        self._client = BleakClient(
            self.device,
            disconnected_callback=self._handle_disconnect,
            timeout=self._connect_timeout,
        )
        await self._client.connect()
        await asyncio.wait_for(
            self._client.start_notify(CHAR_UUID, self._handle_notification),
            timeout=10.0,
        )

    async def wait_closed(self) -> None:
        stop_task = asyncio.create_task(self._stop_event.wait())
        disconnect_task = asyncio.create_task(self._disconnect_event.wait())
        done, pending = await asyncio.wait(
            {stop_task, disconnect_task},
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)
        for task in done:
            task.result()

    async def disconnect(self) -> None:
        if self._client is None:
            return
        if self._client.is_connected:
            await self._client.disconnect()

    def _handle_disconnect(self, _client: BleakClient) -> None:
        if self._loop is not None:
            self._loop.call_soon_threadsafe(self._disconnect_event.set)

    def _handle_notification(self, _sender: Any, data: bytearray) -> None:
        if len(data) < 4:
            return
        state = struct.unpack("<I", data[:4])[0]
        self._on_state_update(self.address, state)
