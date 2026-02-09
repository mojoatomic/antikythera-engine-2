#!/bin/bash
#
# Antikythera Engine - Raspberry Pi Setup Script
#
# This script installs and configures:
# 1. Comitup - WiFi provisioning with captive portal
# 2. GPIO button handler - Physical reset button
# 3. WiFi window service - 10-minute setup window on boot
# 4. Antikythera systemd service - Main application
#
# Prerequisites:
# - Raspberry Pi 5 with Raspberry Pi OS Bookworm
# - Node.js 18+ installed
# - Antikythera engine cloned to /home/pi/antikythera-engine-2
#
# Usage:
#   sudo ./install.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INSTALL]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root: sudo ./install.sh"
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANTIKYTHERA_DIR="$(dirname "$SCRIPT_DIR")"

log "Antikythera Pi Setup"
log "===================="
log "Script directory: $SCRIPT_DIR"
log "Antikythera directory: $ANTIKYTHERA_DIR"

# Step 1: Add Comitup repository and install
log "Step 1: Installing Comitup..."

# Check if Comitup repo is already added
if ! grep -q "davesteele" /etc/apt/sources.list.d/*.list 2>/dev/null; then
    log "Adding Comitup repository..."

    # Add the Comitup repository key
    curl -fsSL https://davesteele.github.io/comitup/davesteele-comitup.gpg.key | gpg --dearmor -o /usr/share/keyrings/comitup-archive-keyring.gpg

    # Add the repository
    echo "deb [signed-by=/usr/share/keyrings/comitup-archive-keyring.gpg] https://davesteele.github.io/comitup/repo bookworm main" > /etc/apt/sources.list.d/comitup.list

    apt-get update
fi

# Install Comitup
apt-get install -y comitup

# Step 2: Configure Comitup
log "Step 2: Configuring Comitup..."

cp "$SCRIPT_DIR/comitup.conf" /etc/comitup.conf
chmod 644 /etc/comitup.conf

# Remove any WiFi entries from /etc/network/interfaces (Comitup needs full control)
if grep -q "wlan" /etc/network/interfaces 2>/dev/null; then
    warn "Found wlan entries in /etc/network/interfaces"
    warn "Comitup requires NetworkManager to manage WiFi"
    warn "Please manually remove wlan entries from /etc/network/interfaces"
fi

# Step 3: Install GPIO button handler
log "Step 3: Installing GPIO button handler..."

cp "$SCRIPT_DIR/antikythera-gpio-button.py" /usr/local/bin/
chmod 755 /usr/local/bin/antikythera-gpio-button.py

cp "$SCRIPT_DIR/systemd/antikythera-gpio-button.service" /etc/systemd/system/
chmod 644 /etc/systemd/system/antikythera-gpio-button.service

# Step 4: Install WiFi window service
log "Step 4: Installing WiFi window service..."

cp "$SCRIPT_DIR/antikythera-wifi-window.sh" /usr/local/bin/
chmod 755 /usr/local/bin/antikythera-wifi-window.sh

cp "$SCRIPT_DIR/systemd/antikythera-wifi-window.service" /etc/systemd/system/
chmod 644 /etc/systemd/system/antikythera-wifi-window.service

# Step 5: Install Antikythera service
log "Step 5: Installing Antikythera service..."

# Update the service file with correct path if needed
sed "s|/home/pi/antikythera-engine-2|$ANTIKYTHERA_DIR|g" "$SCRIPT_DIR/systemd/antikythera.service" > /etc/systemd/system/antikythera.service
chmod 644 /etc/systemd/system/antikythera.service

# Step 6: Enable services
log "Step 6: Enabling services..."

systemctl daemon-reload
systemctl enable antikythera-gpio-button.service
systemctl enable antikythera-wifi-window.service
systemctl enable antikythera.service
systemctl enable comitup.service

# Step 7: Install npm dependencies
log "Step 7: Installing npm dependencies..."

cd "$ANTIKYTHERA_DIR"
if [ -f "package.json" ]; then
    sudo -u pi npm install --production
else
    warn "package.json not found in $ANTIKYTHERA_DIR"
fi

log ""
log "========================================="
log "Installation complete!"
log "========================================="
log ""
log "Services installed:"
log "  - comitup.service (WiFi provisioning)"
log "  - antikythera-gpio-button.service (reset button)"
log "  - antikythera-wifi-window.service (10-min setup window)"
log "  - antikythera.service (main application)"
log ""
log "Hardware setup:"
log "  - Connect momentary button between GPIO17 and GND"
log "  - Hold button during boot for 3+ seconds to force WiFi setup"
log ""
log "WiFi setup:"
log "  - On first boot, look for 'Antikythera-XXXX' WiFi network"
log "    (XXXX = last 4 hex digits of MAC, unique per device)"
log "  - Password: antikythera"
log "  - Captive portal will open automatically"
log ""
log "To start now (without reboot):"
log "  sudo systemctl start comitup"
log "  sudo systemctl start antikythera"
log ""
log "To check status:"
log "  sudo systemctl status antikythera"
log "  comitup-cli s"
log ""
log "Reboot recommended to test full boot sequence."
