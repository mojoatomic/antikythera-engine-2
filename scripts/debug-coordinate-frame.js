#!/usr/bin/env node

/**
 * Debug the systematic 0.36° coordinate offset
 * 
 * Hypothesis: The offset is consistent across all bodies (Sun, Moon, planets),
 * suggesting it's a coordinate frame/epoch issue, not parallax or observer location.
 * 
 * Possible causes:
 * 1. Time conversion issue (UT vs TT)
 * 2. Ecliptic frame epoch mismatch (J2000 vs mean-of-date)
 * 3. Precession not being applied correctly
 * 4. Equinox/equator reference difference
 */

const astronomy = require('astronomy-engine');

const date = new Date('2025-10-26T06:23:19.116Z');
const observer = new astronomy.Observer(37.5, 23.0, 0);

console.log('Investigating systematic 0.36° offset\n');
console.log('Date:', date.toISOString());
console.log('Observer: Athens (23.0°E, 37.5°N)\n');
console.log('='.repeat(80));

// Test 1: Check what coordinate system astronomy-engine uses
console.log('\n1. ASTRONOMY-ENGINE COORDINATE SYSTEM:');
const sunEq = astronomy.Equator('Sun', date, observer, true, true);
const sunEcl = astronomy.Ecliptic(sunEq.vec);

console.log('Sun equatorial:', {
  ra: sunEq.ra,
  dec: sunEq.dec,
  dist: sunEq.dist
});
console.log('Sun ecliptic:', {
  elon: sunEcl.elon,
  elat: sunEcl.elat
});

// Test 2: Try different ways to get ecliptic coordinates
console.log('\n2. ALTERNATIVE CALCULATION METHODS:');

// Method A: Direct geocentric ecliptic (no observer)
const sunEqGeo = astronomy.Equator('Sun', date, null, true, true);
const sunEclGeo = astronomy.Ecliptic(sunEqGeo.vec);
console.log('Geocentric (no observer):', {
  elon: sunEclGeo.elon,
  elat: sunEclGeo.elat
});

// Method B: Using EclipticGeoMoon for Moon
const moonGeo = astronomy.EclipticGeoMoon(date);
console.log('EclipticGeoMoon:', {
  lon: moonGeo.lon,
  lat: moonGeo.lat
});

// Method C: With observer
const moonEq = astronomy.Equator('Moon', date, observer, true, true);
const moonEcl = astronomy.Ecliptic(moonEq.vec);
console.log('Topocentric Moon:', {
  elon: moonEcl.elon,
  elat: moonEcl.elat
});

console.log('\n3. OFFSET ANALYSIS:');
console.log('API Sun lon:', sunEcl.elon.toFixed(6), '°');
console.log('Expected from HORIZONS: ~213.097° (based on validation)');
console.log('Offset:', (sunEcl.elon - 213.097).toFixed(6), '°');

console.log('\n4. HYPOTHESIS:');
console.log('If offset is ~0.36° for all bodies:');
console.log('  - NOT parallax (Sun has no parallax)');
console.log('  - NOT observer longitude (consistent across locations)');
console.log('  - LIKELY: Coordinate epoch or frame difference');
console.log('  - POSSIBLE: astronomy-engine uses different ecliptic definition than HORIZONS');

console.log('\n5. NEXT STEPS:');
console.log('  1. Check astronomy-engine docs for ecliptic coordinate frame');
console.log('  2. Verify HORIZONS is using J2000 ecliptic');
console.log('  3. Check if offset changes with different dates (precession test)');
console.log('  4. Consider applying a systematic correction factor');
