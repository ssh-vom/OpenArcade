#!/bin/bash
# bluetooth-setup.sh - Manual Bluetooth LE debug/setup for OpenArcade
set -e

echo "=== Bluetooth rfkill Status ==="
rfkill list bluetooth 2>/dev/null || echo "rfkill not available"

echo ""
echo "=== Unblocking Bluetooth ==="
rfkill unblock bluetooth 2>/dev/null || true

echo ""
echo "=== Ensuring bluetooth service ==="
systemctl enable bluetooth 2>/dev/null || true
systemctl start bluetooth 2>/dev/null || true

echo ""
echo "=== Configuring BLE (btmgmt) ==="
btmgmt power off
btmgmt le on
btmgmt connectable on
btmgmt discov on
btmgmt power on

echo ""
echo "=== Adapter Info ==="
btmgmt info

echo ""
echo "=== Scanning for BLE devices (5 seconds) ==="
timeout 5 btmgmt find || true

echo ""
echo "Bluetooth LE setup complete"
echo "You can now pair your OpenArcade controller"
