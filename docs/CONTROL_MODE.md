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
- `GET /api/control/status` → `{ active, mode, displayTime?, animating?, animate?, preset?, bodies? }`
- `POST /api/control/time` `{ date: ISO }`
- `POST /api/control/run` `{ speed?: number>0 }` — start continuous forward animation
- `POST /api/control/pause` `{}` — freeze at current effective time
- `POST /api/control/animate` `{ from: ISO, to: ISO, speed?: number>0 }`
- `POST /api/control/scene` `{ preset: string, bodies?: string[]|csv }`
- `POST /api/control/stop` `{}`

State behavior:
- When control is active, `/api/state` and `/api/display` honor the effective (controlled) time
- `stop` reverts to real-time now

## CLI Commands
- `antikythera control time <ISO>`
- `antikythera control run [--speed <N>]`
- `antikythera control pause`
- `antikythera control animate --from <ISO> --to <ISO> [--speed <N>]`
- `antikythera control scene --preset <name> [--bodies a,b,c]`
- `antikythera control stop`
- `antikythera control status`

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