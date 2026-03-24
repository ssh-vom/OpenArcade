
<p align="center">
  <img
    src="https://github.com/user-attachments/assets/42083eba-2d45-4d57-94b3-cff34984d5ac"
    alt="OpenArcade logo"
    width="100"
    height="100"
  />
</p>

<h1 align="center">OpenArcade</h1>

<p align="center">
  <em>Made how you play.</em>
</p>
</div>


## What is it?

A modular game controller designed for accessibility. Build your own layout from separate modules or snap them together—play from your lap, a table, or wherever works for you.

Standard controllers assume one-size-fits-all. OpenArcade doesn't.

## How it works

OpenArcade breaks a controller into pieces:

- **Child modules** – Buttons, joysticks, D-pads in their own housings
- **Parent module** – Central hub that connects to your PC or console

Wire the modules together or use them independently. Arrange them however's comfortable for you—spread out on a table, held in different hands, mounted wherever works.

## Architecture

```
┌─────────────┐     BLE      ┌──────────────┐     USB/Bluetooth     ┌──────────┐
│  Child      │ ◄──────────► │  Parent Hub  │ ◄───────────────────► │  Game    │
│  Module(s)  │  (ESP32)     │  (RPi Zero)  │  (HID emulation)      │  Console │
└─────────────┘              └──────────────┘                       └──────────┘
```

Each child module (ESP32) broadcasts its inputs over Bluetooth. The parent hub (Raspberry Pi Zero 2 W) subscribes to all modules, aggregates the inputs, and presents itself as a standard game controller to your computer or console.

## Project structure

```
├── firmware/esp32/          # Child module firmware (NimBLE GATT server)
├── server/                  # Parent hub BLE client (Python + bleak)
├── configurator/            # 3D controller layout designer
└── Deliverables/            # System design docs, hazard analysis, etc.
```

## Getting started

### Hardware requirements

- **Parent hub:** Raspberry Pi Zero 2 W
- **Child modules:** ESP32 development boards
- **Inputs:** Arcade buttons, joysticks (Sanwa/Seimitsu compatible)
- **Power:** USB-C or battery pack
- **Housing:** 3D printed (see CAD files in documentation)

### Flash the child modules

```bash
cd firmware/esp32
idf.py set-target esp32
idf.py -p /dev/ttyUSB0 flash monitor
```

The module will start advertising as "OpenArcade-XX" over BLE.

### Run the parent hub

```bash
cd server
uv run runtime_main.py
```

The Pi will run the async BLE runtime, subscribe to module notifications, and output the aggregated controller state.

### Install as boot services on Raspberry Pi Zero 2 W

```bash
sudo ./packaging/rpi/install-rpi.sh
```

This installs OpenArcade under `/opt/openarcade`, stores persistent config in
`/var/lib/openarcade/config.json`, and enables three `systemd` services for the
USB gadget setup, the BLE/HID runtime, and the serial config service.

### Design your layout

Open the 3D configurator to visualize module arrangements and plan your controller setup.

## Tech stack

| Layer | Technology |
|-------|------------|
| Child firmware | ESP-IDF, NimBLE, C |
| Parent hub | Python, asyncio, bleak |
| Configurator | Three.js, React |
| PCB design | KiCad |
| CAD | Autodesk Inventor |
| 3D printing | Bambu Studio / PrusaSlicer |

## License

See individual component licenses.
