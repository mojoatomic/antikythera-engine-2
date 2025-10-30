# Antikythera Engine

Astronomical ephemeris API inspired by the ancient Greek Antikythera mechanism, providing NASA-validated celestial body positions for educational displays and physical mechanism control.

**Validation:** NASA JPL HORIZONS-compared, 1.4 arcsec typical error  
**Method:** astronomy-engine library (VSOP87/ELP2000)  
**Use Cases:** Educational demonstrations, planetarium displays, physical orrery control

## Overview

The Antikythera Engine calculates real-time positions of celestial bodies (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn) with validated sub-10-arcsecond precision. The system provides structured outputs for both digital visualization and physical mechanism control, recreating the computational capabilities of the ancient Antikythera mechanism with contemporary astronomical accuracy.

### Precision and Validation

- **Validated against:** NASA JPL HORIZONS ephemeris system
- **Typical error:** 1.4 arcseconds (median across 7 bodies)
- **Maximum error:** 8.6 arcseconds (Saturn longitude)
- **Validation date:** 2025-10-26
- **Method:** Topocentric ecliptic coordinate comparison
- **Observer location:** 37.751°N, 97.822°W (Kansas, United States)

Complete validation methodology and results documented in `docs/VALIDATION.md`.

### Intended Use Cases

**Suitable for:**
- Educational astronomy demonstrations
- Planetarium displays and museum exhibits
- Physical orrery and mechanism control
- Amateur astronomy planning
- Visual observation applications
- Interactive astronomy learning

**Not suitable for:**
- Satellite tracking or orbital mechanics
- Occultation prediction requiring sub-arcsecond precision
- Astrometry or precise coordinate measurements
- Navigation or timing applications
- Research requiring peer-reviewed ephemeris

## Quick Start

```bash
npm install
npm start
```

API available at `http://localhost:3000`

Test the system:
```bash
# Get current astronomical state
curl http://localhost:3000/api/state

# Get physical device control data
curl http://localhost:3000/api/display

# Get system metadata and validation info
curl http://localhost:3000/api/system
```

## Configuration

The system uses a validated JSON configuration architecture for application settings. Configuration is optional - the system works out of the box with sensible defaults.

### Configuration Files

```
config/
├── settings.default.json    # Committed defaults
├── settings.local.json       # Local overrides (gitignored)
└── schema.js                 # Zod validation
```

### Observer Location

The system determines observer location using this priority order:

1. **Control mode location** (highest priority)
   - Set via `antikythera control location` CLI command
   - Active until `control stop` is called
   - See Control Mode section below

2. **Configuration file** (when `observer.mode === 'manual'`)
   - Specified in `config/settings.local.json`
   - Requires latitude, longitude, and timezone (IANA format)

3. **Query parameters** (per-request override)
   - `?lat=X&lon=Y&elev=Z` in API requests

4. **IP geolocation** (when `observer.mode === 'auto'` or no config)
   - Automatic detection via ipapi.co
   - City-level accuracy
   - 24-hour cache

5. **Fallback** (lowest priority)
   - Memphis, Tennessee (35.1184°N, 90.0489°W)

### Example: Manual Observer Configuration

The system works automatically using IP geolocation by default. For fixed observatory locations or when you need precise coordinates, edit `config/settings.local.json`:

```json
{
  "observer": {
    "mode": "manual",
    "location": {
      "latitude": 37.9838,
      "longitude": 23.7275,
      "timezone": "Europe/Athens",
      "elevation": 0,
      "name": "Athens, Greece"
    }
  }
}
```

### Display Settings

Configure language and UI elements:

```json
{
  "display": {
    "language": "english",
    "showSunriseSunset": true
  }
}
```

**Supported languages:** English, Greek, Spanish, French, Russian, Arabic, Chinese, Japanese

All display text in the visualization (front face, back faces, zodiac signs, months) is fully internationalized.

### Configuration Layering

Settings merge with priority: custom > local > default

```bash
# Use custom config path
export ANTIKYTHERA_CONFIG=/path/to/custom.json
npm start

# Use loose validation for development
export ANTIKYTHERA_CONFIG_LOOSE=1
npm start
```

### Hot Reload

- `settings.local.json` changes reload automatically
- Custom config path changes reload automatically  
- `settings.default.json` requires server restart

