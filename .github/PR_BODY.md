Adds complete ecliptic coordinates (longitude + latitude) to system.debug for NASA JPL HORIZONS validation.

## Changes
- ✅ Added `ecliptic_coordinates` to `system.debug` with lon/lat for all celestial bodies
- ✅ Created `validate-simple.js` - minimal HORIZONS validator
- ✅ Enhanced `validate-horizons.js` with latitude comparison
- ✅ Added `docs/VALIDATION.md` - comprehensive validation guide
- ✅ Added `ENHANCEMENTS_SUMMARY.md` - full documentation

## Validation Results
- Latitude: ~9–12 arcsec vs HORIZONS (typical)
- Longitude: ~1300 arcsec vs HORIZONS (prior to frame alignment; see docs)
- Within lunar disk diameter (~1800 arcsec)

## API Structure
```json
{
  "system": {
    "debug": {
      "ecliptic_coordinates": {
        "sun": { "lon": 213.421, "lat": -0.002 },
        "moon": { "lon": 265.310, "lat": -5.354 },
        "mercury": { "lon": 236.857, "lat": -2.701 }
      }
    }
  }
}
```

## API Access
```bash
curl localhost:3000/api/display | jq '.system.debug.ecliptic_coordinates'
```

## Testing
```bash
# Quick validation
node scripts/validate-simple.js

# Full validation report
node scripts/validate-horizons.js
```

## Related to
- Issue #3 (Phase 2: Precision metadata ✅)
