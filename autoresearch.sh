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


DEVICE_COUNT = 8
ITERATIONS = 40000
REPEATS = 5
WARMUP = 2000


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



def bench_update(mode: str) -> float:
    snapshot = make_snapshot(mode)
    mapping_cache = build_mapping_cache(snapshot, mode=mode)
    reducer = StateReducer(mapping_cache, mode=mode)
    device_ids = list(mapping_cache)
    for device_id in device_ids:
        reducer.update_device_state(device_id, 0)

    # Warm up caches and branch predictors.
    state = 0
    for i in range(WARMUP):
        device_id = device_ids[i % len(device_ids)]
        state ^= 1 << (i % 2)
        reducer.update_device_state(device_id, state)

    samples = []
    state = 0
    for i in range(REPEATS):
        start = time.perf_counter_ns()
        for j in range(ITERATIONS):
            device_id = device_ids[j % len(device_ids)]
            state ^= 1 << (j % 2)
            reducer.update_device_state(device_id, state)
        elapsed = time.perf_counter_ns() - start
        samples.append(elapsed / ITERATIONS / 1000.0)
        # Reset to a neutral baseline between repeats.
        for device_id in device_ids:
            reducer.update_device_state(device_id, 0)
        state = 0
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


keyboard_us = bench_update("keyboard")
gamepad_us = bench_update("gamepad_pc")
switch_us = bench_update("gamepad_switch_hori")
hot_path_us = statistics.median([keyboard_us, gamepad_us, switch_us])
mapping_cache_us = statistics.median(
    [bench_mapping_cache("keyboard"), bench_mapping_cache("gamepad_pc"), bench_mapping_cache("gamepad_switch_hori")]
)

print(f"METRIC hot_path_us={hot_path_us:.3f}")
print(f"METRIC keyboard_update_us={keyboard_us:.3f}")
print(f"METRIC gamepad_update_us={gamepad_us:.3f}")
print(f"METRIC switch_update_us={switch_us:.3f}")
print(f"METRIC mapping_cache_us={mapping_cache_us:.3f}")
PY