Complete configuration documentation: `config/README.md`

## Features

### Astronomical Calculations
- Geocentric and topocentric celestial body positions
- Ecliptic, equatorial, and horizontal coordinate systems
- Eclipse predictions (solar and lunar)
- Planetary oppositions and conjunctions
- Visibility calculations with twilight modeling
- Ancient astronomical cycles (Metonic, Saros, Callippic)
- Lunar nodes and planetary retrograde motion

### Output Formats
- **Mechanical:** Stepper motor positions and velocities, servo angles for retrograde indicators
- **Digital:** OLED/LCD display text, LED brightness/color values
- **Astronomical:** Detailed celestial coordinates and phenomena
- **System:** Precision metadata, reproducibility information, validation statistics

## API Endpoints

### Physical Device Control
### Classroom Control Mode

Write operations are under `/api/control/*`. For local development, the server auto-generates a token at `.antikythera/control-token` and the CLI reads it automatically.

Examples:
```bash
# Start server (generates token on first run)
npm start

# Set time (UTC) — no env needed locally
antikythera control time 2025-10-29T12:00:00Z

# Set location (explicit, timezone required; elevation optional)
antikythera control location 37.9838,23.7275 --timezone "Europe/Athens" --name "Athens, Greece"

# Animate a range
antikythera control animate --from 2025-10-29T00:00:00Z --to 2025-10-30T00:00:00Z --speed 2

# Run/pause time flow
antikythera control run --speed 10
antikythera control pause

# Scene preset
antikythera control scene --preset planets --bodies mercury,venus,mars

# Status / Stop
antikythera control status
antikythera control stop
```

### Display Visualization

The project includes a web-based sundial display at `http://localhost:3000/` that visualizes:
- Mean Solar Time (clock time)
- Apparent Solar Time (sundial time)
- Celestial body positions (Sun, Moon, planets)
- Observer location, timezone, and sunrise/sunset

How updates work:
- The display polls `/api/state` approximately once per second and re-renders.
- Control commands (`time`, `run`, `pause`, `animate`, `location`) change the server’s effective state.
- High-speed demo (e.g., `run --speed 600`) is computed server-side; the display simply renders the advancing state returned by the API.
- No client-side interpolation — all positions are consistent per timestamp (UTC-safe).

Use case:
- Classroom control: the teacher controls time/location via CLI or API, and all student displays stay synchronized.

Shared classroom token (optional): set `ANTIKYTHERA_CONTROL_TOKEN` on server and clients.

### Control Location (explicit)
Use POST /api/control/location to pin the observer location for all reads until `control stop`.

CLI:
```bash
antikythera control location 40.7128,-74.0060 --timezone "America/New_York" --elevation 10 --name "New York, NY"
```

API:
```bash
curl -X POST http://localhost:3000/api/control/location \
  -H "Authorization: Bearer {{CONTROL_TOKEN}}" -H "Content-Type: application/json" \
  -d '{"latitude":40.7128,"longitude":-74.0060,"timezone":"America/New_York","name":"New York, NY","elevation":10}'
```

Notes:
- When a control location is set, `/api/state` and `/api/display` ignore `?lat/lon` overrides and use the control location (observer.source = "control").
- FrontFace lower-right shows the control location name and coordinates; sunrise/sunset/time use the provided timezone.

## Control Token Management

See also: docs/CONTROL_MODE.md

The server generates a persistent control token on first startup and reuses it across restarts.

- Location: `.antikythera/control-token` (gitignored)
- Override with env: `export ANTIKYTHERA_CONTROL_TOKEN=custom-token`
- Regenerate: delete the file and restart server

Normal usage (no setup):
```bash
npm run dev              # Uses existing token or generates new one
antikythera control ...  # CLI reads the same token automatically
```

API endpoints:
- `GET /api/control` (discovery)
- `GET /api/control/status`
- `POST /api/control/time|run|pause|animate|scene|location|stop`

**GET /api/display**

Complete state for physical mechanism implementation, including stepper motor control, servo positions, display text, and LED indicators.

```bash
curl http://localhost:3000/api/display
```

