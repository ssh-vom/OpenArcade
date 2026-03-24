# Cooperative Runtime Architecture

This diagram set describes the proposed server-side architecture after consolidating BLE work into a single async runtime module while keeping configuration and HID output isolated behind clear boundaries.

Proposed naming:

- Async runtime module: `runtime`
- Blocking HID process: `hid_output_worker`
- Separate config service: `serial_config_service`
- Config persistence: `device_config_store`
- Runtime IPC boundary: `runtime/control_server.py`

## System Overview

```mermaid
flowchart LR
    User((User))
    UI["React Config App"]
    WebSerial["WebSerial API"]
    ConfigSvc["serial_config_service.py\nSeparate process/service"]
    ConfigStore["device_config_store.py\nconfig.json"]
    ConfigEvents["(config update events)"]

    subgraph Modules["ESP32 Modules"]
        M1["Module A\nBLE peripheral"]
        M2["Module B\nBLE peripheral"]
        M3["Module N\nBLE peripheral"]
    end

    BLE((BLE))

    subgraph RuntimeProc["openarcade-runtime\nSingle async runtime process"]
        Runtime["runtime/app.py"]
    end

    HidQueue["(latest HID report)"]

    subgraph HidProc["Dedicated blocking worker process"]
        HidWorker["hid_output_worker.py"]
        HidDev["/dev/hidg0"]
    end

    User --> UI --> WebSerial --> ConfigSvc
    ConfigSvc --> ConfigStore
    ConfigSvc --> ConfigEvents --> Runtime
    ConfigStore -. bootstrap/load .-> Runtime

    M1 --> BLE
    M2 --> BLE
    M3 --> BLE
    BLE --> Runtime

    Runtime --> HidQueue --> HidWorker --> HidDev
```

## Async Runtime Internals

```mermaid
flowchart TB
    subgraph Runtime[Async runtime module]
        Discovery[discovery.py\nBleakScanner callbacks]
        Sessions[sessions.py\nConnectionSupervisor]
        DeviceSession[device_session.py\nper-device session tasks]
        ControlServer[control_server.py\nconfig updates + live status]
        Reducer[state_reducer.py\ncombine device states]
        Reports[report_builder.py\nbuild HID payload]
        Publisher[report_publisher\ncoalesce latest report]
    end

    Discovery --> Sessions
    Sessions --> DeviceSession
    DeviceSession --> Reducer
    ControlServer --> Reducer
    Reducer --> Reports --> Publisher
```

## Runtime Data Flow

```mermaid
sequenceDiagram
    participant Module as ESP32 Module
    participant Discovery as DiscoveryLoop
    participant Session as DeviceSession
    participant Reducer as StateReducer
    participant Reports as ReportBuilder
    participant Worker as HIDOutputWorker

    Module->>Discovery: advertise
    Discovery->>Session: schedule/connect
    Session->>Module: subscribe to notifications

    loop on input changes
        Module-->>Session: state notification
        Session->>Reducer: update device state
        Reducer->>Reports: aggregate active controls
        Reports->>Worker: publish latest HID report
        Worker->>Worker: blocking write(/dev/hidg0)
    end
```

## Config Update Path

```mermaid
sequenceDiagram
    participant UI as Config App
    participant ConfigSvc as SerialConfigService
    participant Store as DeviceConfigStore
    participant Runtime as Async Runtime
    participant Reducer as StateReducer

    UI->>ConfigSvc: set_mapping / set_active_mode
    ConfigSvc->>Store: persist durable config
    ConfigSvc->>Runtime: emit config update event
    Runtime->>Reducer: refresh mapping/cache in memory
    Reducer-->>Runtime: next reports use new mapping
```

## Design Notes

- BLE discovery, connection management, notifications, and aggregation stay in one cooperative event loop.
- The HID writer remains its own process because `/dev/hidg0` writes are blocking and form a natural isolation boundary.
- Config stays separate for now, but moves from file polling toward explicit update events.
- The runtime should publish the latest HID state, not an unbounded backlog of stale reports.
- `connected` state is best treated as runtime state; durable configuration should stay in `device_config_store`.
