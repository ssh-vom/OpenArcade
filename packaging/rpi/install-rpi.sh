#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
INSTALL_ROOT="/opt/openarcade"
APP_DIR="$INSTALL_ROOT/app"
VENV_DIR="$INSTALL_ROOT/venv"
STATE_DIR="/var/lib/openarcade"
ENV_DIR="/etc/openarcade"
ENV_FILE="$ENV_DIR/openarcade.env"
ENV_TEMPLATE_FILE="$SCRIPT_DIR/openarcade.env.example"
ENV_OVERRIDE_FILE="$SCRIPT_DIR/openarcade.env"
MODULES_FILE="/etc/modules-load.d/openarcade-gadget.conf"
SYSTEMD_DIR="/etc/systemd/system"
DEFAULT_HOSTNAME="thiscoolpi"
BOOT_CONFIG=""
REBOOT_REQUIRED=0

SERVICE_NAMES=(
    openarcade-gadget.service
    openarcade-subscriber.service
    openarcade-configd.service
    openarcade-display.service
)

require_root() {
    if [[ "${EUID}" -ne 0 ]]; then
        echo "Run this installer as root."
        exit 1
    fi
}

find_boot_config() {
    local candidate
    for candidate in /boot/firmware/config.txt /boot/config.txt; do
        if [[ -f "$candidate" ]]; then
            BOOT_CONFIG="$candidate"
            return
        fi
    done

    echo "Unable to find Raspberry Pi boot config.txt."
    exit 1
}

ensure_boot_overlay() {
    if grep -Eq '^[[:space:]]*dtoverlay=dwc2([[:space:]]|,|$)' "$BOOT_CONFIG"; then
        return
    fi

    echo "dtoverlay=dwc2" >> "$BOOT_CONFIG"
    REBOOT_REQUIRED=1
}

ensure_i2c_enabled() {
    if grep -Eq '^[[:space:]]*dtparam=i2c_arm=on([[:space:]]|$)' "$BOOT_CONFIG"; then
        return
    fi

    echo "dtparam=i2c_arm=on" >> "$BOOT_CONFIG"
    REBOOT_REQUIRED=1
}

ensure_kernel_modules() {
    mkdir -p "$(dirname "$MODULES_FILE")"
    cat > "$MODULES_FILE" <<'EOF'
libcomposite
EOF
    modprobe libcomposite || true
}

install_os_packages() {
    apt-get update
    apt-get install -y --no-install-recommends \
        avahi-daemon \
        bluez \
        openssh-server \
        python3 \
        python3-pip \
        python3-venv
}

read_hostname_from_env() {
    local hostname_value="$DEFAULT_HOSTNAME"
    local line

    if [[ -f "$ENV_FILE" ]]; then
        while IFS= read -r line; do
            if [[ "$line" == OPENARCADE_HOSTNAME=* ]]; then
                hostname_value="${line#OPENARCADE_HOSTNAME=}"
            fi
        done < "$ENV_FILE"
    fi

    printf '%s' "$hostname_value"
}

ensure_hostname() {
    local desired_hostname
    desired_hostname="$(read_hostname_from_env)"

    if [[ -z "$desired_hostname" ]]; then
        desired_hostname="$DEFAULT_HOSTNAME"
    fi

    if [[ "$(hostnamectl --static)" == "$desired_hostname" ]]; then
        return
    fi

    hostnamectl set-hostname "$desired_hostname"
}

ensure_base_services() {
    systemctl enable avahi-daemon ssh
    systemctl restart avahi-daemon ssh
}

copy_repo_tree() {
    rm -rf "$APP_DIR"
    mkdir -p "$APP_DIR"

    tar \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='__pycache__' \
        --exclude='.pytest_cache' \
        --exclude='.DS_Store' \
        -C "$REPO_ROOT" \
        -cf - \
        . | tar -C "$APP_DIR" -xf -

    chmod +x "$APP_DIR/firmware/rpi/hidscript.sh"
    chmod +x "$APP_DIR/packaging/rpi/install-rpi.sh"
}

setup_python_env() {
    rm -rf "$VENV_DIR"
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install --upgrade pip
    "$VENV_DIR/bin/pip" install -r "$APP_DIR/packaging/rpi/requirements.txt"
}

setup_state_dir() {
    mkdir -p "$STATE_DIR"

    if [[ ! -f "$STATE_DIR/config.json" && -f "$REPO_ROOT/server/config.json" ]]; then
        install -m 0644 "$REPO_ROOT/server/config.json" "$STATE_DIR/config.json"
    fi
}

install_env_file() {
    local source_env_file

    mkdir -p "$ENV_DIR"

    if [[ -f "$ENV_OVERRIDE_FILE" ]]; then
        source_env_file="$ENV_OVERRIDE_FILE"
    elif [[ -f "$ENV_TEMPLATE_FILE" ]]; then
        source_env_file="$ENV_TEMPLATE_FILE"
    else
        echo "Missing env source file. Expected $ENV_OVERRIDE_FILE or $ENV_TEMPLATE_FILE."
        exit 1
    fi

    install -m 0644 "$source_env_file" "$ENV_FILE"
}

install_systemd_units() {
    local unit
    for unit in "${SERVICE_NAMES[@]}"; do
        install -m 0644 "$SCRIPT_DIR/systemd/$unit" "$SYSTEMD_DIR/$unit"
    done

    systemctl daemon-reload
    systemctl enable "${SERVICE_NAMES[@]}"
}

udc_available() {
    compgen -G "/sys/class/udc/*" > /dev/null
}

start_services_if_ready() {
    if [[ "$REBOOT_REQUIRED" -eq 1 ]]; then
        echo "A reboot is required before OpenArcade can start all services."
        return
    fi

    if ! udc_available; then
        echo "No USB Device Controller detected yet. Reboot the Pi, then the services will start on boot."
        return
    fi

    systemctl restart openarcade-gadget.service
    systemctl restart openarcade-configd.service
    systemctl restart openarcade-subscriber.service
    systemctl restart openarcade-display.service
}

print_summary() {
    cat <<EOF
OpenArcade has been installed to:
  App:   $APP_DIR
  Venv:  $VENV_DIR
  State: $STATE_DIR

Service status commands:
  systemctl status openarcade-gadget.service
  systemctl status openarcade-subscriber.service
  systemctl status openarcade-configd.service
  systemctl status openarcade-display.service

Log commands:
  journalctl -u openarcade-gadget.service -f
  journalctl -u openarcade-subscriber.service -f
  journalctl -u openarcade-configd.service -f
  journalctl -u openarcade-display.service -f
EOF

    if [[ "$REBOOT_REQUIRED" -eq 1 ]]; then
        echo
        echo "Reboot the Pi to activate the dwc2 overlay and I2C interface, then reconnect the USB data port."
    fi
}

main() {
    require_root
    find_boot_config
    ensure_boot_overlay
    ensure_i2c_enabled
    ensure_kernel_modules
    install_os_packages
    copy_repo_tree
    setup_python_env
    setup_state_dir
    install_env_file
    ensure_hostname
    install_systemd_units
    ensure_base_services
    start_services_if_ready
    print_summary
}

main "$@"
