from __future__ import annotations

import asyncio
import json
import logging
import os
from collections.abc import Awaitable, Callable
from typing import Any

from runtime_ipc import (
    MESSAGE_TYPE_CONFIG_UPDATED,
    MESSAGE_TYPE_GET_CONNECTED_DEVICES,
    resolve_runtime_socket_path,
)


logger = logging.getLogger("OpenArcade")

ConfigUpdatedHandler = Callable[[], Awaitable[None]]
ConnectedDevicesProvider = Callable[[], set[str]]


class RuntimeControlServer:
    def __init__(
        self,
        on_config_updated: ConfigUpdatedHandler,
        get_connected_devices: ConnectedDevicesProvider,
        socket_path: str | None = None,
    ) -> None:
        self._on_config_updated = on_config_updated
        self._get_connected_devices = get_connected_devices
        self._socket_path = socket_path or resolve_runtime_socket_path()
        self._server: asyncio.AbstractServer | None = None

    async def start(self) -> None:
        directory = os.path.dirname(self._socket_path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        if os.path.exists(self._socket_path):
            os.unlink(self._socket_path)

        self._server = await asyncio.start_unix_server(
            self._handle_client,
            path=self._socket_path,
        )

    async def stop(self) -> None:
        if self._server is not None:
            self._server.close()
            await self._server.wait_closed()
            self._server = None

        if os.path.exists(self._socket_path):
            os.unlink(self._socket_path)

    async def _handle_client(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
    ) -> None:
        try:
            while True:
                raw_message = await reader.readline()
                if not raw_message:
                    break
                response = await self._dispatch(raw_message)
                writer.write(
                    (json.dumps(response, separators=(",", ":")) + "\n").encode("utf-8")
                )
                await writer.drain()
        finally:
            writer.close()
            await writer.wait_closed()

    async def _dispatch(self, raw_message: bytes) -> dict[str, Any]:
        try:
            message = json.loads(raw_message.decode("utf-8"))
        except json.JSONDecodeError:
            return {"ok": False, "error": "invalid_json"}

        message_type = message.get("type")
        if message_type == MESSAGE_TYPE_CONFIG_UPDATED:
            await self._on_config_updated()
            return {"ok": True}

        if message_type == MESSAGE_TYPE_GET_CONNECTED_DEVICES:
            return {
                "ok": True,
                "devices": sorted(self._get_connected_devices()),
            }

        logger.warning("Unknown runtime control message: %s", message_type)
        return {"ok": False, "error": "unknown_message_type"}
