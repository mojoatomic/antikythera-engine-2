#!/bin/bash
# Integration test for configuration system
# Tests config loading, layering, hot reload, and location resolution

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_DIR="$PROJECT_ROOT/config"
TEST_CONFIG="$CONFIG_DIR/settings.local.json"
BACKUP_CONFIG="$CONFIG_DIR/settings.local.json.backup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_test() {
    echo -e "\n${YELLOW}TEST:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

print_failure() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

cleanup() {
    print_header "Cleaning Up"
    
    # Stop server if running
    if [ ! -z "$SERVER_PID" ]; then
        print_info "Stopping server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
    
    # Restore original state
    if [ "$CONFIG_EXISTED_BEFORE" = true ]; then
        if [ -f "$BACKUP_CONFIG" ]; then
            print_info "Restoring original config..."
            mv "$BACKUP_CONFIG" "$TEST_CONFIG"
        else
            print_info "Warning: Backup was expected but not found"
        fi
    else
        # Config didn't exist before - remove any test config
        if [ -f "$TEST_CONFIG" ]; then
            print_info "Removing test config (none existed before tests)..."
            rm "$TEST_CONFIG"
        fi
        # Also remove backup if it somehow exists
        rm -f "$BACKUP_CONFIG" 2>/dev/null || true
    fi
    
    # Remove any test artifacts
    rm -f "$CONFIG_DIR/settings.custom.json" 2>/dev/null || true
    
    print_info "Cleanup complete"
}

# Trap to ensure cleanup runs
trap cleanup EXIT INT TERM

wait_for_server() {
    print_info "Waiting for server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/api/settings > /dev/null 2>&1; then
            print_success "Server is ready"
            return 0
        fi
        sleep 0.5
    done
    print_failure "Server failed to start within 15 seconds"
    return 1
}

start_server() {
    print_info "Starting server in background..."
    cd "$PROJECT_ROOT"
    npm start > /tmp/antikythera-test-server.log 2>&1 &
    SERVER_PID=$!
    print_info "Server started (PID: $SERVER_PID)"
    
    if ! wait_for_server; then
        print_failure "Could not start server"
        cat /tmp/antikythera-test-server.log
        exit 1
    fi
}

stop_server() {
    if [ ! -z "$SERVER_PID" ]; then
        print_info "Stopping server..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
        SERVER_PID=""
        sleep 1
    fi
}

test_api_endpoint() {
    local endpoint=$1
    local expected_field=$2
    local description=$3
    
    print_test "$description"
    
    local response=$(curl -s "http://localhost:3000$endpoint")
    
    if echo "$response" | grep -q "$expected_field"; then
        print_success "Response contains expected field: $expected_field"
        return 0
    else
        print_failure "Response missing expected field: $expected_field"
        echo "Response: $response"
        return 1
    fi
}

# ============================================================================
# MAIN TEST SUITE
# ============================================================================

print_header "Configuration System Integration Tests"
print_info "Project: $PROJECT_ROOT"
print_info "Config dir: $CONFIG_DIR"

cd "$PROJECT_ROOT"

# Remember if config existed before tests
CONFIG_EXISTED_BEFORE=false
if [ -f "$TEST_CONFIG" ]; then
    CONFIG_EXISTED_BEFORE=true
    print_info "Backing up existing config..."
    cp "$TEST_CONFIG" "$BACKUP_CONFIG"
fi

# ============================================================================
print_header "Test 1: Default Config (No Local Override)"
# ============================================================================

print_test "Remove local config to test defaults"
rm -f "$TEST_CONFIG"

start_server

test_api_endpoint "/api/settings" "\"language\"" "API settings endpoint responds"
test_api_endpoint "/api/language" "\"language\"" "API language endpoint responds"
test_api_endpoint "/api/display" "\"observer\"" "API display includes observer"