Query parameters (optional):
- `date`: ISO 8601 timestamp
- `lat`, `lon`, `elev`: Manual observer location override
- `precision=full`: Include per-body validation errors
- `include=astronomical`: Include raw astronomical data
- `dt`: Interval in seconds to compute `stepsForInterval` for steppers
- `stepsPerDegree`: Stepper resolution (steps/degree) used with `dt`

Example:
```bash
curl "http://localhost:3000/api/display?dt=5&stepsPerDegree=200"
```

**Response structure:**
```json
{
  "timestamp": "2025-10-28T23:01:45.595Z",
  "mechanical": {
    "steppers": {
      "sun": {
        "position": 215.781796586325,
        "velocity": 0.998847784120528,
        "velocityDegPerSec": 0.00001156,
        "direction": "CW",
        "altitude": 1.03761647984169,
        "azimuth": 253.005425613381
      },
      "moon": {
        "position": 297.396513944196,
        "velocity": 12.6810427226211,
        "velocityDegPerSec": 0.00014688,
        "direction": "CW",
        "altitude": 29.1465404202494,
        "azimuth": 172.636428072449
      },
      "mercury": {
        "position": 239.484014822145,
        "velocity": 1.01726211710803,
        "velocityDegPerSec": 0.00001178,
        "direction": "CW",
        "altitude": 11.1210731625624,
        "azimuth": 231.789630987122
      },
      "venus": {
        "position": 198.765298995648,
        "velocity": 1.24892443025954,
        "velocityDegPerSec": 0.00001445,
        "direction": "CW",
        "altitude": -7.17447701477178,
        "azimuth": 268.329661272134
      },
      "mars": {
        "position": 235.305780166959,
        "velocity": 0.710306073897129,
        "velocityDegPerSec": 0.00000822,
        "direction": "CW",
        "altitude": 11.0088598845841,
        "azimuth": 236.729874161838
      },
      "jupiter": {
        "position": 114.843230101557,
        "velocity": 0.0429114248708373,
        "velocityDegPerSec": 0.00000050,
        "direction": "CW",
        "altitude": -33.058690320916,
        "azimuth": 356.159190320464
      },
      "saturn": {
        "position": 355.938734706034,
        "velocity": -0.0490251765785956,
        "velocityDegPerSec": -0.00000057,
        "direction": "CCW",
        "altitude": 18.5780781054604,
        "azimuth": 109.053947533835
      },
      "lunar_nodes_ascending": {
        "position": 345.549624261153,
        "velocity": -0.0529544147843943,
        "velocityDegPerSec": -0.00000061,
        "direction": "CCW"
      },
      "lunar_nodes_descending": {
        "position": 165.549624261153,
        "velocity": -0.0529544147843943,
        "velocityDegPerSec": -0.00000061,
        "direction": "CCW"
      }
    },
    "servos": {
      "mercury_retrograde": { "angle": 0, "state": "prograde" },
      "venus_retrograde": { "angle": 0, "state": "prograde" },
      "mars_retrograde": { "angle": 0, "state": "prograde" },
      "jupiter_retrograde": { "angle": 0, "state": "prograde" },
      "saturn_retrograde": { "angle": 180, "state": "retrograde" }
    }
  },
  "digital": {
    "displays": {
      "oled_main": {
        "line1": "Next Eclipse: solar",
        "line2": "112 days",
        "line3": "2026-02-17"
      },
      "oled_secondary": {
        "line1": "Next Opposition: Mars",
        "line2": "73 days",
        "line3": "2026-01-09"
      },
      "lcd_cycles": {
        "line1": "Metonic: Year 7/19",
        "line2": "Saros: 43.2% complete"
      }
    },
    "leds": {
      "visibility": {
        "mercury": { "color": "red", "brightness": 0 },
        "venus": { "color": "red", "brightness": 0 },
        "mars": { "color": "red", "brightness": 0 },
        "jupiter": { "color": "red", "brightness": 0 },
        "saturn": { "color": "red", "brightness": 0 }
      }
    }
  },
  "next_eclipse": {
    "type": "solar",
    "kind": "annular",
    "date": "2026-02-17T12:11:53.939Z",
    "daysUntil": 111.548707685185,
    "local": {
      "kind": "partial",
      "obscuration": 0.0619434435634973,
      "partialBegin": null,
      "totalBegin": null,
      "peak": "2028-01-26T14:13:37.002Z",
      "totalEnd": null,
      "partialEnd": null
    },
    "details": null
  },
  "next_opposition": {
    "planet": "Mars",
    "date": "2026-01-09T11:41:19.629Z",
    "daysUntil": 72.5274772453704
  },
  "update_hints": {
    "mechanical": 10000,
    "digital": 1000
  },
  "system": {
    "healthy": true,
    "cached": false,
    "computation_time_ms": 22,
    "precision": {
      "validated_against": "NASA JPL HORIZONS",
      "validation_date": "2025-10-28",
      "coordinate_frame": "J2000 ecliptic",
      "calculation_method": "astronomy-engine (VSOP87/ELP2000)",
      "typical_error_arcsec": 1.61,
      "max_error_arcsec": 8.62,
      "validation_url": "https://github.com/mojoatomic/antikythera-engine-2/blob/main/docs/VALIDATION.md",
      "error_quantiles_arcsec": { "p50": 1.61, "p95": 8.3, "max": 8.62 }
    },
    "reproducibility": {
      "api_version": "1.1.0",
      "engine_version": "astronomy-engine v2.1.19",
      "git_sha": "f35c46e",
      "validation_span": { "start": "2025-10-26", "end": "2025-11-25" },
      "sample_count": 336,
      "conventions": {
        "angle_units": "degrees",
        "error_units": "arcsec",
        "longitude_wrap": "[0,360)",
        "apparent": true,
        "frame": "J2000 ecliptic"
      }
    },
    "debug": {
      "sun_altitude": 1.03761647984169,
      "twilight_stage": "day",
      "visibility_threshold": -6,
      "planets_above_horizon": 3,
      "sunrise": "2025-10-28T12:17:53.373Z",
      "sunset": "2025-10-28T23:09:15.655Z",
      "next_visibility_window": "2025-10-28T23:39:15.655Z",
      "ecliptic_coordinates": {
        "sun": { "lon": 215.781796586325, "lat": -0.00198583299563959 },
        "moon": { "lon": 297.396513944196, "lat": -4.71419906148846 },
        "mercury": { "lon": 239.484014822145, "lat": -2.83192440229897 },
        "venus": { "lon": 198.765298995648, "lat": 1.50313271290408 },
        "mars": { "lon": 235.305780166959, "lat": -0.363904907936811 },
        "jupiter": { "lon": 114.843230101557, "lat": 0.0778131485971996 },
        "saturn": { "lon": 355.938734706034, "lat": -2.47241398027667 }
      }
    },
    "observer": {
      "latitude": 35.1387,
      "longitude": -90.0095,
      "elevation": 0,
      "city": "Memphis",
      "country": "United States",
      "source": "ip_geolocation",
      "time_scale": "UTC"
    }
  }
}
```

