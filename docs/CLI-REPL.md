# CLI REPL User Guide

This guide explains how to use the Antikythera CLI and interactive REPL without reading code. It includes step-by-step examples, ready-to-copy commands, and links to the Technical Operations Manual for deeper reference.

See also: Technical Operations Manual → REPL Operations (docs/TECHNICAL_OPERATIONS_MANUAL.md#repl-operations)

Status: Implemented (MVP)
Owner: CLI team
Related: Issue #21

## Objective
Provide an interactive REPL for the Antikythera CLI that accelerates exploration, debugging, and demos while reusing existing API/engine sources and formatters.

## Non-Goals (MVP)
- Event search DSL, scripting/macros, plotting
- Heavy dependencies beyond Node builtin readline and chalk

## Quick Start for Educators

1) Start the API server (new terminal)
```bash
npm start
```
2) Open the REPL
```bash
antikythera repl
```
3) Set your location and preferred source/format
```bash
set location 29.9792,31.1342      # Giza Pyramids (lat,lon)
set source auto                   # auto uses API with circuit-breaker fallback
set format table                  # table | json | compact
```
4) Try the basics (copy/paste at the `antikythera>` prompt)
```bash
sun                 # Sun position now
moon at 2025-12-25  # Moon at a specific date
all | visible       # Show only bodies above the horizon
watch mars compare  # Live API vs Engine delta (Ctrl+C to stop)
```
5) Plot and export
```bash
plot mars 30d                     # ASCII chart
plot mars,jupiter 30d csv         # CSV export of multi-series plot
sample moon from now to +2h every 15m csv   # Time series export
```

Notes
- Double Ctrl+C exits the REPL.
- History and settings persist across sessions (~/.config/antikythera).
- Use `context` anytime to see your current settings.

### Command Reference (copy/paste)
- `<body>` → position now (sun, moon, mercury, venus, mars, jupiter, saturn)
- `<body> at <date>` → position at date (ISO | relative | natural)
- `all` → sun, moon, planets (compact)
- `compare <body>` → API vs Engine (Δ with tolerance)
- `watch <body[,body...]> [interval N] [compare]` → live updates; `pause` / `resume`; Ctrl+C to stop
- `next eclipse` | `next opposition [planet]`
- `find next conjunction [A] [B]` (aliases: `A with B`, `with sun A`)
- `find next equinox` | `find next solstice`
- `plot <body|list|planets> <Nd|Nh|Nw> [csv]`
- `plot moon.illumination <Nd>` | `plot visibility sun 1d`
- `sample <body> from <date> to <date> every <step> [json|csv]`
- `set source <auto|local|api>` | `set location <lat,lon[,elev]>` | `set tz <auto|IANA>`
- `set format <table|json|compact>` | `set intent <on|off>` | `set tolerance <deg>`
- `context` | `history` | `help` | `clear` | `exit`
- `set intent <on|off>`
- `set tolerance <degrees>`
- `context`, `history`, `help`, `clear`, `exit|quit|.exit`

### Control Commands (Classroom Control)
Authentication is automatic in local development: start the server first and a control token is generated at `.antikythera/control-token`. The CLI reads it automatically.

- `control time <ISO>` — Set display to specific time (UTC ISO recommended)
- `control animate --from <ISO> --to <ISO> [--speed <Nx>]` — Animate through a time range
- `control scene --preset <name> [--bodies a,b,c]` — Change scene preset
- `control stop` — Return to real-time now
- `control status` — Show current control state

#### Reset to Real-Time
To stop control mode and return to live time:
```bash
antikythera control stop
```
This immediately reverts the display to real-time. All student displays will automatically follow.

#### Example Session
```bash
# Set historical time
antikythera control time 1969-07-20T20:17:00Z
# Display shows: Apollo 11 moon landing

# Check status
antikythera control status
# Control: active
# Display time: 1969-07-20T20:17:00Z

# Return to now
antikythera control stop
# ✓ Control stopped - display reverted to real-time

# Verify
antikythera control status
# Control: inactive
# Display: real-time
```