print_test "Check observer mode is 'auto' (default)"
OBSERVER_MODE=$(curl -s http://localhost:3000/api/display | grep -o '"source":"[^"]*"' | head -1)
if echo "$OBSERVER_MODE" | grep -q "ip_geolocation\|fallback"; then
    print_success "Observer using auto mode (IP geolocation or fallback)"
else
    print_failure "Observer mode unexpected: $OBSERVER_MODE"
fi

stop_server

# ============================================================================
print_header "Test 2: Manual Observer Mode via Config"
# ============================================================================

print_test "Create local config with manual observer"
cat > "$TEST_CONFIG" << 'EOF'
{
  "observer": {
    "mode": "manual",
    "location": {
      "latitude": 29.9792,
      "longitude": 31.1342,
      "timezone": "Africa/Cairo",
      "elevation": 60,
      "name": "Giza Plateau"
    }
  }
}
EOF
print_success "Created settings.local.json with manual mode"

start_server

test_api_endpoint "/api/display" "\"observer\"" "API display includes observer"

print_test "Check observer location matches config (Giza)"
RESPONSE=$(curl -s http://localhost:3000/api/display)
LAT=$(echo "$RESPONSE" | jq -r '.system.observer.latitude')
LON=$(echo "$RESPONSE" | jq -r '.system.observer.longitude')

if [ ! -z "$LAT" ] && [ ! -z "$LON" ]; then
    # Check if latitude is close to 29.9792 (allowing some float precision)
    if awk "BEGIN {exit !($LAT > 29.97 && $LAT < 29.99)}"; then
        print_success "Observer latitude matches config (~29.98°)"
    else
        print_failure "Observer latitude mismatch: got $LAT, expected ~29.98"
    fi
    
    # Check if longitude is close to 31.1342
    if awk "BEGIN {exit !($LON > 31.13 && $LON < 31.14)}"; then
        print_success "Observer longitude matches config (~31.13°)"
    else
        print_failure "Observer longitude mismatch: got $LON, expected ~31.13"
    fi
else
    print_failure "Could not extract coordinates from response"
    echo "Response: $RESPONSE"
fi

print_test "Check observer source is manual (not IP geo)"
SOURCE=$(echo "$RESPONSE" | jq -r '.system.observer.source')
if [ "$SOURCE" = "manual" ] || [ "$SOURCE" = "config" ]; then
    print_success "Observer source indicates manual config: $SOURCE"
else
    print_failure "Observer source unexpected: $SOURCE (expected 'manual' or 'config')"
fi

stop_server

# ============================================================================
print_header "Test 3: Config Layering (Local + Display Settings)"
# ============================================================================

print_test "Update config with display settings"
cat > "$TEST_CONFIG" << 'EOF'
{
  "observer": {
    "mode": "auto"
  },
  "display": {
    "language": "greek",
    "showSunriseSunset": false
  }
}
EOF
print_success "Updated config with display preferences"

start_server

print_test "Check language setting from config"
LANG_RESPONSE=$(curl -s http://localhost:3000/api/language)
if echo "$LANG_RESPONSE" | grep -q '"language":"greek"'; then
    print_success "Language setting loaded from config: greek"
else
    print_failure "Language setting not applied"
    echo "Response: $LANG_RESPONSE"
fi

print_test "Check showSunriseSunset setting from config"
SETTINGS_RESPONSE=$(curl -s http://localhost:3000/api/settings)
if echo "$SETTINGS_RESPONSE" | grep -q '"showSunriseSunset":false'; then
    print_success "showSunriseSunset setting loaded from config: false"
else
    print_failure "showSunriseSunset setting not applied"
    echo "Response: $SETTINGS_RESPONSE"
fi

stop_server

# ============================================================================
print_header "Test 4: Hot Reload"
# ============================================================================

print_test "Start server with auto mode"
cat > "$TEST_CONFIG" << 'EOF'
{
  "observer": {
    "mode": "auto"
  },
  "display": {
    "language": "english"
  }
}
EOF

start_server

print_test "Verify initial language is 'english'"
LANG_BEFORE=$(curl -s http://localhost:3000/api/language)
if echo "$LANG_BEFORE" | grep -q '"language":"english"'; then
    print_success "Initial language: english"
else
    print_failure "Initial language check failed"
fi

print_test "Update config file (trigger hot reload)"
cat > "$TEST_CONFIG" << 'EOF'
{
  "observer": {
    "mode": "auto"
  },
  "display": {
    "language": "greek"
  }
}
EOF
print_success "Config file updated with new language"

print_info "Waiting 2 seconds for hot reload to process..."
sleep 2

print_test "Verify language changed to 'greek' (hot reload worked)"
LANG_AFTER=$(curl -s http://localhost:3000/api/language)
if echo "$LANG_AFTER" | grep -q '"language":"greek"'; then
    print_success "Hot reload successful - language changed to greek"
else
    print_failure "Hot reload failed - language still: $LANG_AFTER"
fi

stop_server

# ============================================================================
print_header "Test 5: Query Parameter Override"
# ============================================================================

print_test "Start server with manual config (Athens)"
cat > "$TEST_CONFIG" << 'EOF'
{
  "observer": {
    "mode": "manual",
    "location": {
      "latitude": 37.9838,
      "longitude": 23.7275,
      "timezone": "Europe/Athens",
      "name": "Athens"
    }
  }
}
EOF

start_server

print_test "Query with manual override (New York coords)"
NYC_RESPONSE=$(curl -s "http://localhost:3000/api/display?lat=40.7128&lon=-74.0060")
NYC_LAT=$(echo "$NYC_RESPONSE" | jq -r '.system.observer.latitude')

if [ ! -z "$NYC_LAT" ]; then
    if awk "BEGIN {exit !($NYC_LAT > 40.71 && $NYC_LAT < 40.72)}"; then
        print_success "Query parameter override works (NYC lat ~40.71°)"
    else
        print_failure "Query override latitude unexpected: $NYC_LAT"
    fi
else
    print_failure "Could not extract latitude from query override response"
fi

print_test "Query without params uses config location (Athens)"
ATH_RESPONSE=$(curl -s "http://localhost:3000/api/display")
ATH_LAT=$(echo "$ATH_RESPONSE" | jq -r '.system.observer.latitude')

if [ ! -z "$ATH_LAT" ]; then
    if awk "BEGIN {exit !($ATH_LAT > 37.98 && $ATH_LAT < 37.99)}"; then
        print_success "Default request uses config location (Athens lat ~37.98°)"
    else
        print_failure "Default location latitude unexpected: $ATH_LAT"
    fi
else
    print_failure "Could not extract latitude from default response"
fi

stop_server

# ============================================================================
print_header "Test 6: Validation (Strict Mode)"
# ============================================================================

print_test "Create invalid config (manual mode missing timezone)"
cat > "$TEST_CONFIG" << 'EOF'
{
  "observer": {
    "mode": "manual",
    "location": {
      "latitude": 29.9792,
      "longitude": 31.1342
    }
  }
}
EOF

print_info "Attempting to start server with invalid config (should fail)..."
cd "$PROJECT_ROOT"
if npm start > /tmp/antikythera-test-validation.log 2>&1 &
then
    VALIDATION_PID=$!
    sleep 2
    
    if ps -p $VALIDATION_PID > /dev/null 2>&1; then
        print_failure "Server started despite invalid config (should have failed)"
        kill $VALIDATION_PID 2>/dev/null || true
    else
        print_success "Server correctly rejected invalid config (strict mode)"
    fi
else
    print_success "Server startup failed as expected (invalid config)"
fi

# Check logs for validation error
if grep -q "timezone" /tmp/antikythera-test-validation.log 2>/dev/null; then
    print_success "Validation error mentions missing 'timezone' field"
else
    print_info "Note: Could not verify specific validation error message"
fi

# ============================================================================
print_header "Test 7: Loose Validation Mode"
# ============================================================================

print_test "Start server with invalid config in loose mode"
cat > "$TEST_CONFIG" << 'EOF'
{
  "observer": {
    "mode": "manual",
    "location": {
      "latitude": 29.9792,
      "longitude": 31.1342
    }
  }
}
EOF

print_info "Starting server with ANTIKYTHERA_CONFIG_LOOSE=1..."
cd "$PROJECT_ROOT"
ANTIKYTHERA_CONFIG_LOOSE=1 npm start > /tmp/antikythera-test-loose.log 2>&1 &
LOOSE_PID=$!
SERVER_PID=$LOOSE_PID

if wait_for_server; then
    print_success "Server started successfully in loose mode (despite invalid config)"
    
    # Check logs for warning (not error)
    if grep -q "timezone" /tmp/antikythera-test-loose.log 2>/dev/null; then
        print_success "Validation warning logged (loose mode allows startup)"
    fi
    
    # Verify server is functional
    if curl -s http://localhost:3000/api/settings > /dev/null 2>&1; then
        print_success "Server responds to requests in loose mode"
    else
        print_failure "Server not responding in loose mode"
    fi
else
    print_failure "Server failed to start even in loose mode"
fi

stop_server

# ============================================================================
print_header "Test 8: Unknown Keys (Forward Compatibility)"
# ============================================================================

print_test "Create config with unknown keys"
cat > "$TEST_CONFIG" << 'EOF'
{
  "observer": {
    "mode": "auto"
  },
  "futureFeature": "will be ignored",
  "experimentalFlag": true,
  "display": {
    "language": "english"
  }
}
EOF
print_success "Created config with unknown keys"

start_server

print_test "Server accepts config with unknown keys"
if curl -s http://localhost:3000/api/settings > /dev/null 2>&1; then
    print_success "Server started successfully (unknown keys ignored)"
else
    print_failure "Server failed to start with unknown keys"
fi

# Check logs for unknown key warning
if grep -qi "unknown.*key" /tmp/antikythera-test-server.log 2>/dev/null; then
    print_success "Warning logged for unknown keys"
else
    print_info "Note: Could not verify unknown key warning in logs"
fi

stop_server

# ============================================================================
print_header "Test 9: Control Mode Override (Priority 1)"
# ============================================================================

print_test "Start server with manual config (Athens)"
cat > "$TEST_CONFIG" << 'EOF'
{
  "observer": {
    "mode": "manual",
    "location": {
      "latitude": 37.9838,
      "longitude": 23.7275,
      "timezone": "Europe/Athens",
      "name": "Athens"
    }
  }
}
EOF

start_server

print_test "Set control location (London) - should override config"
TOKEN_FILE="$PROJECT_ROOT/.antikythera/control-token"
if [ -f "$TOKEN_FILE" ]; then
    TOKEN=$(cat "$TOKEN_FILE")
    CONTROL_RESPONSE=$(curl -s -X POST http://localhost:3000/api/control/location \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"latitude": 51.5074, "longitude": -0.1278, "timezone": "Europe/London", "name": "London"}')
    
    if echo "$CONTROL_RESPONSE" | grep -q "success\|London"; then
        print_success "Control location set successfully"
        
        sleep 1
        
        print_test "Verify control location overrides config"
        CONTROL_CHECK=$(curl -s http://localhost:3000/api/display)
        CONTROL_LAT=$(echo "$CONTROL_CHECK" | jq -r '.system.observer.latitude')
        
        if [ ! -z "$CONTROL_LAT" ]; then
            if awk "BEGIN {exit !($CONTROL_LAT > 51.50 && $CONTROL_LAT < 51.51)}"; then
                print_success "Control location active (London ~51.51°, not Athens)"
            else
                print_failure "Control location not applied: lat=$CONTROL_LAT"
            fi
        fi
        
        print_test "Stop control mode - should revert to config location"
        STOP_RESPONSE=$(curl -s -X POST http://localhost:3000/api/control/stop \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d '{}')
        
        sleep 1
        
        REVERT_CHECK=$(curl -s http://localhost:3000/api/display)
        REVERT_LAT=$(echo "$REVERT_CHECK" | jq -r '.system.observer.latitude')
        
        if [ ! -z "$REVERT_LAT" ]; then
            if awk "BEGIN {exit !($REVERT_LAT > 37.98 && $REVERT_LAT < 37.99)}"; then
                print_success "Config location restored after control stop (Athens ~37.98°)"
            else
                print_failure "Location not reverted to config: lat=$REVERT_LAT"
            fi
        fi
    else
        print_failure "Could not set control location"
        echo "Response: $CONTROL_RESPONSE"
    fi
else
    print_info "Note: Control token not found, skipping control mode test"
fi

stop_server

# ============================================================================
print_header "Test 10: Custom Config Path"
# ============================================================================

print_test "Create custom config file"
CUSTOM_CONFIG="$CONFIG_DIR/settings.custom.json"
cat > "$CUSTOM_CONFIG" << 'EOF'
{
  "observer": {
    "mode": "auto"
  },
  "display": {
    "language": "custom_test",
    "showSunriseSunset": false
  }
}
EOF
print_success "Created custom config: settings.custom.json"

print_info "Starting server with ANTIKYTHERA_CONFIG=$CUSTOM_CONFIG..."
cd "$PROJECT_ROOT"
ANTIKYTHERA_CONFIG="$CUSTOM_CONFIG" npm start > /tmp/antikythera-test-custom.log 2>&1 &
CUSTOM_PID=$!
SERVER_PID=$CUSTOM_PID

if wait_for_server; then
    print_success "Server started with custom config path"
    
    print_test "Verify custom config loaded (language=custom_test)"
    CUSTOM_LANG=$(curl -s http://localhost:3000/api/language)
    if echo "$CUSTOM_LANG" | grep -q '"language":"custom_test"'; then
        print_success "Custom config loaded successfully"
    else
        print_failure "Custom config not loaded"
        echo "Response: $CUSTOM_LANG"
    fi
else
    print_failure "Server failed to start with custom config"
fi

stop_server
rm -f "$CUSTOM_CONFIG"

# ============================================================================
# SUMMARY
# ============================================================================

print_header "Test Summary"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo ""
echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "${RED}Failed:${NC} $TESTS_FAILED"
echo -e "Total:  $TOTAL_TESTS"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}ALL TESTS PASSED ✓${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}SOME TESTS FAILED ✗${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Check /tmp/antikythera-test-server.log for server logs"
    exit 1
fi
