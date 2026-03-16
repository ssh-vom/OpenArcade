# Raspberry Pi Zero 2 W Deployment

OpenArcade is deployed on the Pi as four native `systemd` services:

- `openarcade-gadget.service`: one-shot USB gadget/bootstrap service
- `openarcade-subscriber.service`: async BLE runtime plus HID output worker
- `openarcade-configd.service`: USB serial config service on `/dev/ttyGS0`
- `openarcade-display.service`: I2C SSD1306 status display for module count and Pi temperature

Install from a Raspberry Pi OS Bookworm shell on the Pi:

```bash
cd /path/to/OpenArcade
sudo ./packaging/rpi/install-rpi.sh
```

The installer:

- copies the repo to `/opt/openarcade/app`
- creates a venv in `/opt/openarcade/venv`
- stores persistent config in `/var/lib/openarcade/config.json`
- installs the `systemd` unit files into `/etc/systemd/system`
- enables the `dwc2` overlay, enables I2C, and loads `libcomposite`

If the installer enables `dwc2` or I2C for the first time, reboot once after install.
