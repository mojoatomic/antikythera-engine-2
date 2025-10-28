# CLI-REPL Design (MVP)

Status: Implemented (MVP)
Owner: CLI team
Related: Issue #21

## Objective
Provide an interactive REPL for the Antikythera CLI that accelerates exploration, debugging, and demos while reusing existing API/engine sources and formatters.

## Non-Goals (MVP)
- Event search DSL, scripting/macros, plotting
- Heavy dependencies beyond Node builtin readline and chalk

## UX
- Start: `antikythera repl` (TTY only; exit with non-zero if non-interactive)
- Prompt: `antikythera>` with history (persisted) and tab completion
- Ctrl+C: cancel current op/watch; double Ctrl+C exits REPL
- Echo intent lines for clarity: `Moon at 2025-12-25T00:00:00Z (source: api, format: table)`

### Commands (Grammar)
- `<body>` → position now (uses context)
- `<body> at <date>` → position at date
- `<body> now` → explicit now
- `all` → sun, moon, planets (compact table)
- `compare <body>` → api vs engine (Δ with tolerance)
- `watch <body> [interval N]` → live updates; Ctrl+C to stop
- `set format <table|json|compact>`
- `set source <auto|local|api>`
- `set tz <auto|IANA>`
- `set intent <on|off>`
- `set tolerance <degrees>`
- `context`, `history`, `help`, `clear`, `exit|quit|.exit`

Reserved for Phase 2: `next`, `find`, `goto`, `reset`, `+/-`, `where`, `|`.

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
