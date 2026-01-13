The following set of commands seemed to fix the locating
of the BLE device.
```bash
sudo btmgmt power off
sudo btmgmt le on
sudo btmgmt connectable on
sudo btmgmt discov on
sudo btmgmt power on
sudo btmgmt find
```
