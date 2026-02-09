#!/usr/bin/env python3
"""
Antikythera WiFi Reset Button Handler

Monitors a GPIO button during boot. If held for 3+ seconds,
forces Comitup into hotspot mode for WiFi reconfiguration.

Hardware:
  - Momentary push button between GPIO17 and GND
  - Uses internal pull-up resistor (button press = LOW)

Usage:
  Run at boot via systemd before Comitup starts.
  If button is held, creates flag file that signals hotspot mode.
"""

import os
import sys
import time
import subprocess

# Configuration
GPIO_PIN = 17           # BCM pin number
HOLD_TIME = 3.0         # Seconds button must be held
FLAG_FILE = "/tmp/antikythera-force-hotspot"
COMITUP_HOTSPOT_CMD = ["comitup-cli", "hs"]

def setup_gpio():
    """Configure GPIO pin with pull-up resistor."""
    gpio_path = f"/sys/class/gpio/gpio{GPIO_PIN}"

    # Export pin if not already exported
    if not os.path.exists(gpio_path):
        with open("/sys/class/gpio/export", "w") as f:
            f.write(str(GPIO_PIN))
        time.sleep(0.1)  # Wait for export

    # Set as input
    with open(f"{gpio_path}/direction", "w") as f:
        f.write("in")

    return gpio_path

def read_gpio(gpio_path):
    """Read GPIO pin value. Returns True if button pressed (LOW)."""
    with open(f"{gpio_path}/value", "r") as f:
        value = f.read().strip()
    return value == "0"  # Button pressed pulls to ground

def cleanup_gpio():
    """Unexport GPIO pin."""
    try:
        with open("/sys/class/gpio/unexport", "w") as f:
            f.write(str(GPIO_PIN))
    except:
        pass

def force_hotspot_mode():
    """Create flag file and trigger Comitup hotspot mode."""
    print("Button held - forcing WiFi setup mode")

    # Create flag file (can be checked by other services)
    with open(FLAG_FILE, "w") as f:
        f.write(str(time.time()))

    # If Comitup is already running, force hotspot mode
    try:
        subprocess.run(COMITUP_HOTSPOT_CMD, timeout=5)
    except (subprocess.TimeoutExpired, FileNotFoundError):
        # Comitup may not be running yet, flag file is enough
        pass

    print(f"Flag file created: {FLAG_FILE}")
    print("Hotspot mode will be forced on boot")

def main():
    print(f"Antikythera GPIO Button Handler")
    print(f"Monitoring GPIO{GPIO_PIN} - hold for {HOLD_TIME}s to force WiFi setup")

    try:
        gpio_path = setup_gpio()
    except PermissionError:
        print("Error: Need root permissions for GPIO access")
        print("Run with: sudo python3 antikythera-gpio-button.py")
        sys.exit(1)
    except Exception as e:
        print(f"Error setting up GPIO: {e}")
        sys.exit(1)

    try:
        # Check if button is currently pressed
        if not read_gpio(gpio_path):
            print("Button not pressed - normal boot")
            sys.exit(0)

        print("Button pressed - waiting for hold...")
        start_time = time.time()

        # Wait for button to be held for HOLD_TIME seconds
        while read_gpio(gpio_path):
            elapsed = time.time() - start_time
            if elapsed >= HOLD_TIME:
                force_hotspot_mode()
                sys.exit(0)
            time.sleep(0.1)

        # Button released before hold time
        elapsed = time.time() - start_time
        print(f"Button released after {elapsed:.1f}s - normal boot")
        sys.exit(0)

    finally:
        cleanup_gpio()

if __name__ == "__main__":
    main()
