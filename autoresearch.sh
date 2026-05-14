#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PY="$ROOT/server/.venv/bin/python"

"$PY" - <<'PY'
from __future__ import annotations

import importlib.util
import statistics
import sys
import time
from pathlib import Path
from types import ModuleType

ROOT = Path.cwd()
SERVER = ROOT / "server"
sys.path.insert(0, str(SERVER))

from core.constants import DEFAULT_GAMEPAD_MAPPING, DEFAULT_MAPPING  # noqa: E402

runtime_pkg = ModuleType("runtime")
runtime_pkg.__path__ = [str(SERVER / "runtime")]
sys.modules.setdefault("runtime", runtime_pkg)

report_builder_spec = importlib.util.spec_from_file_location(
    "runtime.report_builder",
    SERVER / "runtime" / "report_builder.py",
)
assert report_builder_spec and report_builder_spec.loader
report_builder = importlib.util.module_from_spec(report_builder_spec)
sys.modules["runtime.report_builder"] = report_builder
report_builder_spec.loader.exec_module(report_builder)

state_reducer_spec = importlib.util.spec_from_file_location(
    "runtime.state_reducer",
    SERVER / "runtime" / "state_reducer.py",
)
assert state_reducer_spec and state_reducer_spec.loader
state_reducer = importlib.util.module_from_spec(state_reducer_spec)
sys.modules["runtime.state_reducer"] = state_reducer
state_reducer_spec.loader.exec_module(state_reducer)

build_mapping_cache = report_builder.build_mapping_cache
StateReducer = state_reducer.StateReducer

import multiprocessing


DEVICE_COUNT = 8
ITERATIONS = 30000
REPEATS = 5
WARMUP = 2000


class PublishMailbox:
    __slots__ = (
        "report_array",
        "report_version",
        "last_input_event_at",
        "report_published_at",
        "report_event",
    )

    def __init__(self) -> None:
        self.report_array = multiprocessing.Array("B", 64, lock=False)
        self.report_version = multiprocessing.Value("i", 0, lock=True)
        self.last_input_event_at = multiprocessing.Value("d", 0.0, lock=True)
        self.report_published_at = multiprocessing.Value("d", 0.0, lock=True)
        self.report_event = multiprocessing.Event()



def make_snapshot(mode: str) -> dict[str, object]:
    devices: dict[str, dict[str, object]] = {}
    for idx in range(DEVICE_COUNT):
        device_id = f"AA:BB:CC:DD:EE:{idx:02X}"
        mapping: dict[str, dict[str, object]] = {}
        if mode == "keyboard":
            for bit_index, keycode in DEFAULT_MAPPING.items():
                mapping[str(bit_index)] = {"keycode": int(keycode)}
        else:
            for bit_index, gamepad_input in DEFAULT_GAMEPAD_MAPPING.items():
                mapping[str(bit_index)] = {"gamepad_input": str(gamepad_input)}
        devices[device_id] = {
            "active_profile": "profile-1",
            "profiles": {
                "profile-1": {
                    "modes": {
                        mode: {"mapping": mapping},
                    },
                }
            },
        }
    return {"devices": devices}



def make_reducer(mode: str) -> tuple[StateReducer, list[str]]:
    snapshot = make_snapshot(mode)
    mapping_cache = build_mapping_cache(snapshot, mode=mode)
    reducer = StateReducer(mapping_cache, mode=mode)
    device_ids = list(mapping_cache)
    for device_id in device_ids:
        reducer.update_device_state(device_id, 0)
    return reducer, device_ids



def publish_report(mailbox: PublishMailbox, report: bytes) -> None:
    for i in range(len(mailbox.report_array)):
        mailbox.report_array[i] = report[i] if i < len(report) else 0
    published_at = time.perf_counter()
    with mailbox.report_published_at.get_lock():
        mailbox.report_published_at.value = published_at
    with mailbox.report_version.get_lock():
        mailbox.report_version.value += 1
    mailbox.report_event.set()



