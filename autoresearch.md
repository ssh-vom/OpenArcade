# Autoresearch: server latency

## Objective
Reduce the latency of the server-side input-to-HID pipeline in `server/`, especially the hot path that handles BLE notifications, reduces controller state, builds HID reports, and wakes the HID writer.

## Metrics
- **Primary**: `input_to_publish_us` (µs, lower is better) — median latency from state update through report publication
- **Secondary**: `reduce_us`, `publish_us`, `keyboard_update_us`, `gamepad_update_us`, `switch_update_us`, `mapping_cache_us`

## How to Run
`./autoresearch.sh` — outputs `METRIC name=value` lines.

## Files in Scope
- `server/runtime/state_reducer.py` — aggregates device state and builds reports
- `server/runtime/report_builder.py` — report and mapping cache construction
- `server/runtime/aggregator.py` — notification handler and report publication path
- `server/runtime/hid_writer.py` — report wake/write loop
- `server/core/constants.py` — report constants and mappings
- `server/config/store.py` — config snapshot loading if needed for mapping performance

## Off Limits
- `firmware/`
- `config_app/`
- unrelated docs, tests, and generated caches

## Constraints
- Do not cheat the benchmark.
- Prefer small, local latency wins over architectural churn unless clearly justified.
- Keep behavior correct for keyboard, gamepad PC, and Switch HORI modes.
- Avoid touching unrelated worktree changes.

## What's Been Tried
- Baseline benchmark will measure the reducer/report hot path directly in pure Python.
