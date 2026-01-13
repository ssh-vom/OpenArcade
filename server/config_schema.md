# OpenArcade Config Schema (Draft)

This schema describes how the Pi stores per-device descriptors and mappings.
Device IDs are BLE addresses for now.

## Top Level

```json
{
  "schema_version": 1,
  "devices": {}
}
```

## Device Entry

```json
{
  "device_id": "AA:BB:CC:DD:EE:FF",
  "last_seen": "2025-02-14T12:34:56Z",
  "descriptor": {
    "protocol_version": 1,
    "report_format": 0,
    "report_bytes": 4,
    "control_count": 15,
    "unique_id": null,
    "fw_ver": null,
    "controls": [
      {
        "id": 1,
        "type": 1,
        "format": 0,
        "flags": 0,
        "bit_index": 0,
        "bit_width": 1,
        "byte_offset": null,
        "bit_offset": null,
        "label": "Button 1"
      }
    ]
  },
  "active_mode": "keyboard",
  "modes": {
    "keyboard": {
      "output": "hid_keyboard",
      "mapping": {
        "1": { "keycode": "HID_KEY_Z" },
        "2": { "keycode": "HID_KEY_C" }
      }
    },
    "gamepad": {
      "output": "hid_gamepad",
      "mapping": {
        "1": { "button": "A" },
        "2": { "button": "B" }
      }
    }
  },
  "ui": {
    "layout": {
      "button_1": "1",
      "button_2": "2"
    }
  }
}
```

## Notes

- `descriptor.controls[].id` is the stable control_id (u8 in INFO TLV).
- `mapping` keys are control_id values (as strings for JSON keys).
- If no descriptor is available, fall back to the default descriptor defined in
  `server/default_descriptor.py`.
- `report_format` uses:
  - `0` = bitfield
  - `1` = packed
  - `2` = axis
