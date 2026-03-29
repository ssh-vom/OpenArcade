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


def set_cpu_affinity(core_id: int) -> None:
    """Pin this process to a specific CPU core."""
    try:
        os.sched_setaffinity(0, {core_id})
        logger.info(f"Pinned to CPU core {core_id}")
    except Exception as exc:
        logger.warning(f"Could not set CPU affinity: {exc}")


def aggregator_process(
    hid_queue,
    stop_event,
    config_path: str | None = None,
    cpu_core: int = 0,
):
    """
    Dedicated BLE transport process pinned to a specific CPU core.
    
    Pure transport: scan, connect, notify, aggregate, queue.
    No control server, no socket handling in this process.
    """
    
    # Pin to specific CPU core immediately
    set_cpu_affinity(cpu_core)
    
    logger.info("Aggregator Process Started on core %d", cpu_core)

    connected_clients: dict[str, BleakClient] = {}
    connecting_addresses: set[str] = set()
    discovered_devices: dict[str, Any] = {}
    pending_connects: set[str] = set()
    retry_after: dict[str, float] = {}
    device_states: dict[str, int] = {}
    live_states: dict[str, dict[str, Any]] = {}
    state_sequence = 0

    config_store = DeviceConfigStore(path=config_path)
    reducer = StateReducer(build_mapping_cache(config_store.load()))
    config_mtime: float | None = None
    last_report: bytes | None = None

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
            return
        if not force and mtime == config_mtime:
            return
        config_mtime = mtime
        snapshot = config_store.load()
        publish_report(reducer.set_mapping_cache(build_mapping_cache(snapshot)))

    def update_live_state(address: str, state: int) -> None:
        nonlocal state_sequence
        state_sequence += 1
        live_states[address] = {
            "state": state,
            "seq": state_sequence,
            "updated_at": time.time(),
        }

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

    async def run() -> None:
        connect_lock = asyncio.Lock()
        scanner: BleakScanner | None = None
        scanner_running = False

        async def handle_config_updated() -> None:
            refresh_mapping_cache(force=True)

        def get_connected_devices() -> set[str]:
            return set(connected_clients)

        def get_device_states() -> dict[str, dict[str, Any]]:
            return {
                address: dict(state)
                for address, state in live_states.items()
            }

        control_server = RuntimeControlServer(
            on_config_updated=handle_config_updated,
            get_connected_devices=get_connected_devices,
            get_device_states=get_device_states,
        )

        async def ensure_scanner_running() -> None:
            nonlocal scanner, scanner_running
            if scanner_running and scanner is not None:
                return
            if scanner is None:
                scanner = BleakScanner(detection_callback=detection_callback)
            try:
                await scanner.start()
                scanner_running = True
                logger.info("Scanner started")
            except Exception as exc:
                logger.error("Failed to start scanner: %s", exc)

        async def stop_scanner() -> None:
            nonlocal scanner_running
            if not scanner_running or scanner is None:
                return
            try:
                await scanner.stop()
                scanner_running = False
            except Exception as exc:
                logger.warning("Scanner stop error: %s", exc)

        async def connect_device(address: str) -> None:
            if address in connected_clients:
                connecting_addresses.discard(address)
                return

            device = discovered_devices.get(address)
            if device is None:
                logger.warning("Skipping connect for %s: device not cached", address)
                connecting_addresses.discard(address)
                return

            async with connect_lock:
                await stop_scanner()
                logger.info("Connecting to %s...", address)

                def on_disconnect(client: BleakClient) -> None:
                    disconnected_address = str(client.address)
                    logger.warning("Disconnected: %s", disconnected_address)
                    connected_clients.pop(disconnected_address, None)
                    device_states.pop(disconnected_address, None)
                    live_states.pop(disconnected_address, None)
                    publish_report(reducer.remove_device_state(disconnected_address))

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
                    if client.is_connected:
                        await client.disconnect()
                finally:
                    connecting_addresses.discard(address)
                    if not stop_event.is_set():
                        await ensure_scanner_running()

        # Initial setup
        refresh_mapping_cache()
        publish_report(reducer.build_report())
        await control_server.start()
        await ensure_scanner_running()

        try:
            while not stop_event.is_set():
                # Process pending connects
                for address in list(pending_connects):
                    if address in connected_clients or address in connecting_addresses:
                        pending_connects.discard(address)
                        continue
                    if time.monotonic() < retry_after.get(address, 0.0):
                        continue

                    pending_connects.discard(address)
                    connecting_addresses.add(address)
                    asyncio.create_task(connect_device(address))

                # Periodic cache refresh (non-blocking)
                refresh_mapping_cache()
                
                # Ensure scanner is always running if we have slots
                if not stop_event.is_set():
                    await ensure_scanner_running()
                
                await asyncio.sleep(0.5)

        finally:
            logger.info("Aggregator stopping...")
            await stop_scanner()
            
            for client in list(connected_clients.values()):
                try:
                    await client.disconnect()
                except Exception as exc:
                    logger.warning("Disconnect cleanup failed: %s", exc)

            live_states.clear()
            await control_server.stop()
            publish_report(build_keyboard_report([]))

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
    except Exception:
        logger.exception("Aggregator crashed")
    finally:
        logger.info("Aggregator Process Exiting")
