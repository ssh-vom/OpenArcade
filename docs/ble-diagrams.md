# BLE Firmware Diagrams

These diagrams describe the ESP32 BLE firmware in `firmware/esp32`.

## Architecture

```mermaid
flowchart TB
  Host["Parent Hub\nBLE Central"]

  subgraph Firmware["ESP32 Firmware (firmware/esp32)"]
    subgraph Tasks["FreeRTOS Tasks"]
      ControllerTask["controller_task\npolls GPIO + sends notify"]
      NimbleTask["nimble_host_task\nruns NimBLE host"]
    end

    subgraph Input["Input Pipeline"]
      GPIO["GPIO Inputs\nbuttons + joystick"]
      Debounce["debounce.c"]
      ControllerInput["controller_input.c"]
      State["controller_state_t\nbitfield"]
    end

    subgraph BLE["BLE Stack"]
      GAP["gap.c\nadvertise + events"]
      GATT["gatt_svc.c\nOpenArcade service"]
      Nimble["NimBLE host/LL"]
    end

    Display["display.c\nSSD1306 status"]
    NVS["NVS flash"]
  end

  GPIO --> Debounce --> ControllerInput --> State
  ControllerTask --> ControllerInput
  State --> ControllerTask
  ControllerTask -->|notify| GATT
  GAP --> Nimble
  GATT --> Nimble
  Nimble -->|notifications| Host
  NVS --> Nimble
  GAP --> Display
  GATT --> Display
  NimbleTask --> Nimble
```

## State Machine

```mermaid
stateDiagram-v2
  [*] --> Boot
  Boot --> Init : app_main
  Init --> Advertising : on_stack_sync / adv_init
  Advertising --> Advertising : adv complete
  Advertising --> Advertising : connect failed
  Advertising --> Connected : BLE_GAP_EVENT_CONNECT ok
  Connected --> Subscribed : BLE_GAP_EVENT_SUBSCRIBE notify on
  Subscribed --> Notifying : controller_task tick
  Notifying --> Subscribed : notify off
  Connected --> Advertising : disconnect
  Subscribed --> Advertising : disconnect
  Notifying --> Advertising : disconnect
```

## Data Flow (Controller State Notifications)

```mermaid
sequenceDiagram
  participant Hub as Parent Hub (central)
  participant GAP as gap.c
  participant GATT as gatt_svc.c
  participant Task as controller_task
  participant Input as controller_input
  participant GPIO as GPIO

  Hub->>GAP: connect
  Hub->>GAP: subscribe to controller_state
  GAP->>GATT: gatt_svr_subscribe_cb()

  loop every 10 ms
    Task->>Input: controller_input_update()
    Input->>GPIO: gpio_get_level()
    Input-->>Task: controller_state_t
    Task->>GATT: send_button_state_notification(state)
    GATT->>Hub: notification payload
  end
```

## OTA Update Flow (Conceptual)

```mermaid
sequenceDiagram
  participant Updater as OTA Client (Hub/App)
  participant GATT as OTA GATT Service
  participant OTA as OTA Handler
  participant Flash as OTA Slot (Flash)
  participant Boot as Bootloader

  Updater->>GATT: start_ota(version, size)
  GATT->>OTA: ota_begin()
  loop chunked writes
    Updater->>GATT: write_chunk(data)
    GATT->>OTA: ota_write(data)
    OTA->>Flash: write
  end
  Updater->>GATT: finish + checksum
  GATT->>OTA: ota_end()
  OTA->>Boot: set_boot_partition()
  OTA-->>Updater: ack + reboot
  Boot->>Flash: boot new image
  Boot->>OTA: mark valid or rollback
```

## Security Pairing Flow (Conceptual)

```mermaid
sequenceDiagram
  participant Central as Parent Hub (central)
  participant GAP as gap.c
  participant Sec as NimBLE Security
  participant Store as ble_store (NVS)
  participant GATT as gatt_svc.c

  Central->>GAP: connect
  Central->>GAP: pairing request
  GAP->>Sec: start pairing
  Sec->>Central: feature exchange / passkey
  Central->>Sec: confirm
  Sec->>GAP: enable link encryption
  Sec->>Store: store bond keys
  Central->>GATT: subscribe + notify
```

## Power Management Flow (Conceptual)

```mermaid
stateDiagram-v2
  [*] --> Boot
  Boot --> Advertising : stack sync
  Advertising --> Connected : connect
  Connected --> Notifying : subscribe
  Notifying --> Connected : unsubscribe
  Connected --> Advertising : disconnect
  Advertising --> Advertising : adv restart
  Advertising --> LowPower : optional idle timeout
  LowPower --> Advertising : wake (button or timer)
```

## Notes

- OpenArcade BLE service is a 128-bit UUID with a notify-only controller state characteristic.
- `controller_task` polls inputs every 10 ms and sends notifications when subscribed.
- Display state updates occur on boot, subscribe, and disconnect events.
- OTA, security, and power diagrams are reference flows; firmware adds these when handlers and security configuration are implemented.
- Low-power mode is shown as optional and is not currently present in the firmware loop.
