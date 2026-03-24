# Runtime Refactor Plan

This document captures the planned refactor from the current mixed-process runtime into a clearer architecture with one cooperative async runtime module, one dedicated HID output worker, and one separate config service.

Related diagram: `docs/flow-runtime-architecture.md`

## Goals

- Keep BLE discovery, connection management, notification handling, and state aggregation inside one async runtime module.
- Keep HID writes isolated in a dedicated blocking worker process.
- Keep configuration as a separate service for now.
- Replace config file polling with explicit config update events.
- Make module and file names line up with actual responsibilities.

## Target Architecture

- Async runtime package: `server/runtime/`
- Runtime entry point: `server/runtime_main.py`
- Blocking HID worker: `server/hid_output_worker.py`
- Separate config service: `server/serial_config_service.py`
- Config persistence: `server/device_config_store.py`

## Current To Target Mapping

| Current file | Target role | Notes |
|---|---|---|
| `server/subscriber.py` | `server/runtime_main.py` | Keep as thin launcher/supervisor or replace outright |
| `server/aggregator.py` | `server/runtime/*` | Split into focused async modules |
| `server/hid_writer.py` | `server/hid_output_worker.py` | Same process boundary, clearer name |
| `server/ble_scanner.py` | retired | Fold into `server/runtime/discovery.py` |
| `server/config_daemon.py` | `server/serial_config_service.py` | Same service boundary, clearer name |
| `server/config_store.py` | `server/device_config_store.py` | Same persistence concern, clearer name |

## Proposed Runtime Package Layout

```text
server/
  runtime_main.py
  hid_output_worker.py
  serial_config_service.py
  device_config_store.py
  runtime/
    __init__.py
    app.py
    discovery.py
    sessions.py
    device_session.py
    state_reducer.py
    report_builder.py
    control_server.py
```

## Responsibilities By Module

### `runtime/app.py`

- Build the runtime object graph.
- Start and stop async tasks.
- Own shared runtime state.
- Manage IPC to the HID worker.

### `runtime/discovery.py`

- Own `BleakScanner` setup.
- Handle advertisement callbacks.
- Feed discovered devices into connection scheduling.

### `runtime/sessions.py`

- Manage connection attempts and retry policy.
- Track active device sessions.
- Coordinate clean disconnect and shutdown.

### `runtime/device_session.py`

- Encapsulate one `BleakClient` lifecycle.
- Subscribe to notifications.
- Convert notification payloads into device state updates.

### `runtime/state_reducer.py`

- Hold in-memory device states.
- Apply active mappings.
- Produce normalized aggregate control state.

### `runtime/report_builder.py`

- Convert aggregate state into HID payloads.
- Keep keyboard boot report logic isolated.
- Make future gamepad output changes easier.

### `runtime/control_server.py`

- Receive config update events from the separate config service.
- Serve live runtime status queries such as connected devices.
- Refresh in-memory mapping/config state without polling the file.

### `hid_output_worker.py`

- Perform blocking writes to `/dev/hidg0`.
- Accept reports over a narrow IPC channel.
- Prefer latest-state delivery over backlog growth.

## Phased Refactor Plan

## Phase 0 - Align names and docs

- Add the new architecture doc and keep it as the source of truth.
- Add this plan doc.
- Update stale docs that still describe `ble_scanner.py` and `found_queue` as active runtime pieces.
- Update service and runtime descriptions to use `runtime`, `session`, `discovery`, and `hid_output_worker` terminology.

Deliverable:

- Documentation matches the intended runtime model.

## Phase 1 - Extract pure logic from `aggregator.py`

- Move mapping helpers into a dedicated module if they are shared runtime logic.
- Extract HID report construction into `runtime/report_builder.py`.
- Extract device state aggregation into `runtime/state_reducer.py`.
- Keep behavior unchanged while isolating pure logic from orchestration.

Deliverable:

