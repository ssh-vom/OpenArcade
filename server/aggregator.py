from __future__ import annotations

import asyncio
import logging
import os
import struct
import time
from typing import Any

from bleak import BleakClient, BleakScanner

from constants import CHAR_UUID, SCANNER_DELAY
from device_config_store import DeviceConfigStore
from runtime.control_server import RuntimeControlServer
from runtime.report_builder import build_mapping_cache, build_keyboard_report
from runtime.state_reducer import StateReducer


logger = logging.getLogger("OpenArcade")
TARGET_DEVICE_NAME = "NimBLE_GATT"


def aggregator_process(
    hid_queue,
    stop_event,
    config_path: str | None = None,
):
    """
    Dedicated BLE transport process.

    Owns discovery, BLE connections, input aggregation, and the runtime control
    socket so the hot path stays isolated from the rest of the system.
    """

    logger.info("Aggregator Process Started")

    connected_clients: dict[str, BleakClient] = {}
    connecting_addresses: set[str] = set()
    discovered_devices: dict[str, Any] = {}
    pending_connects: set[str] = set()
    retry_after: dict[str, float] = {}
    device_states: dict[str, int] = {}
    live_states: dict[str, dict[str, Any]] = {}
    state_sequence = 0
    last_report: bytes | None = None

    config_store = DeviceConfigStore(path=config_path)
    reducer = StateReducer(build_mapping_cache(config_store.load()))
    config_mtime: float | None = None

    def publish_report(report: bytes | None) -> None:
        nonlocal last_report

        if report is None or report == last_report:
            return

        last_report = report
        hid_queue.put(report)

    def refresh_mapping_cache(force: bool = False) -> None:
        nonlocal config_mtime

        try:
            mtime = os.path.getmtime(config_store.path)
        except OSError:
            mtime = None

        if not force and mtime == config_mtime:
            return

        config_mtime = mtime
        snapshot = config_store.load()
        report = reducer.set_mapping_cache(build_mapping_cache(snapshot))
        publish_report(report)

    async def handle_config_updated() -> None:
        refresh_mapping_cache(force=True)

    def get_connected_devices() -> set[str]:
        return set(connected_clients)

    def get_device_states() -> dict[str, dict[str, Any]]:
        return {device_id: dict(state) for device_id, state in live_states.items()}

    control_server = RuntimeControlServer(
        on_config_updated=handle_config_updated,
        get_connected_devices=get_connected_devices,
        get_device_states=get_device_states,
    )

    def update_live_state(address: str, state: int) -> None:
        nonlocal state_sequence
        state_sequence += 1
        live_states[address] = {
            "state": state,
            "seq": state_sequence,
            "updated_at": time.time(),
        }

    def clear_live_state(address: str) -> None:
        live_states.pop(address, None)

    def make_notification_handler(address: str):
        def handler(_sender: Any, data: bytearray) -> None:
            if len(data) < 4:
                return

            state = struct.unpack("<I", data[:4])[0]
            if device_states.get(address) == state:
                return

            device_states[address] = state
            update_live_state(address, state)
            publish_report(reducer.update_device_state(address, state))

        return handler

    def detection_callback(device: Any, advertisement_data: Any) -> None:
        name = device.name or getattr(advertisement_data, "local_name", None)
        if name != TARGET_DEVICE_NAME:
            return

        address = str(device.address)
        discovered_devices[address] = device

        if address in connected_clients or address in connecting_addresses:
            return
        if time.monotonic() < retry_after.get(address, 0.0):
            return
        if address in pending_connects:
            return

        pending_connects.add(address)
        logger.info("Discovered Target Device: %s (%s)", address, name)

    async def connect_device(address: str, scanner: BleakScanner, connect_lock: asyncio.Lock) -> None:
        if address in connected_clients:
            connecting_addresses.discard(address)
            return

        device = discovered_devices.get(address)
        if device is None:
            logger.warning("Skipping connect for %s: device is no longer cached", address)
            connecting_addresses.discard(address)
            return

        async with connect_lock:
            logger.info("Connecting to %s...", address)
            await scanner.stop()

            def on_disconnect(client: BleakClient) -> None:
                disconnected_address = str(client.address)
                logger.warning("Disconnected: %s", disconnected_address)
                connected_clients.pop(disconnected_address, None)
                device_states.pop(disconnected_address, None)
                clear_live_state(disconnected_address)
                publish_report(reducer.remove_device_state(disconnected_address))
                config_store.upsert_device(disconnected_address, {"connected": False})
                config_store.save()

            client = BleakClient(
                device,
                disconnected_callback=on_disconnect,
                timeout=10.0,
            )

            try:
                await client.connect()
                connected_clients[address] = client
                retry_after.pop(address, None)
                logger.info("Connected: %s", address)

                config_store.upsert_device(address, {"connected": True})
                config_store.save()

                await client.start_notify(CHAR_UUID, make_notification_handler(address))
                device_states[address] = 0
                update_live_state(address, 0)
                publish_report(reducer.update_device_state(address, 0))
            except Exception as exc:
                retry_after[address] = time.monotonic() + SCANNER_DELAY
                logger.error(
                    "Failed to connect to %s: %s. Retrying after %ss",
                    address,
                    exc,
                    SCANNER_DELAY,
                )
                connected_clients.pop(address, None)
                device_states.pop(address, None)
                clear_live_state(address)
                if client.is_connected:
                    await client.disconnect()
            finally:
                connecting_addresses.discard(address)
                if not stop_event.is_set():
                    await scanner.start()

    async def run() -> None:
        connect_lock = asyncio.Lock()
        scanner = BleakScanner(detection_callback=detection_callback)

        refresh_mapping_cache(force=True)
        publish_report(reducer.build_report())

        await control_server.start()
        await scanner.start()

        try:
            while not stop_event.is_set():
                for address in list(pending_connects):
                    if address in connected_clients or address in connecting_addresses:
                        pending_connects.discard(address)
                        continue
                    if time.monotonic() < retry_after.get(address, 0.0):
                        continue

                    pending_connects.discard(address)
                    connecting_addresses.add(address)
                    asyncio.create_task(connect_device(address, scanner, connect_lock))

                refresh_mapping_cache()
                await asyncio.sleep(0.5)
        finally:
            logger.info("Aggregator stopping, disconnecting all...")
            await scanner.stop()
            await control_server.stop()

            clients = list(connected_clients.values())
            for client in clients:
                try:
                    await client.disconnect()
                except Exception as exc:
                    logger.warning("Failed to disconnect %s cleanly: %s", client.address, exc)

            publish_report(build_keyboard_report([]))

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
    except Exception:
        logger.exception("Aggregator crashed")
    finally:
        logger.info("Aggregator Process Exiting")