def bench_reduce_only(mode: str) -> float:
    reducer, device_ids = make_reducer(mode)
    device_states = {device_id: 0 for device_id in device_ids}
    bits = (1, 2, 4, 8)

    for i in range(WARMUP):
        device_id = device_ids[i % len(device_ids)]
        device_states[device_id] ^= bits[i % len(bits)]
        reducer.update_device_state(device_id, device_states[device_id])

    samples = []
    for repeat in range(REPEATS):
        start = time.perf_counter_ns()
        for i in range(ITERATIONS):
            device_id = device_ids[i % len(device_ids)]
            device_states[device_id] ^= bits[i % len(bits)]
            reducer.update_device_state(device_id, device_states[device_id])
        elapsed = time.perf_counter_ns() - start
        samples.append(elapsed / ITERATIONS / 1000.0)
        for device_id in device_ids:
            reducer.update_device_state(device_id, 0)
            device_states[device_id] = 0
    return statistics.median(samples)



def bench_publish_only(mode: str) -> float:
    reducer, _device_ids = make_reducer(mode)
    mailbox = PublishMailbox()
    report = reducer.build_report()

    for _ in range(WARMUP):
        publish_report(mailbox, report)

    samples = []
    for _ in range(REPEATS):
        start = time.perf_counter_ns()
        for _ in range(ITERATIONS):
            publish_report(mailbox, report)
        elapsed = time.perf_counter_ns() - start
        samples.append(elapsed / ITERATIONS / 1000.0)
    return statistics.median(samples)



def bench_input_to_publish(mode: str) -> float:
    reducer, device_ids = make_reducer(mode)
    mailbox = PublishMailbox()
    device_states = {device_id: 0 for device_id in device_ids}
    bits = (1, 2, 4, 8)

    for i in range(WARMUP):
        device_id = device_ids[i % len(device_ids)]
        device_states[device_id] ^= bits[i % len(bits)]
        report = reducer.update_device_state(device_id, device_states[device_id])
        if report is not None:
            publish_report(mailbox, report)

    samples = []
    for repeat in range(REPEATS):
        start = time.perf_counter_ns()
        for i in range(ITERATIONS):
            device_id = device_ids[i % len(device_ids)]
            device_states[device_id] ^= bits[i % len(bits)]
            report = reducer.update_device_state(device_id, device_states[device_id])
            if report is not None:
                publish_report(mailbox, report)
        elapsed = time.perf_counter_ns() - start
        samples.append(elapsed / ITERATIONS / 1000.0)
        for device_id in device_ids:
            reducer.update_device_state(device_id, 0)
            device_states[device_id] = 0
    return statistics.median(samples)



def bench_mapping_cache(mode: str) -> float:
    snapshot = make_snapshot(mode)
    samples = []
    for _ in range(REPEATS):
        start = time.perf_counter_ns()
        for _ in range(50):
            build_mapping_cache(snapshot, mode=mode)
        elapsed = time.perf_counter_ns() - start
        samples.append(elapsed / 50 / 1000.0)
    return statistics.median(samples)


keyboard_update_us = bench_reduce_only("keyboard")
gamepad_update_us = bench_reduce_only("gamepad_pc")
switch_update_us = bench_reduce_only("gamepad_switch_hori")
reduce_us = statistics.median([keyboard_update_us, gamepad_update_us, switch_update_us])
publish_us = statistics.median(
    [bench_publish_only("keyboard"), bench_publish_only("gamepad_pc"), bench_publish_only("gamepad_switch_hori")]
)
input_to_publish_us = statistics.median(
    [bench_input_to_publish("keyboard"), bench_input_to_publish("gamepad_pc"), bench_input_to_publish("gamepad_switch_hori")]
)
mapping_cache_us = statistics.median(
    [bench_mapping_cache("keyboard"), bench_mapping_cache("gamepad_pc"), bench_mapping_cache("gamepad_switch_hori")]
)

print(f"METRIC input_to_publish_us={input_to_publish_us:.3f}")
print(f"METRIC reduce_us={reduce_us:.3f}")
print(f"METRIC publish_us={publish_us:.3f}")
print(f"METRIC keyboard_update_us={keyboard_update_us:.3f}")
print(f"METRIC gamepad_update_us={gamepad_update_us:.3f}")
print(f"METRIC switch_update_us={switch_update_us:.3f}")
print(f"METRIC mapping_cache_us={mapping_cache_us:.3f}")
PY