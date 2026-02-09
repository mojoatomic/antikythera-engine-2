#!/bin/bash
#
# Antikythera WiFi Setup Window
#
# Keeps Comitup in hotspot mode for the first 10 minutes after boot,
# allowing WiFi reconfiguration even when a known network is available.
#
# After the window closes, Comitup resumes normal behavior:
# - Connect to known networks if available
# - Fall back to hotspot mode if no networks found
#

set -e

WINDOW_MINUTES=10
FLAG_FILE="/tmp/antikythera-force-hotspot"
LOG_TAG="antikythera-wifi"

log() {
    echo "$1"
    logger -t "$LOG_TAG" "$1"
}

# Check if button forced indefinite hotspot mode
if [ -f "$FLAG_FILE" ]; then
    log "Force hotspot flag detected - skipping timed window (indefinite hotspot)"
    exit 0
fi

log "Starting WiFi setup window (${WINDOW_MINUTES} minutes)"

# Force Comitup into hotspot mode
# This creates the access point regardless of known networks
if command -v comitup-cli &> /dev/null; then
    log "Forcing Comitup hotspot mode"
    comitup-cli hs || true
else
    log "Warning: comitup-cli not found - Comitup may not be installed"
fi

# Calculate end time
END_TIME=$(($(date +%s) + WINDOW_MINUTES * 60))

log "Hotspot will be available until $(date -d @$END_TIME '+%H:%M:%S')"

# Wait for window to expire
# Check every 30 seconds if user has configured a new network
while [ $(date +%s) -lt $END_TIME ]; do
    sleep 30

    # If force flag appeared (button pressed during window), go indefinite
    if [ -f "$FLAG_FILE" ]; then
        log "Force hotspot flag detected during window - going indefinite"
        exit 0
    fi

    # Check if Comitup is now in CONNECTED state (user configured network)
    if command -v comitup-cli &> /dev/null; then
        STATE=$(comitup-cli s 2>/dev/null | grep -i state | awk '{print $2}' || echo "unknown")
        if [ "$STATE" = "CONNECTED" ]; then
            log "Network configured during window - exiting early"
            exit 0
        fi
    fi
done

log "WiFi setup window closed - resuming normal Comitup behavior"

# Tell Comitup to try connecting to known networks
if command -v comitup-cli &> /dev/null; then
    comitup-cli c || true
fi

exit 0