- `aggregator.py` becomes thinner, with report generation and state reduction pulled into small testable units.

## Phase 2 - Create the runtime package

- Introduce `server/runtime/` with `app.py`, `discovery.py`, `sessions.py`, and `device_session.py`.
- Move scanner setup and detection callback logic into `runtime/discovery.py`.
- Move connection scheduling, retry handling, and shutdown coordination into `runtime/sessions.py`.
- Wrap per-device `BleakClient` logic in `runtime/device_session.py`.

Deliverable:

- One async runtime package exists, even if the launcher still points to transitional code.

## Phase 3 - Replace `aggregator.py` as the orchestration center

- Build a new composition root in `runtime/app.py`.
- Move shared state ownership into the runtime package.
- Update the launcher to start the new runtime module instead of `aggregator.py`.
- Keep the HID worker process boundary unchanged during this step.

Deliverable:

- `aggregator.py` is no longer the central orchestration file.

## Phase 4 - Improve HID output semantics

- Rename `hid_writer.py` to `hid_output_worker.py`.
- Review the IPC contract between runtime and worker.
- Change queue behavior so the worker receives the latest report rather than an unbounded backlog of stale reports.
- Preserve mock mode for local development.

Deliverable:

- HID output path is isolated, well named, and resilient under bursty input.

## Phase 5 - Replace config polling with config update events

- Keep `serial_config_service.py` as a separate service.
- Add a narrow event/update path from config service to runtime.
- Use the config file for durable persistence and bootstrap only.
- Remove mtime polling from the runtime once event delivery is in place.

Options for config update delivery:

- local socket
- pipe or Unix domain socket
- multiprocessing connection if launched together later
- lightweight message file plus notifier as a temporary bridge

Recommended default:

- Unix domain socket for explicit local IPC between the config service and runtime.

Deliverable:

- Config changes apply immediately in memory without periodic file polling.

## Phase 6 - Rename entry points and services

- Rename `subscriber.py` to `runtime_main.py`.
- Rename `config_daemon.py` to `serial_config_service.py`.
- Rename `config_store.py` to `device_config_store.py`.
- Update systemd service files, packaging scripts, README references, and tests.

Deliverable:

- Entry points and filenames match actual responsibilities.

## Phase 7 - Cleanup and delete dead code

- Remove `ble_scanner.py` if its logic has been fully absorbed.
- Remove transitional adapters that are no longer needed.
- Delete or rewrite stale diagrams and comments.

Deliverable:

- The runtime no longer carries legacy structure that suggests a scanner-process model.

## Order of Operations Recommendation

Recommended implementation order:

1. Extract pure logic from `aggregator.py`
2. Create `server/runtime/` package
3. Move orchestration into `runtime/app.py`
4. Improve HID worker IPC semantics
5. Add config update IPC and remove polling
6. Rename public entry points and update packaging
7. Delete dead files and stale docs

## Testing Strategy

- Keep existing unit tests passing during each extraction step.
- Add focused tests for:
  - report building
  - state reduction
  - mapping refresh/application
  - config update event handling
- Smoke test on the Pi for:
  - device discovery
  - multi-device connection
  - disconnect/reconnect behavior
  - HID output under rapid notifications
  - config changes while devices are connected

## Risks and Watchouts

- `BleakScanner` stop/start behavior around connects may hide adapter-specific quirks; refactor carefully.
- Writing config from multiple services/processes can still race until the event path is introduced cleanly.
- Do not couple durable configuration with transient connection state unless there is a clear product need.
- Keep the HID IPC contract narrow so future HID report format changes stay localized.

## Done Criteria

- One async runtime package owns all BLE-side behavior.
- One dedicated HID worker owns blocking `/dev/hidg0` writes.
- The config service stays separate and pushes updates explicitly.
- No active runtime path depends on `ble_scanner.py` or file mtime polling.
- File and service names match their real responsibilities.
