# Antikythera CLI Tool

A feature-rich command-line interface for astronomical calculations and debugging. Built for developers who need fast, accurate celestial position data with powerful troubleshooting capabilities.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [now](#now)
  - [position](#position)
  - [compare](#compare)
  - [watch](#watch)
  - [validate](#validate)
- [Output Formats](#output-formats)
- [Source Selection](#source-selection)
- [Debug Features](#debug-features)
- [Use Cases](#use-cases)
- [Examples](#examples)

---

## Installation

### Local Development
```bash
# Clone the repository
git clone https://github.com/mojoatomic/antikythera-engine-2.git
cd antikythera-engine-2

# Install dependencies
npm install

# Link for local use
npm link

# Verify installation
antikythera --version
```

### Global Installation (Future)
```bash
npm install -g antikythera
```

---

## Quick Start

```bash
# Get current astronomical state
antikythera now

# Get Mars position
antikythera position mars

# Compare CLI calculation vs API
antikythera compare mars cli api

# Watch Mars position update live
antikythera watch mars
```

---

## Commands

### `now`

Display the complete astronomical state for the current moment.

**Syntax:**
```bash
antikythera now [options]
```

**Options:**
- `--format <type>` - Output format: `table` (default), `json`, `csv`
- `--debug` - Show source and timing information
- `--local` - Force use of embedded engine
- `--remote` - Force API connection

**Example:**
```bash
$ antikythera now --format json
{
  "date": "2025-10-26T03:59:00.000Z",
  "sun": {
    "longitude": 213.352,
    "latitude": -0.002,
    ...
  },
  "moon": { ... },
  "planets": { ... }
}
```

**With Debug:**
```bash
$ antikythera now --debug
Source: embedded engine
Time: 14ms

┌──────────────────────┬──────────────────────┐
│ Property             │ Value                │
├──────────────────────┼──────────────────────┤
...
```

---

### `position`

Get the position of a specific celestial body.

**Syntax:**
```bash
antikythera position <body> [options]
```

**Bodies:**
- `sun`, `moon`, `mercury`, `venus`, `mars`, `jupiter`, `saturn`

**Options:**
- `--date <iso>` - Date in ISO 8601 format (default: now)
- `--format <type>` - Output format: `table`, `json`, `csv`
- `--debug` - Show calculation details
- `--verbose` - Include raw astronomy-engine data
- `--profile` - Show timing information
- `--local` - Use embedded engine
- `--remote` - Force API connection

**Examples:**

**Basic:**
```bash
$ antikythera position mars
┌────────────────┬──────────┐
│ Property       │ Value    │
├────────────────┼──────────┤
│ longitude      │ 233.684  │
│ latitude       │ -0.338   │
│ rightAscension │ 15.390   │
│ declination    │ -18.928  │
└────────────────┴──────────┘
```

**Specific Date:**
```bash
$ antikythera position sun --date 2025-12-21T00:00:00Z
# Winter solstice sun position
```

**Debug Mode:**
```bash
$ antikythera position mars --debug --profile
=== DEBUG: MARS ===
Date: 2025-10-26T03:59:00Z
Source: embedded engine

Calculation time: 14ms

┌────────────────┬──────────┐
│ longitude      │ 233.684  │
...
```

**JSON Output:**
```bash
$ antikythera position moon --format json | jq '.phase'
187.3
```

---

### `compare`

Compare calculations from different sources - the **killer debugging feature**.

**Syntax:**
```bash
antikythera compare <body> <source1> <source2> [options]
```

**Sources:**
- `cli` / `engine` / `local` - Embedded engine
- `api` - API server

**Options:**
- `--date <iso>` - Date to compare (default: now)
- `--format <type>` - Output format: `table`, `json`

**Example:**

```bash
$ antikythera compare mars cli api
```

**Output:**
```
=== COMPARE MARS ===
Date: 2025-10-26T03:59:00Z

┌────────────────┬────────────────┬────────────────┬──────────────────┐
│ Property       │ CLI            │ API            │ Δ Difference     │
├────────────────┼────────────────┼────────────────┼──────────────────┤
│ longitude      │ 233.686152     │ 233.686152     │ 0.000000 ✓       │
│ latitude       │ -0.338102      │ -0.338102      │ 0.000000 ✓       │
│ rightAscension │ 15.389698      │ 15.389698      │ 0.000000 ✓       │
│ declination    │ -18.928808     │ -18.928808     │ 0.000000 ✓       │
└────────────────┴────────────────┴────────────────┴──────────────────┘

✓ Sources match (within 0.001° tolerance)
```

**When Sources Differ:**
```
✗ Sources differ!
  Maximum difference: 5.123456°
```

**Use Cases:**
- Verify API is returning correct data
- Compare embedded engine vs server calculations
- Catch stale cache issues
- Validate after engine updates

---

### `watch`

Monitor celestial positions in real-time with live delta tracking.

**Syntax:**
```bash
antikythera watch [body] [options]
```

**Options:**
- `--interval <ms>` - Update interval in milliseconds (default: 1000)
- `--compare` - Show comparison with API (future)
- `--format <type>` - Output format: `table`, `json`

**Examples:**

**Watch Specific Body:**
```bash
$ antikythera watch mars --interval 1000
```

**Output:**
```
=== WATCHING MARS ===
Update interval: 1000ms
Press Ctrl+C to stop

2025-10-26T03:59:00.000Z MARS: 233.686152° → 0.000000°
2025-10-26T03:59:01.000Z MARS: 233.686153° ↑ +0.000001°
2025-10-26T03:59:02.000Z MARS: 233.686154° ↑ +0.000001°
2025-10-26T03:59:03.000Z MARS: 233.686155° ↑ +0.000001°
```

**Watch All Bodies:**
```bash
$ antikythera watch --interval 5000

2025-10-26T03:59:00Z SUN: 213.352° MOON: 187.456° MARS: 233.686°
2025-10-26T03:59:05Z SUN: 213.352° MOON: 187.461° MARS: 233.686°
```

**Delta Indicators:**
- `↑` - Increasing (red if significant)
- `↓` - Decreasing (green if significant)
- `→` - No change (gray)

**Use Cases:**
- Verify smooth motion (no jumps)
- Monitor real-time updates
- Catch DST-related issues
- Visual confirmation of calculations

---

### `validate`

Run validation test suites (stub - future implementation).

**Syntax:**
```bash
antikythera validate [options]
```

**Options:**
- `--from <iso>` - Start date
- `--to <iso>` - End date
- `--suite <name>` - Test suite: `dst`, `leap-year`, `full`
- `--format <type>` - Output format: `table`, `json`

**Future Implementation:**
```bash
$ antikythera validate --suite dst
✓ No jumps at DST transitions
✓ Egyptian calendar smooth
✓ Sunrise/sunset continuous
```

---

## Output Formats

### Table (Default)
Human-readable, color-coded table output.
```bash
antikythera position mars --format table
```

### JSON
Machine-readable for scripting and piping.
```bash
antikythera position mars --format json | jq '.longitude'
```

### CSV
Data export for analysis.
```bash
antikythera position mars --format csv > mars.csv
```

---

## Source Selection

The CLI intelligently selects between data sources:

### Auto (Default)
1. Try API server first
2. Fallback to embedded engine if API unavailable
3. Best for production use

```bash
antikythera position mars
# → Uses API if running, else embedded engine
```

### Force Local
Use embedded engine directly (fastest, no network).
```bash
antikythera position mars --local
```

### Force Remote
Require API server (fails if not running).
```bash
antikythera position mars --remote
# → Error if API server not running
```

---

## Debug Features

### Debug Flag
Shows calculation source and date information.
```bash
antikythera position mars --debug
```

### Verbose Flag
Includes raw astronomy-engine output.
```bash
antikythera position mars --verbose
```

### Profile Flag
Shows calculation timing.
```bash
antikythera position mars --profile
# Calculation time: 14ms
```

### Combine Flags
```bash
antikythera position mars --debug --verbose --profile
```

---

## Use Cases

### Daily Driver - Quick Lookups
```bash
# What's Mars doing right now?
antikythera position mars

# Moon phase?
antikythera position moon --format json | jq '.illumination'
```

### Troubleshooting - Compare Sources
```bash
# Browser shows wrong Mars position
# Compare CLI ground truth vs API
antikythera compare mars cli api

# Find the discrepancy
✗ Sources differ!
  Maximum difference: 5.123°
```

### Development - Live Monitoring
```bash
# Watch Egyptian calendar during year transition
antikythera watch sun --interval 100

# Verify smooth movement (no jumps)
```

### Data Export - Batch Processing
```bash
# Export positions for analysis
antikythera position mars --format csv >> data.csv
antikythera position jupiter --format csv >> data.csv
```

### Scripting - Automation
```bash
#!/bin/bash
# Alert if Mars longitude changes significantly
CURRENT=$(antikythera position mars --format json | jq '.longitude')
if [ "$CURRENT" -gt 250 ]; then
  echo "Mars entering Sagittarius!"
fi
```

---

## Examples

### Example 1: Debug Browser Display
**Problem:** Browser shows Mars at 240°, but it looks wrong.

**Solution:**
```bash
# 1. Get CLI ground truth
$ antikythera position mars --local
longitude: 245.123°

# 2. Compare with API
$ antikythera compare mars cli api
CLI: 245.123°
API: 240.000°
Δ:   -5.123° ✗

# 3. Conclusion: API is stale or cached
```

### Example 2: Verify DST Handling
**Problem:** Need to ensure no jumps at DST transition.

**Solution:**
```bash
# Watch during DST transition
$ antikythera watch sun --interval 100 --date 2025-03-09T01:59:00

# Monitor for jumps
2025-03-09T01:59:00Z SUN: 348.123° → 0.000°
2025-03-09T01:59:01Z SUN: 348.123° → 0.000°
2025-03-09T03:00:00Z SUN: 348.123° → 0.000°
# (Note: UTC time, no local jumps)
```

### Example 3: Performance Testing
**Problem:** Is the engine fast enough?

**Solution:**
```bash
$ antikythera position mars --profile --local
Calculation time: 14ms
# ✓ Plenty fast for real-time updates
```

### Example 4: Export for Analysis
**Problem:** Need Mars positions for entire month.

**Solution:**
```bash
#!/bin/bash
for day in {1..31}; do
  DATE="2025-10-${day}T12:00:00Z"
  antikythera position mars --date $DATE --format csv >> mars_october.csv
done
```

---

## API Response Validation

The CLI validates API responses using Zod schemas to catch data corruption issues.

**Automatic Validation:**
```bash
$ antikythera position mars --remote
⚠ API response validation failed:
  sun.longitude: Expected number, received string
```

**What's Validated:**
- All numeric fields are numbers (not strings)
- Required fields are present
- Data structure matches schema
- No type mismatches

**When It Helps:**
- API returns malformed data
- Version mismatches between CLI and API
- Cache corruption
- Serialization errors

---

## Performance

### Calculation Speed
- **Embedded engine:** ~14ms average
- **API call:** ~50-100ms (network + calculation)
- **Watch mode:** Minimal overhead per update

### Memory Usage
- CLI tool: ~15MB
- Embedded engine: Same as API server
- No caching (always fresh calculations)

---

## Troubleshooting

### CLI Not Found
```bash
# Re-link the CLI
npm link

# Or use npx
npx antikythera position mars
```

### API Server Not Running
```bash
# Start the server first
npm start

# Or use --local to bypass
antikythera position mars --local
```

### Validation Warnings
API response validation warnings are informational. The CLI will still display results, but warns you of potential data issues.

---

## Future Enhancements

### Planned Features
- [ ] `validate` command implementation
- [ ] `watch --compare` mode
- [ ] Snapshot comparison
- [ ] Range queries (batch export)
- [ ] Custom location support
- [ ] Interactive REPL mode (maybe)

### Suggestions Welcome
Open an issue or PR with feature requests!

---

## Architecture

### Source Abstraction Layer
```
cli/sources/index.js
├── getData()       # Smart selection
├── getFromEngine() # Embedded engine
└── getFromAPI()    # HTTP to server
```

### Command Structure
```
cli/commands/
├── now.js       # Current state
├── position.js  # Specific body
├── compare.js   # Side-by-side
├── watch.js     # Live updates
└── validate.js  # Test suites
```

### Output Formatters
```
cli/formatters/index.js
├── formatTable() # Human-readable
├── formatJSON()  # Machine-readable
└── formatCSV()   # Data export
```

---

## Contributing

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Adding Commands
1. Create `cli/commands/yourcommand.js`
2. Export async function
3. Register in `cli/index.js`
4. Update this documentation

---

## License

ISC

---

## Credits

Built with:
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Chalk](https://github.com/chalk/chalk) - Terminal colors
- [cli-table3](https://github.com/cli-table/cli-table3) - Tables
- [axios](https://github.com/axios/axios) - HTTP client
- [Zod](https://github.com/colinhacks/zod) - Schema validation
- [astronomy-engine](https://github.com/cosinekitty/astronomy) - Astronomical calculations
