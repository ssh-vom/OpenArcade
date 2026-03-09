# Raspberry Pi Zero 2 W Deployment

OpenArcade is deployed on the Pi as three native `systemd` services:

- `openarcade-gadget.service`: one-shot USB gadget/bootstrap service
- `openarcade-subscriber.service`: BLE scanner, aggregator, and HID writer
- `openarcade-configd.service`: USB serial config daemon on `/dev/ttyGS0`

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
- enables the `dwc2` overlay and loads `libcomposite`

If the installer adds the `dwc2` overlay for the first time, reboot once after install.
