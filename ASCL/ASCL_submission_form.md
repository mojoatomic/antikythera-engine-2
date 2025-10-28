# ASCL Submission Form - Antikythera Engine

## Quick Copy Version for Web Form

### Software Name
Antikythera Engine

### Software Description (Short)
Astronomical ephemeris API providing NASA-validated celestial body positions for educational displays and physical mechanism control, inspired by the ancient Greek Antikythera mechanism.

### Software Description (Detailed)
The Antikythera Engine calculates real-time positions of celestial bodies (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn) with validated sub-10-arcsecond precision. The system provides structured outputs for both digital visualization and physical mechanism control, recreating the computational capabilities of the ancient Antikythera mechanism (circa 100 BCE) using modern astronomical calculations.

The software has been validated against NASA JPL HORIZONS ephemeris system, achieving typical errors of 1.4 arcseconds (median) with maximum error of 8.6 arcseconds across all seven celestial bodies tested. Validation methodology includes topocentric ecliptic coordinate comparison with comprehensive documentation of results.

Primary use cases include educational demonstrations, planetarium displays, physical orrery control systems, and historical mechanism reconstruction. The API provides both simplified summary endpoints and detailed ephemeris data suitable for mechanical device control protocols.

### Programming Language(s)
JavaScript (Node.js)

### Code Repository URL
https://github.com/mojoatomic/antikythera-engine-2

### Code Repository Type
GitHub

### Software Version
2.0.0

### Software License
MIT License

### Primary Author Name
Doug Fennell

### Primary Author Email
doug@c2cfirm.com

### Primary Author ORCID (if available)
0009-0003-0995-4871

### Keywords
astronomical ephemeris, celestial mechanics, antikythera mechanism, planetarium, astronomy education, orrery control, NASA validation, VSOP87, ELP2000

### Astronomy Subject Keywords (ADS)
ephemerides, celestial mechanics, astronomical software, educational astronomy, historical astronomy

### Dependencies
- astronomy-engine (v2.1.19)
- Express.js
- Node.js (v14+)

### Operating System(s)
Platform-independent (Node.js)

### Additional Notes
Software includes comprehensive validation suite with NASA HORIZONS comparison scripts. Validation results demonstrate sub-10-arcsecond accuracy suitable for professional astronomical applications. Documentation includes complete API specification, validation methodology, and integration examples for physical mechanism control.

The project bridges historical astronomy (ancient Greek Antikythera mechanism) with modern computational methods, providing educational value alongside practical utility for astronomy demonstrations and physical display systems.

### Citation Information
See CITATION.cff file in repository root for standardized citation format compatible with GitHub's citation features.

### Related Publications (if any)
[Leave blank unless you have published papers about this software]

### Website/Documentation URL
Repository README and docs/ directory contain complete documentation including:
- API endpoint specifications
- Validation methodology and results
- Integration examples
- Physical mechanism control protocols
