# HORIZONS Validation Guide

## Overview

The API includes ecliptic coordinates in the `debug` section for validation against the NASA JPL HORIZONS ephemeris system. Two frames are exposed and validated independently — the dual-frame architecture is described below.

## Dual-frame architecture (ECL + ECT)

The engine exposes ecliptic coordinates in two frames simultaneously:

| Frame | Field | Purpose |
| --- | --- | --- |
| **ECL** — J2000 mean ecliptic | `system.debug.ecliptic_coordinates` | Inertial/orbital outputs; default for `sun`, `moon`, `planets.*`, `lunarNodes` |
| **ECT** — True ecliptic of date | `system.debug.ecliptic_coordinates_ect` | Tropical zodiac path (`zodiac` block); HORIZONS OBSERVER+QUANTITIES=31 validation |

The two frames differ by accumulated precession of the equinoxes — ~50.291″/yr ≈ 22 arcmin between J2000 and 2026. Engine-to-engine the difference is computed by `astronomy.Ecliptic()` (which applies precession + nutation to convert EQJ→ECT) versus the canonical `Rotation_EQJ_ECL` rotation matrix (which is constant — both EQJ and ECL are J2000-fixed).

**A top-level `coordinate_frames` map** appears on every `/api/state`, `/api/state/:date`, and `/api/display` response, declaring which frame each field uses. Same shape across endpoints.

## Dual-validator architecture

Because HORIZONS treats `REF_SYSTEM=J2000` differently for OBSERVER vs VECTORS queries, two distinct validators are needed — one for each frame:

| Validator | HORIZONS query | Frame validated | API field |
| --- | --- | --- | --- |
| `validate-extended.js` | `EPHEM_TYPE=OBSERVER`, `QUANTITIES=31` | ECT | `ecliptic_coordinates_ect` |
| `validate-all-bodies.js` | same | ECT | `ecliptic_coordinates_ect` |
| `validate-horizons.js`, `validate-simple.js` | same | ECT | `ecliptic_coordinates_ect` |
| `validate-ecl-vectors.js` | `EPHEM_TYPE=VECTORS`, `REF_PLANE=ECLIPTIC`, `REF_SYSTEM=J2000`, `VEC_CORR=LT+S` | ECL | `ecliptic_coordinates` |

OBSERVER+Q31 returns `ObsEcLon/ObsEcLat` in true ecliptic of date regardless of `REF_SYSTEM` (which only affects vector ephemerides), so it's the natural ECT ground truth. `validate-ecl-vectors.js` queries VECTORS with topocentric center and `VEC_CORR=LT+S` (light-time + stellar aberration) to match the API's topocentric apparent path.

### Per-body thresholds

Validators use a **per-body 3× p95 tolerance** drawn from `constants/validation.js` rather than a flat ° threshold. The flat 0.1° (= 360″) threshold previously in use was 200–400× looser than the engine's claimed sub-2″ accuracy and would have masked the 22-arcmin frame bug this PR fixes.

```text
sun     2.73″   (3× 0.91″ p95)
moon    16.53″  (3× 5.51″ p95)
mercury 7.11″
venus   6.30″
mars    2.22″
jupiter 9.96″
saturn  25.80″
```

The threshold scales automatically as `constants/validation.js` is refreshed from measured runs.

### Structural regression guard

`scripts/frame-correctness-check.js` is a fast, network-free CI hook that verifies the ECL/ECT split is intact by computing Sun longitude through both helpers at four epochs (J2000.0, +10y, +26y, +50y) and asserting the precession-of-equinoxes signature:

* At J2000.0: `|ECL − ECT| < 20″` (within nutation envelope only)
* At J2000+Δt: signed `(ECT − ECL) ≈ +50.291″/yr × Δt within ±20″` — the *signed* check catches a swap of the two helpers, which is the bug class this guard exists to defend against
* ECL longitude after one sidereal year drifts < 30″ (orbital noise; precession-free)

Run as `node scripts/frame-correctness-check.js`; exit 0 on pass, non-zero on fail.



## API Structure

### Ecliptic Coordinates (Always Available)

Both frames are exposed under `system.debug` (illustrative shape; values vary by date):

```json
{
  "system": {
    "debug": {
      "ecliptic_coordinates": {       /* ECL — J2000 mean ecliptic */
        "sun":     { "lon": ..., "lat": ... },
        "moon":    { "lon": ..., "lat": ... },
        "mercury": { "lon": ..., "lat": ... },
        "venus":   { "lon": ..., "lat": ... },
        "mars":    { "lon": ..., "lat": ... },
        "jupiter": { "lon": ..., "lat": ... },
        "saturn":  { "lon": ..., "lat": ... }
      },
      "ecliptic_coordinates_ect": {   /* ECT — true ecliptic of date */
        "sun":     { "lon": ..., "lat": ... }
        /* same shape; same body set */
      }
    }
  }
}
```

For 2026-era epochs, `ecliptic_coordinates_ect` longitudes are ~22 arcmin ahead of `ecliptic_coordinates` longitudes — that's the accumulated precession of the equinoxes since J2000.

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

- **Default frame**: J2000 mean ecliptic (ECL) — used by `ecliptic_coordinates`, `sun`, `moon`, `planets.*`, `lunarNodes`.
- **Zodiac frame**: True ecliptic of date (ECT) — used by `zodiac` and the `ecliptic_coordinates_ect` debug block.
- **Type**: Topocentric apparent (observer-based, light-time + stellar aberration)
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

### Frame/Epoch Alignment

The current dual-frame architecture replaces the historical implementation, which routed all ecliptic outputs through `astronomy.Ecliptic()` — producing *true ecliptic of date* (ECT) under an `ecliptic_j2000` label. The `~0.36°` offset historically attributed to "coordinate frame issues" was the precession-of-equinoxes signature: `astronomy.Ecliptic()` applies precession + nutation, not just the EQJ→ECL rotation the field name implied.

Today:

* **ECL path** uses the canonical `Rotation_EQJ_ECL → RotateVector → SphereFromVector` chain (cached rotation matrix; J2000-fixed). Validated by `validate-ecl-vectors.js` against HORIZONS `EPHEM_TYPE=VECTORS`, `REF_PLANE=ECLIPTIC`, `REF_SYSTEM=J2000`, `VEC_CORR=LT+S`.
* **ECT path** uses an explicit `eclipticFromEquatorVec_EQJ_to_ECT` wrapper around `astronomy.Ecliptic()`. Validated by the OBSERVER+Q31 scripts against `ObsEcLon/ObsEcLat` (which is ECT regardless of `REF_SYSTEM`).
* Timestamps preserve seconds — for Moon, 60s ≈ 0.2–0.5°.

Result: arcsecond-level agreement on both frames.