**Units and conventions:**
- **position:** Ecliptic longitude in degrees [0, 360)
- **velocity:** Degrees per day (negative values indicate retrograde motion)
- **velocityDegPerSec:** Degrees per second (derived from `velocity`)
- **direction:** 'CW' when `velocityDegPerSec ≥ 0`, else 'CCW'
- **stepsForInterval:** Integer motor steps for window `dt` using `stepsPerDegree` (present only when both query params provided)
- **altitude:** Degrees above horizon [-90, 90] (negative = below horizon)
- **azimuth:** Compass direction in degrees [0, 360) (0=North, 90=East, 180=South, 270=West)
- **angle:** Servo position in degrees (0=prograde, 180=retrograde)
- **brightness:** LED brightness [0, 255]
- **daysUntil:** Fractional days until event
- **update_hints:** Suggested update intervals in milliseconds

### Detailed Astronomical Data
**GET /api/state**

Comprehensive astronomical calculations for visualization and analysis.

```bash
curl http://localhost:3000/api/state

# Historical or future date
curl http://localhost:3000/api/state?date=2024-06-21T12:00:00Z

# Custom observer location
curl "http://localhost:3000/api/state?lon=-122.42&lat=37.77&elev=50"
```

**Response structure:**
```json
{
  "date": "2025-10-26T15:27:31.358Z",
  "location": {
    "latitude": 37.5,
    "longitude": 23.0
  },
  "sun": {
    "longitude": 213.47,
    "latitude": -0.002,
    "rightAscension": 14.06,
    "declination": -12.55,
    "altitude": 1.26,
    "azimuth": 253.23,
    "velocity": 0.998,
    "angularVelocity": 0.042
  },
  "moon": {
    "longitude": 269.03,
    "latitude": -5.82,
    "phase": 55.81,
    "illumination": 0.22,
    "age": 4.51,
    "altitude": 20.28,
    "azimuth": 200.07,
    "velocity": 12.12
  },
  "planets": {
    "mercury": {
      "longitude": 236.97,
      "latitude": -2.72,
      "altitude": 10.30,
      "velocity": 1.11,
      "isRetrograde": false,
      "motionState": "prograde"
    }
    // ... venus, mars, jupiter, saturn
  },
  "nextEclipse": {
    "type": "solar",
    "date": "2026-02-17T12:11:53.939Z",
    "daysUntil": 113.86
  },
  "nextOpposition": {
    "planet": "Mars",
    "date": "2026-01-09T11:41:19.176Z",
    "daysUntil": 74.84
  },
  "metonicCycle": {
    "year": 7,
    "progress": 0.359,
    "anglePosition": 129.22
  },
  "sarosCycle": {
    "cycle": 1,
    "progress": 0.431,
    "anglePosition": 155.27,
    "daysUntilNext": 3745.00
  },
  "lunarNodes": {
    "ascendingNode": 345.67,
    "descendingNode": 165.67,
    "motionRate": -0.053,
    "nextNodePassage": {
      "daysUntil": 5.79,
      "type": "ascending"
    }
  }
}
```