#### Control Commands Quick Reference
| Command | Description |
|---------|-------------|
| `control time <ISO>` | Set display to specific time |
| `control animate --from <ISO> --to <ISO> --speed <N>` | Animate through time range |
| `control scene --preset <name>` | Change display scene |
| `control stop` | Return to real-time |
| `control status` | Show current control state |

Reserved for Phase 2: `next`, `find`, `goto`, `reset`, `+/-`, `where`.

### Pipes & Filters
- Syntax: `all | <stage> | <stage> ...`
- Stages: `visible`, `retrograde`, `rising`, `where <field> <op> <value>`, `sort <field> [asc|desc]`, `limit <N>`, `fields <list>`, `grep <substr>`, `json`
- Ops: `>`, `>=`, `<`, `<=`, `==`, `!=` (numeric or string)
- Field aliases: `lon`→longitude, `lat`→latitude, `alt`→altitude, `vel`→velocity
- JSON: `set format json` or add stage `| json` to return `{ date, rows: [...] }`

Examples
```text
all | visible | sort alt desc | limit 3
all | fields name lon alt | grep MAR
all | where alt > 0 | fields name alt | json
```

### Completion
- Global: help, exit, clear, context, history, set, format, source, tz, watch, compare, all, bodies
- Contextual:
  - after `set` → `format|source|tz|intent|tolerance`
  - after `format` → `table|json|compact`
  - after `source` → `auto|local|api`
  - after `tz` → `auto|<IANA>` (suggest current + a few common)
  - after `intent` → `on|off`
  - after `compare|watch` → bodies

## Context & Persistence
Schema (persist to JSON):
```json
{
  "version": 1,
  "format": "table",
  "source": "auto",
  "tz": "auto",
  "showIntent": true,
  "compareToleranceDeg": 0.001,
  "lastBody": "moon",
  "lastDate": "2025-10-28T14:40:00Z"
}
```
- Unknown fields ignored on load; on mismatch: migrate or reset with warning.
- History: max 1000 lines when saving (trim oldest).
- `showIntent`: controls echo of parsed commands (default on).
- `compareToleranceDeg`: tolerance for `compare` diffs in degrees (default 0.001).

### Config Paths
- Unix/macOS: `~/.config/antikythera/{history,repl.json}` (XDG)
- Windows: `%APPDATA%\antikythera\{history,repl.json}`
- Fallback: `~/.antikythera_{history,repl.json}`
- Ensure directory exists; atomic writes (tmp + rename, cleanup on failure).

## Date Parsing
Priority:
1) ISO 8601 (UTC or with tz offset)
2) Relative: `+2h`, `-30m`, `+7d`
3) Natural: `today 18:00`, `tomorrow noon`, `tonight 21:00`
4) Fallback: user tz from context (`tz=auto` → system tz)

Echo back always:
`Parsed: 2025-12-25 18:00 America/Chicago → 2025-12-26T00:00:00Z`

Guardrails:
- Reject ambiguous `12/11/25` → suggest ISO `YYYY-MM-DD`
- Relative limits: default ±100 years; error if exceeded

Implementation: lightweight parser (regex + Date), consider chrono-node later if needed.

## Error Style
Examples:
```
✗ Invalid body: masr
  Valid: sun, moon, mercury, venus, mars, jupiter, saturn

✗ API timeout (5s)
  Falling back to local engine... (try: set source local or start server: npm start)

✗ Invalid date: 2025-13-45
  Format: YYYY-MM-DDTHH:mm:ssZ or relative (+2h, -30m)
```
- One-line summary + one-line remedy; no stack unless `--debug` within the REPL session.

## Output
- Formats: table (default), json (pure, no ANSI), compact (single-line summary)
- Keep within terminal width; truncate decimals in compact/table sensibly

### Plot Examples

#### Planetary Motion (single series)
```text
antikythera> plot mars 90d

MARS Longitude over 90d

 237.3°┤      ╭─╮
 235.5°┤    ╭─╯ ╰─╮
 233.7°┤  ╭─╯     ╰─╮
 231.9°┤╭─╯         ╰─╮
 230.1°┼╯             ╰─╮
```
Shows retrograde motion loop (longitude reversal visible around stationary points).

