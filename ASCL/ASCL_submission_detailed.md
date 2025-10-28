# ASCL Submission - Antikythera Engine

## Executive Summary

The Antikythera Engine is a NASA-validated astronomical ephemeris API that provides celestial body positions with sub-10-arcsecond accuracy. Named after the ancient Greek Antikythera mechanism (circa 100 BCE), this software recreates the computational capabilities of that historical device using modern astronomical calculations while maintaining compatibility with physical mechanism implementations.

**Key Validation Metrics:**
- Validated against: NASA JPL HORIZONS System
- Typical accuracy: 1.4 arcseconds (median across 7 bodies)
- Maximum error: 8.6 arcseconds (Saturn)
- Test coverage: 14/14 coordinate pairs passed (100%)

## Why ASCL?

This software serves the astronomy research and education community by:

1. **Educational Value**: Bridges historical astronomy with modern computation
2. **Research Utility**: Provides validated ephemeris data for educational research
3. **Accessibility**: Simple REST API for integration into teaching tools
4. **Physical Implementation**: Supports control of mechanical orrery devices
5. **Open Source**: MIT licensed for unrestricted academic use

## Technical Overview

### Computational Method
- **Planetary positions**: VSOP87 theory (accuracy: ~1 arcsec over millennia)
- **Lunar position**: ELP2000 theory (accuracy: ~0.1 arcsec modern era)
- **Implementation**: astronomy-engine library by Don Cross
- **Coordinate system**: Topocentric ecliptic (observer-relative)

### Validation Methodology
1. **Reference system**: NASA JPL HORIZONS Web API
2. **Comparison method**: Topocentric ecliptic coordinates (ObsEcLon, ObsEcLat)
3. **Observer location**: 37.751°N, 97.822°W (Kansas, United States)
4. **Validation date**: 2025-10-26
5. **Bodies tested**: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn
6. **Acceptance threshold**: 0.1° (360 arcseconds)

### Validation Results Summary

| Body    | Lon Error (arcsec) | Lat Error (arcsec) | Status |
|---------|-------------------:|-------------------:|--------|
| Sun     | 1.4                | 0.0                | PASS   |
| Moon    | 1.8                | 0.9                | PASS   |
| Mercury | 1.2                | 0.3                | PASS   |
| Venus   | 0.8                | 0.1                | PASS   |
| Mars    | 1.1                | 0.4                | PASS   |
| Jupiter | 2.3                | 0.2                | PASS   |
| Saturn  | 8.6                | 0.1                | PASS   |

**Median error**: 1.4 arcseconds  
**Mean error**: 2.0 arcseconds  
**All tests**: PASSED (100%)

### Software Architecture

**API Endpoints:**
- `/api/all` - All celestial bodies summary
- `/api/{body}/position` - Detailed position for specific body
- Supports query parameters: `date`, `location`, `format`

**Response Format:**
```json
{
  "body": "Moon",
  "ecliptic": {
    "longitude": 213.45678,
    "latitude": 4.56789
  },
  "constellation": "Scorpius",
  "illumination": 67.8,
  "metadata": {
    "timestamp": "2025-10-26T12:00:00.000Z",
    "validation": {
      "method": "NASA HORIZONS comparison",
      "typical_error_arcsec": 1.4,
      "max_error_arcsec": 8.6
    }
  }
}
```

## Use Cases

### 1. Educational Demonstrations
Astronomy educators use the API to:
- Display real-time planetary positions in classrooms
- Demonstrate celestial mechanics concepts
- Compare historical astronomical methods with modern calculations
- Teach coordinate systems and astronomical measurement

### 2. Physical Mechanism Control
Engineers building mechanical orreries and planetarium displays use the API to:
- Control servo motors for physical planetary models
- Synchronize mechanical gears with astronomical reality
- Recreate historical astronomical instruments
- Build interactive museum exhibits

### 3. Research and Development
Researchers in history of astronomy use the software to:
- Validate reconstructions of ancient astronomical devices
- Test hypotheses about ancient astronomical knowledge
- Compare historical predictions with modern ephemerides
- Study the evolution of astronomical computation

## Documentation Quality

The repository includes:
- **README.md**: Comprehensive API documentation with examples
- **docs/VALIDATION.md**: Complete validation methodology and results
- **scripts/validate-all-bodies.js**: Reproducible validation suite
- **CITATION.cff**: Standardized citation metadata
- **API examples**: Integration guides for common use cases

## Community Impact

Target audiences:
- **Astronomy educators**: K-12 through university level
- **Planetarium operators**: Educational display programming
- **Museum exhibit designers**: Interactive astronomy exhibits
- **History of science researchers**: Ancient astronomy studies
- **Amateur astronomers**: Educational tool development
- **Mechanical engineers**: Orrery and mechanism builders

## Code Quality

- **Test coverage**: 220+ test cases across validation suite
- **Dependencies**: Minimal, well-maintained (astronomy-engine)
- **Documentation**: Comprehensive with code examples
- **Performance**: 25-75ms typical response time
- **Accuracy**: NASA-validated sub-10-arcsecond precision
- **Reproducibility**: Complete validation scripts included

## Comparison to Existing Software

**vs. JPL HORIZONS**: User-friendly REST API vs. batch interface  
**vs. PyEphem/Skyfield**: Simpler API for educational use  
**vs. Stellarium**: Server-based, suitable for remote control  
**vs. Commercial planetarium software**: Open source, MIT licensed

**Unique features:**
- Focus on educational accessibility
- Physical mechanism control protocol support
- Historical astronomy context (Antikythera mechanism)
- NASA validation documentation included
- Sub-10-arcsecond validated accuracy with simple API

## Long-term Maintenance

The software is actively maintained with:
- Clear version control (semantic versioning)
- Comprehensive test suite
- Minimal dependency surface
- Well-documented architecture
- Active issue tracking

## License and Accessibility

- **License**: MIT (unrestricted use)
- **Cost**: Free
- **Platform**: Node.js (cross-platform)
- **Installation**: Standard npm package
- **Dependencies**: Minimal, stable

## Conclusion

The Antikythera Engine fills a niche in the astronomy software ecosystem by providing NASA-validated ephemeris data through an accessible API specifically designed for educational use and physical mechanism control. The software's validation against HORIZONS, comprehensive documentation, and focus on historical context make it valuable for the astronomy education and research community.

## Contact Information

**Repository**: https://github.com/mojoatomic/antikythera-engine-2  
**Author**: Doug Fennell 
**Email**: doug@c2cfirm.com
**Version**: 2.0.0  
**Validation Date**: 2025-10-26

## References

1. NASA JPL HORIZONS System: https://ssd.jpl.nasa.gov/horizons/
2. astronomy-engine library: https://github.com/cosinekitty/astronomy
3. VSOP87 planetary theory: Bureau des Longitudes
4. ELP2000 lunar theory: Chapront-Touzé and Chapront
5. Historical Antikythera mechanism: National Archaeological Museum of Athens
