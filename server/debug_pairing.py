#!/usr/bin/env python3
"""
Debug script for pairing mode implementation.
Run this on the Pi to verify the implementation is working.
"""

import sys
import os

# Add server directory to path
sys.path.insert(0, "/opt/openarcade/app/server")

def test_pairing_state():
    """Test pairing state file operations."""
    print("\n=== Testing PairingModeState ===")
    try:
        from pairing_mode_state import PairingModeState
        
        state = PairingModeState()
        print(f"State file path: {state.path}")
        print(f"File exists: {os.path.exists(state.path)}")
        
        current = state.load()
        print(f"Current state: {current}")
        
        # Test toggle
        new_state = state.toggle(source="debug")
        print(f"After toggle: {new_state}")
        
        # Toggle back
        final_state = state.toggle(source="debug")
        print(f"After second toggle: {final_state}")
        
        print("✓ PairingModeState works correctly")
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_runtime_ipc():
    """Test IPC communication with runtime."""
    print("\n=== Testing Runtime IPC ===")
    try:
        from runtime_ipc import get_pairing_status, resolve_runtime_socket_path
        
        socket_path = resolve_runtime_socket_path()
        print(f"Socket path: {socket_path}")
        print(f"Socket exists: {os.path.exists(socket_path)}")
        
        status = get_pairing_status()
        if status is None:
            print("✗ get_pairing_status returned None (runtime not responding)")
            print("  Make sure openarcade-subscriber service is running:")
            print("  sudo systemctl status openarcade-subscriber")
            return False
        else:
            print(f"Pairing status: {status}")
            print("✓ Runtime IPC works correctly")
            return True
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_gpio_config():
    """Test GPIO configuration."""
    print("\n=== Testing GPIO Configuration ===")
    try:
        from gpio_service import (
            get_hid_mode_button_pin,
            get_pairing_mode_button_pin,
            get_hid_mode_hold_seconds,
            get_pairing_mode_hold_seconds,
        )
        
        hid_pin = get_hid_mode_button_pin()
        pairing_pin = get_pairing_mode_button_pin()
        hid_hold = get_hid_mode_hold_seconds()
        pairing_hold = get_pairing_mode_hold_seconds()
        
        print(f"HID mode pin: GPIO{hid_pin} (hold {hid_hold}s)")
        print(f"Pairing mode pin: GPIO{pairing_pin} (hold {pairing_hold}s)")
        
        if hid_pin == pairing_pin:
            print("✗ ERROR: HID and pairing pins are the same!")
            return False
        
        print("✓ GPIO configuration is valid")
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def check_services():
    """Check service status."""
    print("\n=== Checking Service Status ===")
    import subprocess
    
    services = [
        "openarcade-subscriber",
        "openarcade-gpio", 
        "openarcade-display"
    ]
    
    for service in services:
        try:
            result = subprocess.run(
                ["systemctl", "is-active", service],
                capture_output=True,
                text=True
            )
            status = result.stdout.strip()
            if status == "active":
                print(f"✓ {service}: {status}")
            else:
                print(f"✗ {service}: {status}")
        except Exception as e:
            print(f"? {service}: error checking ({e})")


def check_state_files():
    """Check state files exist and are readable."""
    print("\n=== Checking State Files ===")
    
    files = [
        "/var/lib/openarcade/hid_mode.json",
        "/var/lib/openarcade/pairing_mode.json",
    ]
    
    for filepath in files:
        if os.path.exists(filepath):
            try:
                with open(filepath) as f:
                    import json
                    content = json.load(f)
                print(f"✓ {filepath}")
                print(f"  {content}")
            except Exception as e:
                print(f"✗ {filepath}: {e}")
        else:
            print(f"✗ {filepath}: does not exist")


def main():
    print("=" * 50)
    print("OpenArcade Pairing Mode Debug")
    print("=" * 50)
    
    check_state_files()
    check_services()
    test_gpio_config()
    test_pairing_state()
    test_runtime_ipc()
    
    print("\n" + "=" * 50)
    print("Debug complete")
    print("=" * 50)


if __name__ == "__main__":
    main()
