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
from hid_mode_state import HIDModeState
from pairing_mode_state import PairingModeState
from runtime.control_server import RuntimeControlServer
from runtime.report_builder import (
    build_gamepad_pc_report,
    build_gamepad_switch_hori_report,
    build_keyboard_report,
    build_mapping_cache,
)
from runtime.state_reducer import StateReducer, HIDMode


logger = logging.getLogger("OpenArcade")
TARGET_DEVICE_NAME = "NimBLE_GATT"
CONNECTED_SCAN_SETTLE_SECONDS = 5.0
BACKGROUND_SCAN_INTERVAL_SECONDS = 15.0
BACKGROUND_SCAN_DURATION_SECONDS = 1.0
SWITCH_TIMING_DEBUG = os.environ.get("OPENARCADE_SWITCH_TIMING_DEBUG", "").lower() in {"1", "true", "yes", "on"}


def set_cpu_affinity(core_id: int) -> None:
    """Pin this process to a specific CPU core."""
    try:
        os.sched_setaffinity(0, {core_id})
        logger.info(f"Pinned to CPU core {core_id}")
    except Exception as exc:
        logger.warning(f"Could not set CPU affinity: {exc}")


def aggregator_process(
    mailbox: dict[str, Any],
    stop_event: Any,
    config_path: str | None = None,
    cpu_core: int = 0,
):
    """
    Dedicated BLE transport process pinned to a specific CPU core.

    BLE transport, aggregation, HID report publication, and runtime control IPC.
    """
    
    # Pin to specific CPU core immediately
    set_cpu_affinity(cpu_core)
    
    logger.info("Aggregator Process Started on core %d", cpu_core)

    report_array = mailbox["report_array"]
    report_version = mailbox["report_version"]
    last_input_event_shared = mailbox["last_input_event_at"]
    report_published_at = mailbox["report_published_at"]
    report_event = mailbox["report_event"]
    
    # Track last published report for deduplication
    last_published_report: bytes | None = None

    connected_clients: dict[str, BleakClient] = {}
    connecting_addresses: set[str] = set()
    discovered_devices: dict[str, Any] = {}
    pending_connects: set[str] = set()
    retry_after: dict[str, float] = {}
    device_states: dict[str, int] = {}
    live_states: dict[str, dict[str, Any]] = {}
    state_sequence = 0
    last_input_event_at = 0.0
    agg_debug_last_log_at = time.monotonic()
    agg_debug_samples = 0
    agg_debug_reduce_total_ms = 0.0
    agg_debug_reduce_max_ms = 0.0
    agg_debug_input_to_publish_total_ms = 0.0
    agg_debug_input_to_publish_max_ms = 0.0
    scan_until = time.monotonic() + CONNECTED_SCAN_SETTLE_SECONDS
    next_background_scan_at = scan_until + BACKGROUND_SCAN_INTERVAL_SECONDS

    config_store = DeviceConfigStore(path=config_path)
    hid_mode_state = HIDModeState()
    pairing_mode_state = PairingModeState()

    # Load initial HID mode
    initial_mode_state = hid_mode_state.load()
    current_mode: HIDMode = initial_mode_state["active_mode"]
    current_mode_sequence = initial_mode_state["sequence"]

    # Load initial pairing mode
    initial_pairing_state = pairing_mode_state.load()
    pairing_enabled: bool = initial_pairing_state.get("enabled", False)
    pairing_sequence: int = initial_pairing_state.get("sequence", 0)
    pairing_file_mtime: float | None = None

    reducer = StateReducer(build_mapping_cache(config_store.load(), mode=current_mode), mode=current_mode)
    config_mtime: float | None = None
    mode_file_mtime: float | None = None

    def publish_report(report: bytes | None) -> None:
        nonlocal last_published_report
        if report is None:
            return
        # Deduplication: only publish if report actually changed
        if report == last_published_report:
            return
        last_published_report = report

        published_at = time.perf_counter()

        # Write to shared memory and clear any trailing bytes from a prior report.
        for i in range(len(report_array)):
            report_array[i] = report[i] if i < len(report) else 0

        with report_published_at.get_lock():
            report_published_at.value = published_at

        # Increment version and signal writer
        with report_version.get_lock():
            report_version.value += 1
            version = report_version.value
        report_event.set()

        if SWITCH_TIMING_DEBUG and current_mode == "gamepad_switch_hori":
            nonlocal agg_debug_last_log_at, agg_debug_samples
            nonlocal agg_debug_reduce_total_ms, agg_debug_reduce_max_ms
            nonlocal agg_debug_input_to_publish_total_ms, agg_debug_input_to_publish_max_ms
            latency_ms = 0.0
            if last_input_event_at > 0:
                latency_ms = (published_at - last_input_event_at) * 1000.0
            agg_debug_samples += 1
            agg_debug_input_to_publish_total_ms += latency_ms
            agg_debug_input_to_publish_max_ms = max(agg_debug_input_to_publish_max_ms, latency_ms)
            now = time.monotonic()
            if (now - agg_debug_last_log_at) >= 1.0:
                avg_input_to_publish_ms = (
                    agg_debug_input_to_publish_total_ms / agg_debug_samples
                    if agg_debug_samples else 0.0
                )
                avg_reduce_ms = (
                    agg_debug_reduce_total_ms / agg_debug_samples
                    if agg_debug_samples else 0.0
                )
                logger.info(
                    "[SWITCH_TIMING][AGG] samples=%s avg_reduce_ms=%.3f max_reduce_ms=%.3f avg_input_to_publish_ms=%.3f max_input_to_publish_ms=%.3f last_version=%s last_report=%s",
                    agg_debug_samples,
                    avg_reduce_ms,
                    agg_debug_reduce_max_ms,
                    avg_input_to_publish_ms,
                    agg_debug_input_to_publish_max_ms,
                    version,
                    report[:8].hex(),
                )
                agg_debug_last_log_at = now
                agg_debug_samples = 0
                agg_debug_reduce_total_ms = 0.0
                agg_debug_reduce_max_ms = 0.0
                agg_debug_input_to_publish_total_ms = 0.0
                agg_debug_input_to_publish_max_ms = 0.0

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
        publish_report(reducer.set_mapping_cache(build_mapping_cache(snapshot, mode=current_mode)))

    def check_mode_change() -> None:
        """Check if HID mode has changed and update if needed."""
        nonlocal current_mode, current_mode_sequence, mode_file_mtime

        try:
            # Always read the state and compare sequence numbers directly.
            # File mtime is not reliable enough here because multiple mode changes can
            # happen within the same timestamp granularity, which would leave the
            # aggregator building reports for the old mode while the writer has already
            # switched endpoints.
            mode_state = hid_mode_state.load()

            try:
                mode_file_mtime = os.path.getmtime(hid_mode_state.path)
            except FileNotFoundError:
                mode_file_mtime = None

            new_mode: HIDMode = mode_state["active_mode"]
            new_sequence = mode_state["sequence"]
            
            # Ignore stale or regressive updates.
            if new_sequence < current_mode_sequence:
                logger.warning(
                    "Ignoring stale HID mode state: %s -> %s (seq: %s -> %s)",
                    current_mode,
                    new_mode,
                    current_mode_sequence,
                    new_sequence,
                )
                return

            # Check if mode actually changed
            if new_mode == current_mode and new_sequence == current_mode_sequence:
                return

            logger.info(
                f"HID mode changed: {current_mode} -> {new_mode} (seq: {current_mode_sequence} -> {new_sequence})"
            )
            
            # Send neutral report to old endpoint before switching.
            if current_mode == "keyboard":
                publish_report(build_keyboard_report([]))
            elif current_mode == "gamepad_switch_hori":
                publish_report(build_gamepad_switch_hori_report([]))
            else:
                publish_report(build_gamepad_pc_report([]))
            
            # Switch mode
            current_mode = new_mode
            current_mode_sequence = new_sequence
            
            # Rebuild mapping cache for new mode
            snapshot = config_store.load()
            mapping_cache = build_mapping_cache(snapshot, mode=current_mode)
            
            # Update reducer and publish new report
            reducer.set_mapping_cache(mapping_cache)
            publish_report(reducer.set_mode(current_mode))
            
        except Exception as exc:
            logger.error(f"Error checking mode change: {exc}", exc_info=True)

    def check_pairing_change() -> tuple[bool, bool]:
        """
        Check if pairing mode has changed and update if needed.

        Returns:
            Tuple of (changed: bool, now_enabled: bool)
        """
        nonlocal pairing_enabled, pairing_sequence, pairing_file_mtime

        try:
            pairing_state = pairing_mode_state.load()

            try:
                mtime = os.path.getmtime(pairing_mode_state.path)
            except FileNotFoundError:
                pairing_file_mtime = None
                mtime = None

            if (
                mtime is not None
                and pairing_file_mtime is not None
                and mtime == pairing_file_mtime
            ):
                return False, pairing_enabled

            pairing_file_mtime = mtime
            new_enabled: bool = pairing_state.get("enabled", False)
            new_sequence: int = pairing_state.get("sequence", 0)

            if new_sequence < pairing_sequence:
                logger.warning(
                    "Ignoring stale pairing state: enabled=%s -> %s (seq: %s -> %s)",
                    pairing_enabled,
                    new_enabled,
                    pairing_sequence,
                    new_sequence,
                )
                return False, pairing_enabled

            if new_enabled == pairing_enabled and new_sequence == pairing_sequence:
                return False, pairing_enabled

            logger.info(
                f"Pairing mode changed: enabled={pairing_enabled} -> {new_enabled} "
                f"(seq: {pairing_sequence} -> {new_sequence})"
            )

            pairing_enabled = new_enabled
            pairing_sequence = new_sequence
            return True, pairing_enabled

        except Exception as exc:
            logger.error(f"Error checking pairing change: {exc}", exc_info=True)
            return False, pairing_enabled

    def update_live_state(address: str, state: int) -> None:
        nonlocal state_sequence
        state_sequence += 1
        live_states[address] = {
            "state": state,
            "seq": state_sequence,
            "updated_at": time.time(),
        }

    def extend_scan_window(duration: float = CONNECTED_SCAN_SETTLE_SECONDS) -> None:
        nonlocal scan_until, next_background_scan_at
        now = time.monotonic()
        scan_until = max(scan_until, now + duration)
        next_background_scan_at = scan_until + BACKGROUND_SCAN_INTERVAL_SECONDS

    def make_notification_handler(address: str):
        def handler(_sender: Any, data: bytearray) -> None:
            nonlocal last_input_event_at, agg_debug_reduce_total_ms, agg_debug_reduce_max_ms
            if len(data) < 4:
                return
            state = struct.unpack("<I", data[:4])[0]
            if device_states.get(address) == state:
                return
            last_input_event_at = time.perf_counter()
            with last_input_event_shared.get_lock():
                last_input_event_shared.value = last_input_event_at
            device_states[address] = state
            update_live_state(address, state)
            reduce_started_at = time.perf_counter()
            report = reducer.update_device_state(address, state)
            reduce_ms = (time.perf_counter() - reduce_started_at) * 1000.0
            if SWITCH_TIMING_DEBUG and current_mode == "gamepad_switch_hori":
                agg_debug_reduce_total_ms += reduce_ms
                agg_debug_reduce_max_ms = max(agg_debug_reduce_max_ms, reduce_ms)
            publish_report(report)
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
        extend_scan_window()
        logger.info("Discovered Target Device: %s (%s)", address, name)

    async def run() -> None:
        connect_lock = asyncio.Lock()
        scanner: BleakScanner | None = None
        scanner_running = False
        pending_tasks: set[asyncio.Task] = set()

        async def handle_config_updated() -> None:
            refresh_mapping_cache(force=True)

        def get_connected_devices() -> set[str]:
            return set(connected_clients)

        def get_device_states() -> dict[str, dict[str, Any]]:
            return {
                address: dict(state)
                for address, state in live_states.items()
            }

        def get_pairing_status() -> dict[str, Any]:
            state = pairing_mode_state.load(use_cache=True)
            return {
                "enabled": pairing_enabled,
                "scanner_running": scanner_running,
                "source": state.get("source", "unknown"),
                "sequence": pairing_sequence,
                "updated_at": state.get("updated_at", ""),
            }

        control_server = RuntimeControlServer(
            on_config_updated=handle_config_updated,
            get_connected_devices=get_connected_devices,
            get_device_states=get_device_states,
            get_pairing_status=get_pairing_status,
        )

        def should_scan() -> bool:
            nonlocal next_background_scan_at

            if not pairing_enabled:
                return False

            now = time.monotonic()
            if not connected_clients:
                return True
            if pending_connects or connecting_addresses:
                return True
            if now < scan_until:
                return True
            if now >= next_background_scan_at:
                extend_scan_window(BACKGROUND_SCAN_DURATION_SECONDS)
                return True
            return False

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
                    extend_scan_window()
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
                    extend_scan_window()
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
                        if should_scan():
                            await ensure_scanner_running()
                        else:
                            await stop_scanner()

        def cleanup_task(task: asyncio.Task) -> None:
            pending_tasks.discard(task)
            if task.exception():
                logger.error("Connect task failed: %s", task.exception())

        # Initial setup
        refresh_mapping_cache()
        check_mode_change()  # Ensure we're in sync with current mode
        check_pairing_change()  # Ensure we're in sync with current pairing state
        publish_report(reducer.build_report())
        await control_server.start()

        if pairing_enabled:
            await ensure_scanner_running()
            logger.info("Scanner started (pairing enabled at startup)")
        else:
            logger.info("Scanner not started (pairing disabled at startup)")

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
                    task = asyncio.create_task(connect_device(address))
                    pending_tasks.add(task)
                    task.add_done_callback(cleanup_task)

                # Clean up completed tasks periodically
                done_tasks = [t for t in pending_tasks if t.done()]
                for t in done_tasks:
                    pending_tasks.discard(t)
                    if t.exception():
                        logger.error("Connect task failed: %s", t.exception())

                # Periodic cache refresh (non-blocking)
                refresh_mapping_cache()
                
                # Check for mode changes
                check_mode_change()

                # Check for pairing mode changes
                pairing_changed, now_enabled = check_pairing_change()
                if pairing_changed:
                    if not now_enabled:
                        await stop_scanner()
                        pending_connects.clear()
                        retry_after.clear()
                        logger.info(
                            "Pairing disabled - scanner stopped, pending connects cleared. "
                            f"Active connections preserved: {len(connected_clients)}"
                        )
                    else:
                        extend_scan_window()
                        logger.info("Pairing enabled - scanner will start")

                # Keep scanning only while pairing is enabled and conditions are met.
                if not stop_event.is_set():
                    if should_scan():
                        await ensure_scanner_running()
                    else:
                        await stop_scanner()

                await asyncio.sleep(0.5)

        finally:
            logger.info("Aggregator stopping...")
            await stop_scanner()
            
            # Cancel any pending tasks
            for task in pending_tasks:
                task.cancel()
            if pending_tasks:
                await asyncio.gather(*pending_tasks, return_exceptions=True)
            
            for client in list(connected_clients.values()):
                try:
                    await client.disconnect()
                except Exception as exc:
                    logger.warning("Disconnect cleanup failed: %s", exc)

            live_states.clear()
            await control_server.stop()
            if current_mode == "gamepad_switch_hori":
                publish_report(build_gamepad_switch_hori_report([]))
            elif current_mode == "gamepad_pc":
                publish_report(build_gamepad_pc_report([]))
            else:
                publish_report(build_keyboard_report([]))

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
    except Exception:
        logger.exception("Aggregator crashed")
    finally:
        logger.info("Aggregator Process Exiting")
