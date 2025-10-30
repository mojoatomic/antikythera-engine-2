# HORIZONS Validation Guide

## Overview

The API includes ecliptic coordinates in the `debug` section for validation against the NASA JPL HORIZONS ephemeris system.

## API Structure

### Ecliptic Coordinates (Always Available)

```json
{
  "system": {
    "debug": {
      "ecliptic_coordinates": {
        "sun": { "lon": 213.421, "lat": -0.002 },
        "moon": { "lon": 265.298, "lat": -5.353 },
        "mercury": { "lon": 236.857, "lat": -2.701 },
        "venus": { "lon": 195.719, "lat": 1.522 },
        "mars": { "lon": 233.733, "lat": -0.338 },
        "jupiter": { "lon": 115.071, "lat": 0.074 },
        "saturn": { "lon": 356.440, "lat": -2.478 }
      }
    }
  }
}
```

### Accessing the Data

```bash
# Get all ecliptic coordinates
curl -s "http://localhost:3000/api/display" | jq '.system.debug.ecliptic_coordinates'

# Get just the moon
curl -s "http://localhost:3000/api/display" | jq '.system.debug.ecliptic_coordinates.moon'
```

## HORIZONS Validation

### Quick Validation

Use the simple validation script:

```bash
node scripts/validate-simple.js
```

Output:
```
📍 YOUR API (debug.ecliptic_coordinates.moon):
  lon: 265.298570°
  lat: -5.353659°

🛰️  NASA HORIZONS:
  ObsEcLon: 264.927554°
  ObsEcLat: -5.350217°

📊 VALIDATION:
  Δ Longitude: 0.371016° (1335.66 arcsec)
  Δ Latitude:  0.003442° (12.39 arcsec)
```

### Full Validation

Use the comprehensive validator:

```bash
node scripts/validate-horizons.js
```

## Coordinate System

- **Frame**: Ecliptic J2000
- **Type**: Topocentric (observer-based)
- **Default Location**: Athens (37.5°N, 23.0°E)
- **Elevation**: 0m (sea level)

### Changing Observer Location

Observer location can be configured using the validated JSON configuration system or query parameters:

```bash
# Via query parameters (temporary override)
curl "http://localhost:3000/api/display?lat=40.7&lon=-74.0"

# Via configuration file (persistent)
# See config/README.md for complete configuration documentation
```

## Precision Standards

| Purpose | Tolerance | Status |
|---------|-----------|--------|
| Display purposes | ±0.1° (360 arcsec) | ✅ Target |
| Professional ephemeris | ±0.01° (36 arcsec) | 🎯 Goal |
| Lunar Laser Ranging | ±0.0001° (0.36 arcsec) | 🔬 Reference |

## Current Performance

### Extended Validation Results

**Methodology:** 48 samples over 30 days (2025-10-26 to 2025-11-25), Athens observer (37.5°N, 23°E), compared against NASA JPL HORIZONS.

**Engine:** VSOP87/ELP2000 via astronomy-engine

**Accuracy (arcseconds vs HORIZONS):**

| Body    | Lon p50 | Lon p95 | Lon max | Lat p50 | Lat p95 | Lat max |
|---------|---------|---------|---------|---------|---------|----------|
| Sun     | 0.52    | 0.91    | 0.96    | 0.40    | 0.66    | 0.70     |
| Moon    | 2.61    | 5.51    | 6.04    | 0.64    | 1.13    | 1.28     |
| Mercury | 0.78    | 2.37    | 2.59    | 1.36    | 3.98    | 4.11     |
| Venus   | 1.39    | 2.10    | 2.37    | 0.40    | 1.45    | 1.52     |
| Mars    | 0.44    | 0.74    | 0.91    | 1.32    | 1.54    | 1.61     |
| Jupiter | 2.96    | 3.32    | 3.38    | 1.35    | 1.54    | 1.58     |
| Saturn  | 8.22    | 8.60    | 8.62    | 0.50    | 0.70    | 0.73     |

**Overall aggregate:** p50=1.61", p95=8.30", max=8.62"

**Interpretation:**
- Median error: 1.61" (0.00045°) - **excellent for display**
- 95th percentile: 8.30" (0.0023°) - **well within professional standards**
- Maximum error: 8.62" (Saturn longitude) - **expected for outer planets with VSOP87**

All bodies achieve sub-arcsecond to few-arcsecond precision, meeting display quality standards (360" tolerance) with significant margin.

## Manual HORIZONS Verification

1. Visit https://ssd.jpl.nasa.gov/horizons/app.html
2. Settings:
   - **Command**: `301` (Moon)
   - **Center**: `coord@399` (Topocentric)
   - **Site**: `23.0, 37.5, 0` (lon, lat, elev in km)
   - **Time**: Your timestamp in UTC
   - **Table Settings**: 
     - Quantities: `31` (Observer ecliptic lon/lat)
     - Format: CSV
3. Compare `ObsEcLon` and `ObsEcLat` with your API values

## Validation Code Example

```javascript
const apiData = await fetch('http://localhost:3000/api/display').then(r => r.json());
const yourMoon = apiData.system.debug.ecliptic_coordinates.moon;

// Compare with HORIZONS
const delta_lon = Math.abs(horizons.ObsEcLon - yourMoon.lon);
const delta_lat = Math.abs(horizons.ObsEcLat - yourMoon.lat);

console.log(`Δ Longitude: ${delta_lon}°`);
console.log(`Δ Latitude: ${delta_lat}°`);
```

## Why Include This?

The Antikythera mechanism was humanity's first astronomical computer. By validating against NASA JPL HORIZONS data, we honor that legacy by ensuring our reconstruction is astronomically accurate—something the ancient Greeks would have appreciated!

---

## Comprehensive Validation (All Bodies)

This repository includes a comprehensive validator that compares ecliptic longitude/latitude for Sun, Moon, and visible planets against NASA JPL HORIZONS using the current API observer (topocentric) and exact timestamp (to the second).

### Run
```bash path=null start=null
node scripts/validate-all-bodies.js
```

- Automatically uses `system.observer` from the API response (IP geolocation or manual override via `?lat=&lon=`).
- HORIZONS query uses the same topocentric site (`SITE_COORD`), REF_SYSTEM=J2000, REF_PLANE=ECLIPTIC.
- Preserves seconds in time to avoid lunar fast-motion errors.

### Expected Output (sample)
```text path=null start=null
Timestamp: 2025-10-26T06:57:28.599Z
Location: 37.751°N, -97.822°E (US)
Source: ip_geolocation

[PASS] sun        Δlon=   0.0001°  Δlat=   0.0002°
[PASS] moon       Δlon=   0.0006°  Δlat=   0.0001°
[PASS] mercury    Δlon=   0.0004°  Δlat=   0.0006°
[PASS] venus      Δlon=   0.0003°  Δlat=   0.0001°
[PASS] mars       Δlon=   0.0001°  Δlat=   0.0004°
[PASS] jupiter    Δlon=   0.0008°  Δlat=   0.0003°
[PASS] saturn     Δlon=   0.0024°  Δlat=   0.0001°
```

### Frame/Epoch Alignment (what fixed the 0.36° offset)
- astronomy-engine: compute topocentric vector in J2000 equator (`Equator(..., ofdate=false)`), then convert using `Astronomy.Ecliptic(eqjVector)` to obtain true ecliptic-of-date angles.
- HORIZONS: `REF_SYSTEM=J2000`, `REF_PLANE=ECLIPTIC` (documented in header).
- Preserve exact seconds in timestamp; for Moon, 60s ≈ 0.2–0.5°.

Result: arcsecond-level agreement across all bodies.
