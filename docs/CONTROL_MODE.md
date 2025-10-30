# Classroom Control Mode

Comprehensive documentation for the control-prefixed API and CLI workflow used to synchronize classroom displays.

Status: Implemented (MVP)
Related Issues: #25, #31

## Overview
- Reads remain under `/api/*` (e.g., `/api/state`, `/api/display`)
- Writes are namespaced under `/api/control/*`
- CLI parity via `antikythera control ...`
- Local dev: authentication is automatic (persistent token file)

## Setup
1) Start the API server
```bash
npm start
```
On first run, the server generates a persistent control token at `.antikythera/control-token` and logs its location. The CLI reads the same token automatically.

2) Use the CLI
```bash
antikythera control status
antikythera control time 2025-12-25T00:00:00Z
```

## Control Token Management
- Persistent file: `.antikythera/control-token` (0600 perms, gitignored)
- Environment override: `ANTIKYTHERA_CONTROL_TOKEN` (server and/or CLI)
- Regenerate: delete the file; a new token is created on next server start

Security notes:
- Local dev token is single-user (file perms 600)
- For classroom sharing, set `ANTIKYTHERA_CONTROL_TOKEN` on the teacher’s server and distribute to clients

## API Specification (Control Prefix)
Auth: Bearer token required. In local dev, CLI loads token automatically.

Endpoints:
- `GET /api/control` → discovery
- `GET /api/control/status` → `{ active, mode, displayTime?, animating?, animate?, location?, preset?, bodies? }`
- `POST /api/control/time` `{ date: ISO }`
- `POST /api/control/run` `{ speed?: number>0 }` — start continuous forward animation
- `POST /api/control/pause` `{}` — freeze at current effective time
- `POST /api/control/animate` `{ from: ISO, to: ISO, speed?: number>0 }`
- `POST /api/control/scene` `{ preset: string, bodies?: string[]|csv }`
- `POST /api/control/location` `{ latitude: number, longitude: number, timezone: IANA, name?: string, elevation?: number }`
- `POST /api/control/stop` `{}`

State behavior:
- When control is active, `/api/state` and `/api/display` honor the effective (controlled) time
- `stop` reverts to real-time now

## Configuration Integration

Control mode operates independently of the configuration system but interacts with it:

**Priority:**
- Control mode location takes precedence over all config settings
- While control location is active, config observer settings are ignored
- `control stop` immediately resumes config-based location resolution

**Hot Reload:**
- Configuration changes (via `config/settings.local.json`) apply when control is inactive
- Configuration changes do not affect active control sessions
- Control mode state persists across config reloads

**Example:**
```bash
# Config has manual observer mode set to Athens
# API uses Athens location
curl http://localhost:3000/api/state

# Teacher sets control location to New York
antikythera control location 40.7128,-74.0060 --timezone "America/New_York"

# API now uses New York (config ignored)
curl http://localhost:3000/api/state

# Teacher stops control
antikythera control stop

# API resumes Athens location from config
curl http://localhost:3000/api/state
```

## CLI Commands
- `antikythera control time <ISO>`
- `antikythera control run [--speed <N>]`
- `antikythera control pause`
- `antikythera control animate --from <ISO> --to <ISO> [--speed <N>]`
- `antikythera control scene --preset <name> [--bodies a,b,c]`
- `antikythera control location <lat,lon> --timezone <IANA> [--name <str>] [--elevation <m>]`
- `antikythera control stop`
- `antikythera control status`

### Control Location

Set observer location explicitly for classroom scenarios. Timezone is required; elevation optional (meters). When set, reads use this location until `stop`.

API example:
```bash
curl -X POST http://localhost:3000/api/control/location \
  -H "Authorization: Bearer {{CONTROL_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.9838,
    "longitude": 23.7275,
    "timezone": "Europe/Athens",
    "name": "Athens, Greece",
    "elevation": 0
  }'
```

CLI example:
```bash
antikythera control location 37.9838,23.7275 --timezone "Europe/Athens" --name "Athens, Greece"
antikythera control time 1969-07-20T20:17:00Z
# ... explore ...
antikythera control stop   # clears control overrides → resumes config policy
```

Notes:
- While control location is active, `?lat/lon` query overrides are ignored
- FrontFace shows the control location (name and coordinates) in the lower-right; sunrise/sunset/time use the provided timezone
- `control stop` clears both time and location overrides
- After `control stop`, location resolution follows normal priority:
  1. Config file (if `observer.mode === 'manual'`)
  2. Query parameters (`?lat=X&lon=Y`)
  3. IP geolocation (if `observer.mode === 'auto'` or no config)
  4. Fallback (Memphis, TN)
- See `docs/TECHNICAL_OPERATIONS_MANUAL.md` for complete location resolution priority

### Example Session
```bash
# Set historical time
antikythera control time 1969-07-20T20:17:00Z

# Check control status
antikythera control status

# Return to live time
antikythera control stop
```

## Error Reference
- 401 Control authentication failed
  - Cause: Missing/incorrect token
  - Remedy: Start server to generate token, or export `ANTIKYTHERA_CONTROL_TOKEN`
- 400 Invalid payload (e.g., bad date)
  - Cause: Invalid ISO timestamp or range
  - Remedy: Provide valid ISO (UTC recommended)

## Operational Guidance
- Rate-limit control endpoints separately from reads if exposing publicly
- Consider TTL for control sessions in supervised environments
- Log audit events for production deployments

## Future Enhancements
- TTL/auto-revert for control sessions
- Role/scopes (e.g., `control:time`, `control:scene`)
- Token CLI helpers: `antikythera token show|regenerate`