### System Metadata
**GET /api/system**

Precision metadata, validation statistics, and reproducibility information.

```bash
curl http://localhost:3000/api/system
```

**Response structure:**
```json
{
  "timestamp": "2025-10-26T15:29:25.976Z",
  "system": {
    "healthy": true,
    "computation_time_ms": 29,
    "precision": {
      "validated_against": "NASA JPL HORIZONS",
      "validation_date": "2025-10-26",
      "coordinate_frame": "J2000 ecliptic",
      "calculation_method": "astronomy-engine (VSOP87/ELP2000)",
      "typical_error_arcsec": 1.4,
      "max_error_arcsec": 8.6,
      "validation_url": "https://github.com/mojoatomic/antikythera-engine-2/blob/main/docs/VALIDATION.md"
    },
    "reproducibility": {
      "api_version": "1.1.0",
      "engine_version": "astronomy-engine v2.1.19",
      "git_sha": "fb764bd",
      "sample_count": 7,
      "conventions": {
        "angle_units": "degrees",
        "error_units": "arcsec",
        "longitude_wrap": "[0,360)",
        "apparent": true,
        "frame": "J2000 ecliptic"
      }
    },
    "observer": {
      "latitude": 37.751,
      "longitude": -97.822,
      "elevation": 0,
      "country": "US",
      "source": "ip_geolocation",
      "time_scale": "UTC"
    }
  }
}
```

### Query Parameters

All endpoints support the following query parameters:

- **date** - ISO 8601 timestamp for historical/future calculations
  - Example: `?date=2024-06-21T12:00:00Z`
- **lon**, **lat**, **elev** - Manual observer location override
  - Example: `?lon=-122.42&lat=37.77&elev=50`
  - Units: longitude/latitude in degrees, elevation in meters
- **precision=full** - Include per-body validation errors (debugging)

## Validation

### Quick Validation (Single Body)
Verify Moon position against current conditions:
```bash
node scripts/validate-simple.js
```

### Comprehensive Validation (All Bodies vs HORIZONS)
Complete validation against NASA JPL HORIZONS ephemeris:
```bash
node scripts/validate-all-bodies.js
```

Expected output: All bodies pass with errors under 10 arcseconds.

### Configuration System Integration Tests
End-to-end testing of the JSON configuration system:
```bash
./scripts/test-config-integration.sh
```

Tests 10 scenarios including:
- Default configuration and auto mode
- Manual observer location from config
- Config layering and hot reload
- Query parameter overrides
- Validation modes (strict and loose)
- Control mode interaction
- Unknown key handling
- Custom config paths

Expected output: 40/40 tests passing. Runtime approximately 2-3 minutes.

### Validation Results Summary

Comparison against NASA JPL HORIZONS System performed on 2025-10-26:

