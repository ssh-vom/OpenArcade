#!/bin/bash
set -e
set -u

GADGET_DIR="/sys/kernel/config/usb_gadget/openarcade"

USB_HOST_ADDR="02:12:34:56:78:9a"
USB_DEV_ADDR="02:12:34:56:78:9b"
USB_IPV4_ADDR="169.254.64.64/16"

echo "[*] Setting up USB HID gadget..."

cd /sys/kernel/config/usb_gadget/

# ------------------------------------------------------------
# 1. Cleanly remove previous gadget if it exists
# ------------------------------------------------------------
if [ -d "$GADGET_DIR" ]; then
    echo "[*] Removing existing gadget configuration..."

    # Unbind from UDC if bound
    if [ -f "$GADGET_DIR/UDC" ]; then
        echo "" > "$GADGET_DIR/UDC" || true
    fi

    # Unlink HID functions from config before removing
    if [ -L "$GADGET_DIR/configs/c.1/hid.usb0" ]; then
        rm "$GADGET_DIR/configs/c.1/hid.usb0" || true
    fi
    if [ -L "$GADGET_DIR/configs/c.1/hid.usb1" ]; then
        rm "$GADGET_DIR/configs/c.1/hid.usb1" || true
    fi

    # Unlink ACM function from config before removing
    if [ -L "$GADGET_DIR/configs/c.1/acm.usb0" ]; then
        rm "$GADGET_DIR/configs/c.1/acm.usb0" || true
    fi

    # Unlink ECM function from config before removing
    if [ -L "$GADGET_DIR/configs/c.1/ecm.usb0" ]; then
        rm "$GADGET_DIR/configs/c.1/ecm.usb0" || true
    fi

    # Remove HID functions if they exist
    if [ -d "$GADGET_DIR/functions/hid.usb0" ]; then
        rmdir "$GADGET_DIR/functions/hid.usb0" || true
    fi
    if [ -d "$GADGET_DIR/functions/hid.usb1" ]; then
        rmdir "$GADGET_DIR/functions/hid.usb1" || true
    fi

    # Remove ACM function if it exists
    if [ -d "$GADGET_DIR/functions/acm.usb0" ]; then
        rmdir "$GADGET_DIR/functions/acm.usb0" || true
    fi

    # Remove ECM function if it exists
    if [ -d "$GADGET_DIR/functions/ecm.usb0" ]; then
        rmdir "$GADGET_DIR/functions/ecm.usb0" || true
    fi

    # Finally remove the gadget directory
    rmdir --ignore-fail-on-non-empty "$GADGET_DIR" 2>/dev/null || true
    rm -rf "$GADGET_DIR" 2>/dev/null || true
fi

# ------------------------------------------------------------
# 2. Create new gadget
# ------------------------------------------------------------
mkdir -p "$GADGET_DIR"
cd "$GADGET_DIR"

echo 0x1d6b > idVendor      # Linux Foundation
echo 0x0104 > idProduct     # HID Composite Gadget
echo 0x0100 > bcdDevice     # v1.0.0
echo 0x0200 > bcdUSB        # USB 2.0

mkdir -p strings/0x409
echo "fedcba9876544210" > strings/0x409/serialnumber
echo "OpenArcade" > strings/0x409/manufacturer
echo "OpenArcade Multi-Function Gadget" > strings/0x409/product

mkdir -p configs/c.1/strings/0x409
echo "Config 1: HID Keyboard + Gamepad" > configs/c.1/strings/0x409/configuration
echo 250 > configs/c.1/MaxPower

# ------------------------------------------------------------
# 3. Create HID Keyboard function (hid.usb0)
# ------------------------------------------------------------
mkdir -p functions/hid.usb0
echo 1 > functions/hid.usb0/protocol
echo 1 > functions/hid.usb0/subclass
echo 8 > functions/hid.usb0/report_length

# Standard boot keyboard descriptor
echo -ne \
'\x05\x01\x09\x06\xa1\x01\x05\x07\x19\xe0\x29\xe7\x15\x00\x25\x01'\
'\x75\x01\x95\x08\x81\x02\x95\x01\x75\x08\x81\x03\x95\x05\x75\x01'\
'\x05\x08\x19\x01\x29\x05\x91\x02\x95\x01\x75\x03\x91\x03\x95\x06'\
'\x75\x08\x15\x00\x25\x65\x05\x07\x19\x00\x29\x65\x81\x00\xc0' \
> functions/hid.usb0/report_desc

