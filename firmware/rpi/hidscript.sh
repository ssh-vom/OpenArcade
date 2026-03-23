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

    # Unlink HID function from config before removing
    if [ -L "$GADGET_DIR/configs/c.1/hid.usb0" ]; then
        rm "$GADGET_DIR/configs/c.1/hid.usb0" || true
    fi

    # Unlink ACM function from config before removing
    if [ -L "$GADGET_DIR/configs/c.1/acm.usb0" ]; then
        rm "$GADGET_DIR/configs/c.1/acm.usb0" || true
    fi

    # Unlink ECM function from config before removing
    if [ -L "$GADGET_DIR/configs/c.1/ecm.usb0" ]; then
        rm "$GADGET_DIR/configs/c.1/ecm.usb0" || true
    fi

    # Remove HID function if it exists
    if [ -d "$GADGET_DIR/functions/hid.usb0" ]; then
        rmdir "$GADGET_DIR/functions/hid.usb0" || true
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
echo "OpenArcade Composite Gadget" > strings/0x409/product

mkdir -p configs/c.1/strings/0x409
echo "Config 1: HID" > configs/c.1/strings/0x409/configuration
echo 250 > configs/c.1/MaxPower

# ------------------------------------------------------------
# 3. Create HID function
# ------------------------------------------------------------
mkdir -p functions/hid.usb0
echo 1 > functions/hid.usb0/protocol
echo 1 > functions/hid.usb0/subclass
echo 8 > functions/hid.usb0/report_length

echo -ne \
'\x05\x01\x09\x06\xa1\x01\x05\x07\x19\xe0\x29\xe7\x15\x00\x25\x01'\
'\x75\x01\x95\x08\x81\x02\x95\x01\x75\x08\x81\x03\x95\x05\x75\x01'\
'\x05\x08\x19\x01\x29\x05\x91\x02\x95\x01\x75\x03\x91\x03\x95\x06'\
'\x75\x08\x15\x00\x25\x65\x05\x07\x19\x00\x29\x65\x81\x00\xc0' \
> functions/hid.usb0/report_desc

ln -s functions/hid.usb0 configs/c.1/

# ------------------------------------------------------------
# 4. Create ACM (WebSerial) function
# ------------------------------------------------------------
mkdir -p functions/acm.usb0
ln -s functions/acm.usb0 configs/c.1/

# ------------------------------------------------------------
# 5. Create ECM (USB network) function
# ------------------------------------------------------------
mkdir -p functions/ecm.usb0
echo "$USB_HOST_ADDR" > functions/ecm.usb0/host_addr
echo "$USB_DEV_ADDR" > functions/ecm.usb0/dev_addr
ln -s functions/ecm.usb0 configs/c.1/

# ------------------------------------------------------------
# 6. Enable gadget
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