| Body    | Longitude Error | Latitude Error |
|---------|-----------------|----------------|
| Sun     | 0.4"           | 0.7"           |
| Moon    | 1.9"           | 0.3"           |
| Mercury | 1.4"           | 2.1"           |
| Venus   | 1.1"           | 0.3"           |
| Mars    | 0.5"           | 1.6"           |
| Jupiter | 2.8"           | 1.1"           |
| Saturn  | 8.6"           | 0.5"           |

- **Median error:** 1.4 arcseconds
- **Maximum error:** 8.6 arcseconds (Saturn longitude)
- **Method:** Topocentric ecliptic coordinate comparison
- **Observer:** 37.751°N, 97.822°W

For context, the human eye has a resolution of approximately 60 arcseconds, and typical planetarium software operates at 10-30 arcsecond precision. The maximum error of 8.6 arcseconds represents approximately 0.5% of the Moon's apparent diameter.

Complete validation methodology, coordinate frame specifications, and reproducibility instructions are documented in `docs/VALIDATION.md`.

## Architecture

### Backend
- **Runtime:** Node.js with Express
- **Calculations:** astronomy-engine library (VSOP87/ELP2000 planetary theories)
- **Design:** Stateless REST API
- **Deployment:** Single process, horizontal scaling supported

### Astronomical Engine
- **Planetary Theory:** VSOP87 (Variations Séculaires des Orbites Planétaires)
- **Lunar Theory:** ELP2000 (Ephéméride Lunaire Parisienne)
- **Corrections:** Light-time delay, stellar aberration, parallax, atmospheric refraction
- **Coordinate Systems:** Ecliptic (J2000), Equatorial (J2000), Horizontal (topocentric)

### Observer Location

Observer location is resolved using the following priority order:

1. **Control location** (highest) - Set via `POST /api/control/location` or control CLI commands
2. **Config manual mode** - Fixed location from `config/settings.local.json` when `observer.mode: "manual"`
3. **Query parameters** - Temporary override via `?lat=X&lon=Y&elev=Z`
4. **IP geolocation** - Automatic detection when `observer.mode: "auto"` (default)
5. **Fallback** (lowest) - Memphis, Tennessee (35.1184°N, 90.0489°W) if all else fails

See `config/README.md` for complete configuration documentation.

### Performance Characteristics
- **Computation time:** 25-75ms typical per request
- **Update rate:** Suitable for 1-10 Hz display refresh
- **Scalability:** Stateless design enables horizontal scaling
- **Caching:** No built-in caching (stateless design principle)

## Historical Context

The Antikythera mechanism (circa 100 BCE) was discovered in 1901 in a Roman-era shipwreck off the Greek island of Antikythera. The device represents one of the most sophisticated technological artifacts from the ancient world, using approximately 30 meshing bronze gears to predict:

- Solar and lunar positions
- Moon phases
- Eclipse timing (Saros cycle)
- Planetary positions (Mercury through Saturn)
- Olympic game cycles
- Ancient Greek calendar cycles (Metonic, Callippic)

This software recreates the mechanism's computational capabilities using modern astronomical calculations via the astronomy-engine library, while maintaining similar output formats for compatibility with physical implementations. The `/api/display` endpoint specifically provides data formatted for stepper motors, servos, and display elements, enabling construction of physical replicas with accurate astronomical behavior.

## Use Cases

### Educational Demonstrations
Interactive astronomy learning tools demonstrating celestial mechanics, coordinate systems, and historical astronomical knowledge. The system provides real-time data suitable for classroom demonstrations, museum exhibits, and public outreach.

### Physical Mechanisms
The `/api/display` endpoint provides motor control data suitable for:
- Motorized orreries and planetariums
- Physical Antikythera mechanism replicas
- Robotic telescope pointing systems (within precision limits)
- Interactive museum exhibits with mechanical components

Update hints in the response suggest appropriate refresh intervals for mechanical (10 seconds) and digital (1 second) components.

### Digital Displays
Planetarium visualization, observatory displays, public astronomy installations, and educational kiosks. The comprehensive coordinate data supports various display formats and projection systems.

### Research and Development
Astronomical algorithm testing, historical astronomy research, and coordinate system demonstrations. The validation against HORIZONS and reproducibility metadata make the system suitable for educational research contexts.

