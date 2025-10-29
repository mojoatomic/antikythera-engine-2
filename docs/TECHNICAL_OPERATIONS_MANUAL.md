# Antikythera Engine: Technical Operations Manual

**Version:** 1.1.0  
**Date:** 2025-10-26  
**Status:** Active Development

---

## 1. System Architecture

### 1.1 Component Overview

The Antikythera Engine consists of three primary components:

**API Server (`server.js`)**
- Express.js HTTP server running on port 3000
- Stateless REST API design
- CORS-enabled for cross-origin requests
- Static file serving for visualization clients

**Calculation Engine (`engine.js`)**
- astronomy-engine library v2.1.19 (VSOP87/ELP2000)
- Coordinate transformations between ecliptic, equatorial, and horizontal systems
- Astronomical phenomena calculations (eclipses, oppositions, cycles)

**Location Service (`lib/location-service.js`)**
- IP-based geolocation via ipapi.co
- 24-hour result caching
- Manual coordinate override via query parameters

### 1.2 Data Flow

```
Client Request
    ↓
Express Router
    ↓
Location Service (async) → IP Geolocation API
    ↓
AntikytheraEngine.getState()
    ↓
astronomy-engine calculations
    ↓
Coordinate transformations
    ↓
JSON response
```

### 1.3 Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | ≥18.0.0 |
| Framework | Express | 5.1.0 |
| Calculations | astronomy-engine | 2.1.19 |
| Geolocation | ipapi.co | HTTP API |
| Testing | Jest | 29.7.0 |

---

## 2. Calculation Engine

### 2.1 Astronomical Methods

**Planetary Theory:** VSOP87 (Variations Séculaires des Orbites Planétaires)
- Implements semi-analytical solution to N-body problem
- Developed by Bureau des Longitudes, Paris
- Accuracy: 1-10 arcseconds for inner planets, up to 8 arcseconds for outer planets

**Lunar Theory:** ELP2000 (Ephéméride Lunaire Parisienne)
- Semi-analytical lunar ephemeris
- Accounts for perturbations from Sun, planets, Earth oblateness
- Accuracy: 1-6 arcseconds

**Corrections Applied:**
- Light-time delay
- Stellar aberration
- Topocentric parallax
- Atmospheric refraction (horizontal coordinates only)

### 2.2 Coordinate Systems

The engine provides three coordinate systems:

**Ecliptic Coordinates (J2000)**
- Longitude: [0, 360) degrees
- Latitude: [-90, 90] degrees
- Reference plane: Earth's orbital plane
- Frame: J2000 epoch (2000-01-01 12:00:00 TT)

**Equatorial Coordinates (J2000)**
- Right Ascension: [0, 24) hours
- Declination: [-90, 90] degrees
- Reference plane: Earth's equator at J2000 epoch

**Horizontal Coordinates (Topocentric)**
- Altitude: [-90, 90] degrees (angle above horizon)
- Azimuth: [0, 360) degrees (0=North, 90=East, 180=South, 270=West)
- Observer-specific coordinates

### 2.3 Validation Methodology

**Validation Source:** NASA JPL HORIZONS ephemeris system

**Methodology:**
- Topocentric ecliptic coordinate comparison
- 48 samples over 30-day period (2025-10-26 to 2025-11-25)
- Observer location: Athens (37.5°N, 23.0°E)
- All timestamps preserve seconds precision (critical for Moon)

**Frame Alignment:**
- astronomy-engine: `Ecliptic()` function returns true ecliptic-of-date
- HORIZONS query: `REF_SYSTEM=J2000`, `REF_PLANE=ECLIPTIC`
- Result: Arcsecond-level agreement across all bodies

---

## 3. Validation Results

### 3.1 Accuracy Statistics

**Extended Validation:** 48 samples over 30 days

| Body    | Lon p50 | Lon p95 | Lon max | Lat p50 | Lat p95 | Lat max |
|---------|---------|---------|---------|---------|---------|---------|
| Sun     | 0.52"   | 0.91"   | 0.96"   | 0.40"   | 0.66"   | 0.70"   |
| Moon    | 2.61"   | 5.51"   | 6.04"   | 0.64"   | 1.13"   | 1.28"   |
| Mercury | 0.78"   | 2.37"   | 2.59"   | 1.36"   | 3.98"   | 4.11"   |
| Venus   | 1.39"   | 2.10"   | 2.37"   | 0.40"   | 1.45"   | 1.52"   |
| Mars    | 0.44"   | 0.74"   | 0.91"   | 1.32"   | 1.54"   | 1.61"   |
| Jupiter | 2.96"   | 3.32"   | 3.38"   | 1.35"   | 1.54"   | 1.58"   |
| Saturn  | 8.22"   | 8.60"   | 8.62"   | 0.50"   | 0.70"   | 0.73"   |

