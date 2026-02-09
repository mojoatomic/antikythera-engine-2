# Raspberry Pi WiFi Setup

This directory contains scripts and configuration for deploying Antikythera Engine to a Raspberry Pi 5 with easy WiFi provisioning.

## Features

- **Captive Portal**: On first boot (or when no WiFi is available), the Pi creates a WiFi hotspot. Connect to it and a setup page opens automatically.
- **10-Minute Window**: After every boot, the setup hotspot is available for 10 minutes, even if a known network exists. This allows reconfiguration.
- **Physical Reset Button**: Hold a button during boot for 3+ seconds to force WiFi setup mode (useful when connected to wrong network).
- **Persistent Config**: WiFi credentials are saved and survive reboots.

## Quick Start

### 1. Prerequisites

On your Raspberry Pi 5 running Raspberry Pi OS Bookworm:

```bash
# Install Node.js 18+ (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Clone the repository
cd /home/pi
git clone https://github.com/your-repo/antikythera-engine-2.git
```

### 2. Run the Installer

```bash
cd /home/pi/antikythera-engine-2/pi-setup
sudo ./install.sh
```

### 3. Wire the Reset Button

Connect a momentary push button:
- One leg to **GPIO17** (physical pin 11)
- Other leg to **GND** (physical pin 9 or any ground)

```
┌─────────────────────────────────────┐
│  Raspberry Pi 5 GPIO Header         │
│                                     │
│  (pin 1)  3V3  [ ][ ] 5V   (pin 2)  │
│           SDA  [ ][ ] 5V            │
│           SCL  [ ][ ] GND           │
│        GPIO4   [ ][ ] TXD           │
│           GND  [●][ ] RXD  (pin 10) │
│  (pin 11) GPIO17 [●][ ] GPIO18      │
│              ...                    │
│                                     │
│  ● = Connect button here            │
│      (GPIO17 to GND)                │
└─────────────────────────────────────┘
```

### 4. Reboot

```bash
sudo reboot
```

## Usage

### First-Time Setup

1. Power on the Pi
2. Look for WiFi network: **Antikythera-XXXX** (password: `antikythera`)
   - XXXX = last 4 hex digits of MAC address (e.g., `Antikythera-a3f2`)
   - Each Pi has a unique SSID, useful when multiple devices are nearby
3. Connect with your phone or laptop
4. Captive portal opens automatically (or browse to `http://10.41.0.1`)
5. Select your WiFi network and enter password
6. Pi connects and starts Antikythera Engine

### Changing WiFi Later

**Option A: Use the 10-minute window**
1. Reboot the Pi
2. Within 10 minutes, connect to **Antikythera-XXXX** (your device's SSID)
3. Configure new network

**Option B: Use the reset button**
1. Hold the button while powering on (or during first 5 seconds of boot)
2. Keep holding for 3+ seconds
3. Release - the Pi will stay in setup mode until you configure WiFi

### Checking Status

```bash
# Check Antikythera service
sudo systemctl status antikythera

# Check WiFi/Comitup status
comitup-cli s

# View logs
journalctl -u antikythera -f
journalctl -u comitup -f
```

## File Reference

| File | Installed To | Purpose |
|------|--------------|---------|
| `install.sh` | - | Main installation script |
| `comitup.conf` | `/etc/comitup.conf` | Comitup configuration |
| `antikythera-gpio-button.py` | `/usr/local/bin/` | Button handler script |
| `antikythera-wifi-window.sh` | `/usr/local/bin/` | 10-minute window script |
| `systemd/antikythera.service` | `/etc/systemd/system/` | Main app service |
| `systemd/antikythera-gpio-button.service` | `/etc/systemd/system/` | Button service |
| `systemd/antikythera-wifi-window.service` | `/etc/systemd/system/` | Window service |

## Troubleshooting

### Hotspot doesn't appear
```bash
# Check Comitup status
sudo systemctl status comitup
comitup-cli s

# Force hotspot mode
comitup-cli hs
```

### Can't connect to captive portal
- Try browsing directly to `http://10.41.0.1`
- Check if dnsmasq is running: `sudo systemctl status dnsmasq`

### Button not working
```bash
# Test GPIO manually
cat /sys/class/gpio/gpio17/value
# Should show 1 (released) or 0 (pressed)

# Check button service logs
journalctl -u antikythera-gpio-button
```

### Antikythera not starting
```bash
# Check service status
sudo systemctl status antikythera

# Check logs
journalctl -u antikythera -n 50

# Try starting manually
cd /home/pi/antikythera-engine-2
node server.js
```

## Uninstall

```bash
sudo systemctl stop antikythera antikythera-wifi-window antikythera-gpio-button
sudo systemctl disable antikythera antikythera-wifi-window antikythera-gpio-button
sudo rm /etc/systemd/system/antikythera*.service
sudo rm /usr/local/bin/antikythera-*
sudo apt-get remove comitup
sudo systemctl daemon-reload
```

## How It Works

### Boot Sequence

```
Power On
    │
    ▼
┌───────────────────────────────────┐
│ antikythera-gpio-button.service   │
│ Checks if button is held          │
│ If yes: creates force-hotspot flag│
└───────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────┐
│ comitup.service                   │
│ Starts WiFi provisioning          │
│ Creates hotspot if no network     │
└───────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────┐
│ antikythera-wifi-window.service   │
│ Keeps hotspot active for 10 min   │
│ Even if known network available   │
└───────────────────────────────────┘
    │
    ▼ (after 10 min or config complete)
┌───────────────────────────────────┐
│ antikythera.service               │
│ Starts main application           │
│ Serves on port 3000               │
└───────────────────────────────────┘
```

## Dependencies

- **Comitup**: WiFi provisioning with captive portal ([GitHub](https://github.com/davesteele/comitup))
- **NetworkManager**: Network management (included in Bookworm)
- **Python 3**: For GPIO button handler (included in Raspberry Pi OS)
- **Node.js 18+**: For Antikythera Engine