ln -s functions/hid.usb0 configs/c.1/

# ------------------------------------------------------------
# 4. Create HID Gamepad function (hid.usb1)
# ------------------------------------------------------------
mkdir -p functions/hid.usb1
echo 0 > functions/hid.usb1/protocol  # 0 = None (not boot protocol)
echo 0 > functions/hid.usb1/subclass  # 0 = None
echo 8 > functions/hid.usb1/report_length

# Generic gamepad descriptor (8 bytes)
# Byte 0-1: Buttons (16 bits)
# Byte 2: HAT/D-Pad (4 bits, 0-7 = directions, 15 = center)
# Byte 3-6: Axes (Left X, Left Y, Right X, Right Y - centered at 0x80)
# Byte 7: Reserved
echo -ne \
'\x05\x01'\          # Usage Page (Generic Desktop)
'\x09\x05'\          # Usage (Game Pad)
'\xa1\x01'\          # Collection (Application)
'\x05\x09'\          #   Usage Page (Button)
'\x19\x01'\          #   Usage Minimum (Button 1)
'\x29\x10'\          #   Usage Maximum (Button 16)
'\x15\x00'\          #   Logical Minimum (0)
'\x25\x01'\          #   Logical Maximum (1)
'\x75\x01'\          #   Report Size (1)
'\x95\x10'\          #   Report Count (16)
'\x81\x02'\          #   Input (Data,Var,Abs)
'\x05\x01'\          #   Usage Page (Generic Desktop)
'\x09\x39'\          #   Usage (Hat switch)
'\x15\x00'\          #   Logical Minimum (0)
'\x25\x07'\          #   Logical Maximum (7)
'\x35\x00'\          #   Physical Minimum (0)
'\x46\x3b\x01'\      #   Physical Maximum (315)
'\x65\x14'\          #   Unit (Degrees)
'\x75\x04'\          #   Report Size (4)
'\x95\x01'\          #   Report Count (1)
'\x81\x42'\          #   Input (Data,Var,Abs,Null)
'\x75\x04'\          #   Report Size (4)
'\x95\x01'\          #   Report Count (1)
'\x81\x01'\          #   Input (Const) - padding
'\x09\x30'\          #   Usage (X)
'\x09\x31'\          #   Usage (Y)
'\x09\x32'\          #   Usage (Z)
'\x09\x35'\          #   Usage (Rz)
'\x15\x00'\          #   Logical Minimum (0)
'\x26\xff\x00'\      #   Logical Maximum (255)
'\x75\x08'\          #   Report Size (8)
'\x95\x04'\          #   Report Count (4)
'\x81\x02'\          #   Input (Data,Var,Abs)
'\x75\x08'\          #   Report Size (8)
'\x95\x01'\          #   Report Count (1)
'\x81\x01'\          #   Input (Const) - reserved byte
'\xc0'\              # End Collection
> functions/hid.usb1/report_desc

ln -s functions/hid.usb1 configs/c.1/

# ------------------------------------------------------------
# 5. Create ACM (WebSerial) function
# ------------------------------------------------------------
mkdir -p functions/acm.usb0
ln -s functions/acm.usb0 configs/c.1/

# ------------------------------------------------------------
# 6. Create ECM (USB network) function
# ------------------------------------------------------------
mkdir -p functions/ecm.usb0
echo "$USB_HOST_ADDR" > functions/ecm.usb0/host_addr
echo "$USB_DEV_ADDR" > functions/ecm.usb0/dev_addr
ln -s functions/ecm.usb0 configs/c.1/

# ------------------------------------------------------------
# 7. Enable gadget
# ------------------------------------------------------------
UDC_NAME=$(ls /sys/class/udc | head -n 1 || true)
if [ -z "$UDC_NAME" ]; then
    echo "[!] No UDC found. Is dwc2 loaded and overlay enabled?"
    exit 1
fi

echo "[*] Binding to UDC: $UDC_NAME"
echo "$UDC_NAME" > UDC

# Bring up usb0 for SSH over USB and mDNS resolution.
if ip link show usb0 >/dev/null 2>&1; then
    ip link set usb0 up || true

    if ! ip -4 addr show dev usb0 | grep -q "$USB_IPV4_ADDR"; then
        ip addr add "$USB_IPV4_ADDR" dev usb0 || true
    fi
fi

echo "[✓] USB HID gadget setup complete!"
echo "    - Keyboard HID: /dev/hidg0"
echo "    - Gamepad HID: /dev/hidg1"