**Aggregate:** p50=1.61", p95=8.30", max=8.62"

### 3.2 Precision Context

- **Human eye resolution:** ~60 arcseconds
- **Professional planetarium software:** 10-30 arcseconds typical
- **Maximum error (8.62"):** Represents 0.5% of Moon's apparent diameter

### 3.3 Validation Data

Raw validation data stored in `validation-results.json`:
- Timestamp for each sample
- API-computed positions
- HORIZONS-retrieved positions
- Residuals (differences)

Validation scripts:
- `scripts/validate-simple.js` - Quick Moon-only check
- `scripts/validate-all-bodies.js` - Comprehensive 7-body validation
- `scripts/validate-extended.js` - Multi-timestamp statistical analysis

---

## 4. API Specification

### 4.1 Endpoints

**GET /api/state**

Returns complete astronomical state for a given time.

Query parameters:
- `date` (optional): ISO 8601 timestamp, defaults to current time
- `lat`, `lon`, `elev` (optional): Manual observer location override

Response time: 25-75ms typical

**GET /api/state/:date**

Path parameter variant of `/api/state`.

**GET /api/display**

Hybrid endpoint providing mechanical control data and digital display content for physical device integration.

Query parameters:
- `date` (optional): ISO 8601 timestamp
- `lat`, `lon`, `elev` (optional): Manual observer location
- `precision=full` (optional): Include per-body validation errors
- `include=astronomical` (optional): Include raw astronomical data
- `dt` (optional): Interval in seconds; when provided with `stepsPerDegree`, each stepper includes `stepsForInterval`
- `stepsPerDegree` (optional): Stepper resolution (steps/degree); used with `dt`

Response time: 25-75ms typical

**GET /api/sun**

Returns Sun position only (subset of `/api/state`).

**GET /api/moon**

Returns Moon position only (subset of `/api/state`).

**GET /api/planets**

Returns planetary positions only (subset of `/api/state`).

### Control-Prefixed Endpoints (Classroom Control)

Write operations are namespaced under `/api/control/*`. Reads remain under `/api/*`.

Auth: Bearer token via `CONTROL_TOKEN` env var.

- `GET /api/control` → discovery of available control operations and auth requirements
- `GET /api/control/status` → `{ active, mode, displayTime?, animating?, animate?, preset?, bodies? }`
- `POST /api/control/time` `{ date: ISO }` → set controlled time (UTC)
- `POST /api/control/animate` `{ from: ISO, to: ISO, speed?: number>0 }` → animate between two times
- `POST /api/control/scene` `{ preset: string, bodies?: string[]|csv }` → set scene preset
- `POST /api/control/stop` `{}` → stop control and revert to real-time

State behavior: when control is active, `/api/state` and `/api/display` honor controlled time; `stop` reverts.

**GET /api/language**

Returns the UI language configured on the server.

Response:
- `{ "language": "english" }`

**GET /api/settings**

Returns UI feature toggles derived from `.env.local`.

Response:
- `{ "showSunriseSunset": true|false }`  // Controlled by `SHOW_SUNRISE_SUNSET=yes|no`

### 4.2 Request/Response Formats

**Request Example:**
```bash
curl "http://localhost:3000/api/state?date=2025-10-26T12:00:00Z"
```

**Response Structure (excerpted):**
```json
{
  "date": "2025-10-26T12:00:00.000Z",
  "location": {
    "latitude": 37.5,
    "longitude": 23.0
  },
  "sun": {
    "longitude": 213.47,
    "latitude": -0.002,
    "altitude": 1.26,
    "azimuth": 253.23,
    "velocity": 0.998
  },
  "moon": {
    "longitude": 269.03,
    "latitude": -5.82,
    "altitude": 20.28,
    "azimuth": 200.07,
    "velocity": 12.12,
    "phase": 55.81,
    "illumination": 0.22
  },
  "planets": {
    "mercury": { "longitude": 236.97, "latitude": -2.70, ... },
    "venus": { "longitude": 195.88, "latitude": 1.52, ... },
    "mars": { "longitude": 233.67, "latitude": -0.34, ... },
    "jupiter": { "longitude": 114.73, "latitude": 0.07, ... },
    "saturn": { "longitude": 356.06, "latitude": -2.48, ... }
  }
}
```

**`/api/display` Response Structure:**
```json
{
  "timestamp": "2025-10-26T15:28:33.459Z",
  "mechanical": {
    "steppers": {
      "sun": { "position": 213.47, "velocity": 0.998, "altitude": 1.26, "azimuth": 253.23 },
      "moon": { "position": 270.00, "velocity": 11.97, "altitude": 20.28, "azimuth": 200.07 }
    },
    "servos": {
      "mercury_retrograde": { "angle": 0, "state": "prograde" }
    }
  },
  "digital": {
    "displays": {
      "oled_main": { "line1": "Next Eclipse: solar", "line2": "114 days", "line3": "2026-02-17" }
    },
    "leds": {
      "visibility": {
        "mercury": { "color": "red", "brightness": 0 }
      }
    }
  },
  "next_opposition": {
    "planet": "Mars",
    "date": "2026-01-09T08:30:00.000Z",
    "daysUntil": 75.2
  },
  "update_hints": {
    "mechanical": 10000,
    "digital": 1000
  }
}
```

### 4.3 Error Handling

**400 Bad Request**
- Invalid date format
- Invalid coordinate values

**500 Internal Server Error**
- Calculation engine failure
- Geolocation service timeout

Error response format:
```json
{
  "error": "Invalid date format"
}
```

### 4.4 Performance Characteristics

- **Computation time:** 25-75ms per request (median ~50ms)
- **No caching:** Every request performs full calculation
- **Stateless design:** Enables horizontal scaling
- **Suitable for:** 1-10 Hz display refresh rates

---

## 5. REPL Operations

This section summarizes educator-ready CLI/REPL operations. For full end-user guide see docs/CLI-REPL.md.

### 5.1 Startup
- Start API: `npm start`
- Launch REPL: `antikythera repl`

### 5.2 Configuration
- `set location <lat,lon[,elev]>` (persisted)
- `set source <auto|local|api>` (auto includes circuit breaker)
- `set format <table|json|compact>`
- `context` to view settings

### 5.3 Navigation & Events
- Time: `goto <date>`, `+2h`, `reset`
- Events: `next eclipse`, `next opposition [planet]`, `find next conjunction [A] [B]`, `find next equinox|solstice`

### 5.4 Monitoring
- `watch <body[,body...]> [interval N] [compare]` (Ctrl+C cancel; `pause`/`resume`)
- `compare <body>` shows Δ with tolerance

### 5.5 Data Products
- Plots: `plot <body|list|planets> <Nd|Nh|Nw> [csv]`
- Exports: `sample <body> from <date> to <date> every <step> [json|csv]`
- Pipes: `all | visible | where alt > 0 | sort alt desc | limit 3 | fields name alt`

### 5.6 Educator Examples
```text
set location 29.9792,31.1342
find next solstice
plot moon.illumination 30d
sample mars from 2025-01-01T00:00:00Z to +14d every 1d csv
watch jupiter compare
```

## 6. Display Architecture

### 5.1 Animation Polling Strategy

**Current Implementation (display.js, display-v2.js):**
- Fetches `/api/state/:date` every 100ms (10 Hz)
- Direct rendering from API response
- No client-side interpolation

**Performance Impact:**
- Server load: 10 requests/second per client
- Network bandwidth: ~5KB per request = 50KB/s per client
- Scalability: Limited by server CPU for calculation

**Planned Optimization (Issue #16):**
- Poll every 5 seconds (0.2 Hz)
- Client-side linear interpolation using velocity field
- Target: 60fps rendering with 50x API load reduction

### 5.2 Physical Orrery Integration

The `/api/display` endpoint provides data formatted for physical mechanism control:

**Stepper Motors (`mechanical.steppers`):
- `position`: Ecliptic longitude [0, 360) degrees
- `velocity`: Degrees per day (negative = retrograde motion)
- `velocityDegPerSec`: Degrees per second (derived)
- `direction`: 'CW' if `velocityDegPerSec ≥ 0`, otherwise 'CCW'
- `stepsForInterval`: Present when `dt` and `stepsPerDegree` are provided; computed as `round(velocityDegPerSec × dt × stepsPerDegree)`
- `altitude`: Degrees above horizon (for visibility calculations)
- `azimuth`: Compass direction in degrees

**Servo Motors (`mechanical.servos`):**
- `angle`: Position in degrees (0=prograde, 180=retrograde)
- `state`: Motion state string ("prograde", "stationary", "retrograde")

**Update Hints:**
- `mechanical`: 10000ms (10 seconds) - slow-moving astronomical positions
- `digital`: 1000ms (1 second) - faster-updating display text

Example: Microcontroller usage
```json path=null start=null
{
  "mechanical": {
    "steppers": {
      "sun": {
        "position": 215.78,
        "velocity": 0.999,
        "velocityDegPerSec": 0.00001157,
        "direction": "CW",
        "stepsForInterval": 12
      }
    }
  },
  "intervalSec": 5
}
```
Control loop (pseudocode):
```c path=null start=null
// Given stepsPerDegree = 200 and poll every 5s
if (resp.mechanical.steppers.sun.stepsForInterval != 0) {
  stepper_move_steps(SUN, resp.mechanical.steppers.sun.stepsForInterval,
                     resp.mechanical.steppers.sun.direction == 'CW');
}
```

### 5.3 Synchronization Guarantees

- All calculations use single timestamp
- Positions are internally consistent for that moment
- No race conditions between bodies
- Atomic state snapshot

### 5.4 Front Face Time Rings and Solar Events

- The Zodiac/time band is rotated each frame by the Sun’s ecliptic longitude: `eclipticRotation = (sunLongitude − 90)°`.
- Outer ring (bronze): Mean Solar Time (clock time, unadjusted for EoT).
- Inner ring (gold): Apparent Solar Time (sundial time, adjusted by the Equation of Time).
- Bronze and gold markers show the same “now” on their respective scales; their angular separation visualizes the EoT value (also shown numerically in the upper-right corner).
- Sunrise and sunset markers are placed using UTC event times converted to hour angles; their angles include the same `eclipticRotation` used by the rings.
- Optional local-time labels (e.g., “07:16 AM”, “06:10 PM”) can be rendered next to the markers; toggled by `SHOW_SUNRISE_SUNSET` via `/api/settings`.
- Calendar band: the pointer geometry is driven by smooth year progress (0–360), while the labels display modern Gregorian month/day (UTC).

---

## 6. Performance Characteristics

### 6.1 Response Times

Measured on development hardware (Apple M1 Pro):

| Endpoint | Median | 95th percentile | Maximum |
|----------|--------|-----------------|---------|
| /api/state | 50ms | 72ms | 85ms |
| /api/display | 52ms | 75ms | 88ms |
| /api/sun | 28ms | 35ms | 42ms |

Variables affecting computation time:
- Eclipse search (can add 20-50ms)
- Opposition search (can add 20-50ms)
- Number of bodies calculated

### 6.2 Accuracy Bounds

| Body | Typical Error | Maximum Error |
|------|---------------|---------------|
| Sun | 0.5" | 1.0" |
| Moon | 2.6" | 6.0" |
| Mercury | 0.8" | 4.1" |
| Venus | 1.4" | 2.4" |
| Mars | 0.4" | 1.6" |
| Jupiter | 3.0" | 3.4" |
| Saturn | 8.2" | 8.6" |

**Overall:** Median 1.61", Maximum 8.62"

### 6.3 Load Handling

**Current Limitations:**
- No built-in caching
- No request queuing
- No rate limiting
- Single-threaded computation

**Scalability:**
- Stateless design enables horizontal scaling
- Each instance independent
- Load balancer compatible
- No shared state requirements

---

## 7. Operational Guidelines

### 7.1 Location Handling

**Priority Order (current):**
1. `.env.local` configuration (OBSERVER_LATITUDE, OBSERVER_LONGITUDE, etc.)
2. Query parameters (`?lat=X&lon=Y&elev=Z`)
3. IP geolocation (ipapi.co) with a 24h TTL cache (`IP_GEO_TTL_MS`), log noise suppressed on cache hits
4. Fallback: Memphis, Tennessee (35.1184°N, −90.0489°)

Both `/api/state` and `/api/state/:date` now use the same observer-resolution path, ensuring consistent sunrise/sunset and horizontal coordinates across endpoints.

**IP Geolocation:**
- Service: ipapi.co free tier
- Cache duration: 24 hours
- Rate limit: 1,000 requests/day (free tier)
- Timeout: 2 seconds

**Accuracy:**
- City-level typically
- Can be inaccurate by several degrees
- Use manual override for precision applications

### 7.2 Error States

**Calculation Errors:**
- Logged to console with stack trace
- 500 error returned to client
- System continues operating

**Geolocation Errors:**
- Silent fallback to default location
- Warning logged to console
- Client receives computed results with fallback coordinates

**Eclipse/Opposition Search Timeouts:**
- Returns `null` or error object
- Does not block other calculations
- Client can handle gracefully

### 7.3 Monitoring

**Key Metrics to Monitor:**
- Response time (target: <100ms 95th percentile)
- Error rate (target: <0.1%)
- Geolocation cache hit rate
- Request rate per endpoint

**Logging:**
- Standard output (stdout) for normal operations
- Standard error (stderr) for errors
- No log rotation (rely on external tools)

---

## 8. Design Decisions

### 8.1 Why VSOP87 over DE440?

**VSOP87 (via astronomy-engine):**
- JavaScript implementation, runs natively in Node.js
- Sub-10-arcsecond precision sufficient for display applications
- No external dependencies or subprocess calls
- Response time: 25-75ms
- Well-tested, stable API

**DE440 (NASA JPL):**
- ~1-2 arcsecond precision
- Requires Python subprocess or native bindings
- Significantly slower (>500ms with subprocess overhead)
- Added complexity for marginal visual improvement
- Precision exceeds human perception for display use

**Decision:** VSOP87 provides sufficient precision for intended use cases (educational displays, physical orrery control, planetarium software) with better performance characteristics.

### 8.2 Why API-Driven Displays?

**Centralized Calculation:**
- Single source of truth for astronomical data
- Consistent across all clients
- Easy validation against HORIZONS
- Simplified client implementation

**Stateless API:**
- Horizontal scaling without shared state
- No session management
- Simple deployment model
- Load balancer friendly

**Alternatives Considered:**
- Client-side astronomy-engine: Larger bundle size, validation complexity
- WebSocket streaming: Unnecessary complexity for slow-changing data
- Server-Sent Events: Not needed for current polling model

**Decision:** REST API provides optimal balance of simplicity, performance, and scalability for current use cases.

### 8.3 Why Geocentric Coordinates?

**Geocentric (Earth-centered):**
- Matches historical Antikythera mechanism perspective
- Appropriate for ground-based observation
- Simpler for educational demonstration
- Topocentric corrections applied for horizontal coordinates

**Alternatives:**
- Heliocentric: More physically accurate but harder to visualize from Earth
- Barycentric: Only relevant for precision orbital mechanics

**Decision:** Geocentric coordinates match the historical context and intended use cases for visualization and education.

---

## 9. Command-Line Interface (CLI)

Authoritative CLI documentation lives in `CLI.md`. The interactive REPL is documented in `docs/CLI-REPL.md`.

Highlights:
- Commands: `now`, `position <body>`, `compare <body> <source1> <source2>`, `watch [body]`, `validate` (stub)
- Sources: embedded engine (local) or API (remote) with smart auto-selection
- Formats: table (default), JSON, CSV
- Debugging aids: `--debug`, `--verbose`, `--profile`, and `compare` for source diffs

Refer to `CLI.md` for installation, usage examples, and output semantics. This manual intentionally avoids duplication.

---

## Appendix A: Quick Reference

**Start Server:**
```bash
npm start
```

**Run Tests:**
```bash
npm test
```

**Validate Against HORIZONS:**
```bash
node scripts/validate-all-bodies.js
```

**API Endpoints:**
- `GET /api/state` - Complete astronomical state
- `GET /api/display` - Physical device control data
- `GET /api/sun` - Sun position only
- `GET /api/moon` - Moon position only
- `GET /api/planets` - Planetary positions only

**Default Port:** 3000

**Default Observer:** Athens, Greece (37.5°N, 23.0°E)

---

## Appendix B: Reproducibility

All calculations can be reproduced by:
1. Same timestamp (preserve seconds for Moon precision)
2. Same observer coordinates
3. Same astronomy-engine version (2.1.19)
4. Validation against HORIZONS using provided scripts

Validation data and scripts included in repository for independent verification.

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-10-26  
**Status:** Active Development
