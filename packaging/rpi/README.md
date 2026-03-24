# Raspberry Pi Zero 2 W Deployment

OpenArcade is deployed on the Pi as four native systemd services:

- openarcade-gadget.service    — one-shot USB gadget setup (dwc2 / HID + CDC + USB Ethernet descriptors)
- openarcade-subscriber.service — async BLE to HID runtime with HID output worker
- openarcade-configd.service   — USB serial configuration service on /dev/ttyGS0
- openarcade-display.service   — I2C SSD1306 status display (module count + Pi temp)

## Install

Run from a Raspberry Pi OS Bookworm shell on the Pi:

    cd /path/to/OpenArcade
    sudo ./packaging/rpi/install-rpi.sh

The installer:
- copies the repo to /opt/openarcade/app
- creates a venv in /opt/openarcade/venv and installs Python deps
- stores persistent config in /var/lib/openarcade/config.json
- installs systemd unit files into /etc/systemd/system and enables them
- enables the dwc2 overlay, enables I2C, and loads libcomposite
- installs and enables SSH + mDNS (avahi-daemon), and sets hostname from `OPENARCADE_HOSTNAME`

If the installer enables dwc2 or I2C for the first time, reboot once after install.

To redeploy after a code update, simply re-run the installer. It will overwrite the
app directory and restart all services cleanly.

## File locations

  App:    /opt/openarcade/app
  Venv:   /opt/openarcade/venv
  Config: /var/lib/openarcade/config.json
  Env:    /etc/openarcade/openarcade.env

## Troubleshooting

### Service status
    systemctl status openarcade-gadget.service
    systemctl status openarcade-subscriber.service
    systemctl status openarcade-configd.service
    systemctl status openarcade-display.service

### SSH over USB
The gadget service creates HID + serial + USB Ethernet functions. On macOS/Linux hosts,
you should see a new USB network interface when the Pi data port is connected. The default
hostname is `thiscoolpi.local` (configured by `OPENARCADE_HOSTNAME` in the env file).

### Live logs
    journalctl -u openarcade-subscriber.service -f
    journalctl -u openarcade-configd.service -f
    journalctl -u openarcade-display.service -f

### Bluetooth not running
The subscriber service requires the Bluetooth stack to be active. If BLE discovery
fails to start, ensure the bluetooth service is running:

    sudo systemctl start bluetooth
    sudo systemctl enable bluetooth

### Stale deployed code
If the Pi is running with old process names (Aggregator, HIDWriter, Subscriber) in
journalctl, the old code is still deployed. Re-run the installer to redeploy:

    sudo ./packaging/rpi/install-rpi.sh

### Config file
The persistent configuration lives at /var/lib/openarcade/config.json.
Both the subscriber and configd services read from and write to this file.
The path is set in /etc/openarcade/openarcade.env via OPENARCADE_CONFIG_PATH.