#### Moon Phase
```text
antikythera> plot moon.illumination 30d

MOON Illumination over 30d

 100%┤ ●     ●     ●
  75%┤╱ ╲   ╱ ╲   ╱
  50%┤   ◐ ◑   ◐ ◑
  25%┤    ╲ ╱    ╲ ╱
   0%┤     ○     ○
```
Full moon cycle visualization (percent illumination).

#### Visibility Timeline (Altitude)
```text
antikythera> plot visibility sun 1d

ALT (°)
 90┤
 45┤        ╱‾‾‾╲        
  0┼───────╯─────╰──────  ← Horizon
-45┤   ╱           ╲
-90┤                     
   06:00  12:00  18:00
```
Altitude timeline over a day (horizon crossing shows sunrise/sunset).

#### Multi-series and Unwrap
```text
antikythera> plot mars,jupiter 30d
MARS | JUPITER
<ascii chart with two colored lines>
2025-10-01 12:00  ...  2025-10-31 12:00
```
- Multiple comma-separated bodies supported (also `planets` alias)
- Longitude series are unwrapped to avoid 360° jumps for continuity

### Plot Implementation Notes
- Library: `asciichart` (lightweight, no dependencies)
- Width: responsive to terminal width (`process.stdout.columns`)
- Height: default 12 rows
- Colors: series colored; ASCII only
- JSON: `format=json` → `{ start, stepMs, series[{def, values}], times }`
- CSV export: append `csv` to plot command (e.g., `plot mars,jupiter 30d csv`)
- X-axis: labeled with tick marks and time labels
- Data sources:
  - `plot <body> <Nd>` → body ecliptic longitude
  - `plot moon.illumination <Nd>` → percent illumination ×100
  - `plot visibility sun 1d` → solar altitude (°) across a day

## Architecture
- Shell: Node `readline` (completer, history)
- Parser: token → intent dispatcher (no DSL)
- Execution: reuse `getData`/`getFromAPI`/`getFromEngine` and `formatters`
- Watch: `setInterval`, cancels on SIGINT; enforce min interval; return to prompt cleanly
- Resilience: 5s timeouts; auto-fallback when `source=auto`; never crash REPL

## Tests
- Unit: parser (bodies, dates, set commands), date parser (fixtures), error messages
- E2E: basic PTY session (start/help/exit), persistence across restart (context/history), compare behavior (API unavailable), API fallback message, watch cancel (SIGINT)
- Snapshots: formatted outputs with ANSI stripped in tests

## Acceptance (MVP)
- Start/help/exit work; history and completion work
- `moon`, `mars at <date>`, `all`, `compare <body>`, `watch <body>` work with both sources
- `set format/source/tz` persist across sessions
- JSON output contains no ANSI; compact under 80 cols
- Ctrl+C cancels watch; double Ctrl+C exits REPL
- On API timeout/unavailable in auto source, show: `API timeout... Falling back to local engine`

## Demo: API Fallback

To validate resilience:

```bash
# Start REPL
antikythera repl

# Use auto source
set source auto

# Stop API server in another terminal (or ensure it isn't running)
# Then run a body command
moon
# Expected: "API timeout... Falling back to local engine"
```

## Task Breakdown
1) Add `repl` command entry in `cli/index.js`
2) Implement `cli/commands/repl.js` with readline loop, completer, grammar, state
3) Config path util (resolve + mkdirp + atomic write/read)
4) Date parser util (ISO/relative/natural) + echo line
5) Tests: unit + basic e2e (using a PTY helper)
6) Docs: update `CLI.md` (add REPL section) and link from `TECHNICAL_OPERATIONS_MANUAL.md`

## Future Work (Phase 2)
- Time navigation (`+1h`, `goto`, `reset`)
- Event search primitives (opposition, equinox/solstice, zodiac ingress, phases)
- Filters/pipes, aliases/macros, script load, export (csv/json/ics), snapshots
- Educational `explain` and ASCII plots