## Project Structure

```
antikythera-engine-2/
├── server.js              # Main API server
├── src/
│   ├── constants/
│   │   └── validation.js  # Validation statistics
│   └── utils/
│       └── metadata.js     # Version and git SHA extraction
├── scripts/
│   ├── validate-simple.js           # Quick validation (Moon only)
│   ├── validate-all-bodies.js       # Comprehensive HORIZONS comparison
│   ├── test-config-integration.sh   # End-to-end config system tests (40 scenarios)
│   └── dump-horizons.js             # HORIZONS API diagnostic tool
├── docs/
│   └── VALIDATION.md      # Complete validation methodology
└── public/
    └── index.html         # Example visualization client
```

## Technical Stack

- **Language:** JavaScript (Node.js)
- **Framework:** Express
- **Astronomy:** astronomy-engine v2.1.19
- **Testing:** Jest unit tests (78 tests), HORIZONS validation scripts, configuration integration tests (40 scenarios)
- **Documentation:** Markdown with validation reports

## Limitations and Known Issues

### Precision Boundaries
- Maximum validated error: 8.6 arcseconds (suitable for display applications)
- Not validated for occultation predictions requiring sub-arcsecond precision
- Not validated for satellite tracking or orbital mechanics
- Single validation point (2025-10-26); extended temporal validation pending

### Coordinate Systems
- Primary output: J2000 ecliptic coordinates (apparent positions)
- Atmospheric refraction applied for horizontal coordinates
- No proper motion corrections (suitable for solar system bodies only)

### Observer Location
- IP geolocation provides city-level accuracy (may vary by several degrees)
- Manual configuration via `config/settings.local.json` recommended for fixed installations
- Query parameter override available for per-request location specification
- All internal calculations use UTC; timezone handling for display purposes only

### Computational Limitations
- No caching (every request performs full calculation)
- No batch computation endpoints
- Computation time scales linearly with number of bodies

### Development Status
This software is currently in active development. While validation demonstrates suitable precision for intended use cases, the API and response formats may evolve. Production deployment should account for potential changes.

## Contributing

Contributions are welcome in the following areas:

### Extended Validation
- Multiple time periods (historical and future dates)
- Multiple observer locations (latitude/longitude diversity)
- Statistical analysis of error distribution

### Documentation
- Additional use case examples
- Physical mechanism integration guides
- Coordinate system transformation documentation

### Features
- Additional astronomical phenomena (transits, planetary configurations)
- Performance optimizations
- Batch computation endpoints

### Physical Implementations
- Example Arduino/Raspberry Pi integration code
- Stepper motor control libraries
- Display formatting utilities

## Documentation

- **API Documentation:** Complete endpoint descriptions in this README
- **Configuration:** `config/README.md` (settings, validation, hot reload)
- **Control Mode:** `docs/CONTROL_MODE.md` (classroom control, authentication)
- **CLI/REPL:** `docs/CLI-REPL.md` (interactive commands, data export)
- **Validation Results:** `docs/VALIDATION.md` (methodology, coordinate frames, error analysis)
- **Technical Operations:** `docs/TECHNICAL_OPERATIONS_MANUAL.md` (architecture, performance)
- **Precision Metadata:** Included in all `/api/system` responses
- **Coordinate Systems:** Documented in validation file

## Citation

If using this software in research, education, or publication, please cite:

```
Fennell, D. (2025). Antikythera Engine: Astronomical Ephemeris API.
GitHub: https://github.com/mojoatomic/antikythera-engine-2
```

For academic citation, see `CITATION.cff` in repository.

## License

Copyright 2025 Doug Fennell

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Acknowledgments

- **Astronomy calculations:** Don Cross (astronomy-engine library)
- **Validation authority:** NASA JPL HORIZONS System
- **Historical inspiration:** Ancient Greek Antikythera mechanism (circa 100 BCE)
- **Planetary theories:** VSOP87 (Bureau des Longitudes), ELP2000 (Paris Observatory)

## Support

- **Issues:** https://github.com/mojoatomic/antikythera-engine-2/issues
- **Documentation:** https://github.com/mojoatomic/antikythera-engine-2/blob/main/docs/
- **Validation:** https://github.com/mojoatomic/antikythera-engine-2/blob/main/docs/VALIDATION.md
