# Config Channel Protocol (WebSerial Draft)

The WebSerial channel uses UTF-8 JSON lines. Each message is a single JSON object
terminated by `\n`. Responses follow the same format.

## Request/Response Shape

- Request: `{ "cmd": "<command>", ... }`
- Response: `{ "ok": true, ... }` or `{ "ok": false, "error": "<message>" }`

## Commands

### `ping`
Request:
```json
{ "cmd": "ping" }
```
Response:
```json
{ "ok": true, "reply": "pong" }
```

### `list_devices`
Response includes all devices in the config store.
```json
{ "cmd": "list_devices" }
```

### `get_device`
```json
{ "cmd": "get_device", "device_id": "AA:BB:CC:DD:EE:FF" }
```

### `set_descriptor`
```json
{ "cmd": "set_descriptor", "device_id": "AA:BB:CC:DD:EE:FF", "descriptor": { ... } }
```

### `set_mapping`
```json
{
  "cmd": "set_mapping",
  "device_id": "AA:BB:CC:DD:EE:FF",
  "mode": "keyboard",
  "control_id": "1",
  "mapping": { "keycode": "HID_KEY_Z" }
}
```

### `set_active_mode`
```json
{ "cmd": "set_active_mode", "device_id": "AA:BB:CC:DD:EE:FF", "mode": "keyboard" }
```

### `set_last_seen`
```json
{ "cmd": "set_last_seen", "device_id": "AA:BB:CC:DD:EE:FF" }
```
