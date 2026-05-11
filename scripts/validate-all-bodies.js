#!/usr/bin/env node

// ECT validator — compares the zodiac path and ecliptic_coordinates_ect
// debug field against HORIZONS OBSERVER/Q31 (which is also ECT). HORIZONS
// OBSERVER+Q31 returns ObsEcLon/ObsEcLat in true ecliptic of date regardless
// of REF_SYSTEM. Pair with validate-ecl-vectors.js for ECL ground truth.

/**
 * Comprehensive HORIZONS Validation
 * Validates ALL celestial bodies against NASA JPL HORIZONS
 */

const { VALIDATION } = require('../constants/validation');
const { queryObserverEcliptic } = require('./lib/horizons');

// Per-body 3× p95 threshold from constants/validation.js. Replaces a flat
// 0.1° (= 360″) threshold which was 200–400× looser than the engine's
// claimed precision and would have caught essentially nothing.
function thresholdDegrees(body) {
  const stats = VALIDATION.bodies && VALIDATION.bodies[body];
  if (!stats) {
    // Conservative fallback for unknown bodies: 30″ in degrees.
    return 30 / 3600;
  }
  const lonP95 = stats.lon && typeof stats.lon.p95 === 'number' ? stats.lon.p95 : 30;
  const latP95 = stats.lat && typeof stats.lat.p95 === 'number' ? stats.lat.p95 : 30;
  return {
    lon: (3 * lonP95) / 3600,
    lat: (3 * latP95) / 3600,
  };
}

// HORIZONS body codes
const BODY_CODES = {
  sun: '10',
  moon: '301',
  mercury: '199',
  venus: '299',
  mars: '499',
  jupiter: '599',
  saturn: '699'
};

async function validateAllBodies() {
  try {
    // Get API data
    console.log('Fetching Antikythera API data...\n');
    const apiResponse = await fetch('http://localhost:3000/api/display');
    if (!apiResponse.ok) {
      throw new Error(`API returned ${apiResponse.status}`);
    }
    const apiData = await apiResponse.json();
    const timestamp = new Date(apiData.timestamp);
    // ECT validator: pull from ecliptic_coordinates_ect (matches HORIZONS OBSERVER/Q31).
    const coords = apiData.system.debug.ecliptic_coordinates_ect;
    if (!coords) {
      throw new Error('Missing ecliptic_coordinates_ect from /api/display response — server out of date?');
    }
    const observer = apiData.system.observer || { latitude: 37.5, longitude: 23.0, elevation: 0, country: 'N/A', source: 'default' };
    
    console.log(`Timestamp: ${timestamp.toISOString()}`);
    console.log(`Location: ${observer.latitude}°N, ${observer.longitude}°E (${observer.country || 'N/A'})`);
    console.log(`Source: ${observer.source || 'unknown'}\n`);
    console.log('='.repeat(80));
    
    // Validate each body
    const results = [];
    for (const [bodyName, bodyCode] of Object.entries(BODY_CODES)) {
      const result = await validateBody(bodyName, bodyCode, coords[bodyName], timestamp, observer);
      results.push(result);
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(80));
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(r => {
      const status = r.passed ? '[PASS]' : '[FAIL]';
      const lonStr = `${r.delta_lon.toFixed(4)}°`.padStart(10);
      const latStr = `${r.delta_lat.toFixed(4)}°`.padStart(10);
      console.log(`${status} ${r.body.padEnd(10)} Δlon=${lonStr}  Δlat=${latStr}`);
    });
    
    console.log(`\nResult: ${passed}/${total} passed`);
    
    if (passed === total) {
      console.log('\n✓ All bodies within display quality precision');
      process.exit(0);
    } else {
      console.log('\n✗ Some bodies exceed tolerance');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n[ERROR]', error.message);
    process.exit(1);
  }
}

async function validateBody(bodyName, bodyCode, apiCoords, timestamp, observer) {
  console.log(`\n${bodyName.toUpperCase()}`);
  console.log('-'.repeat(40));
  
  try {
    // Query HORIZONS
    const horizons = await queryHORIZONS(bodyCode, timestamp, observer);
    
    if (!horizons) {
      console.log(`  API:      lon=${apiCoords.lon.toFixed(4)}°  lat=${apiCoords.lat.toFixed(4)}°`);
      console.log('  HORIZONS: [QUERY FAILED]');
      return {
        body: bodyName,
        passed: false,
        delta_lon: 999,
        delta_lat: 999
      };
    }
    
    // Calculate deltas
    const delta_lon = Math.abs(horizons.lon - apiCoords.lon);
    const delta_lat = Math.abs(horizons.lat - apiCoords.lat);
    
    console.log(`  API:      lon=${apiCoords.lon.toFixed(6)}°  lat=${apiCoords.lat.toFixed(6)}°`);
    console.log(`  HORIZONS: lon=${horizons.lon.toFixed(6)}°  lat=${horizons.lat.toFixed(6)}°`);
    console.log(`  Delta:    lon=${delta_lon.toFixed(6)}°  lat=${delta_lat.toFixed(6)}°`);
    console.log(`            (${(delta_lon * 3600).toFixed(1)}" lon, ${(delta_lat * 3600).toFixed(1)}" lat)`);
    
    const t = thresholdDegrees(bodyName);
    const passed = delta_lon < t.lon && delta_lat < t.lat;

    console.log(`  threshold (3× p95): lon=${(t.lon * 3600).toFixed(2)}″  lat=${(t.lat * 3600).toFixed(2)}″`);
    console.log(`  ${passed ? '[PASS]' : '[FAIL]'} ${passed ? 'Within' : 'Exceeds'} per-body tolerance`);
    
    return {
      body: bodyName,
      passed,
      delta_lon,
      delta_lat
    };
    
  } catch (error) {
    console.log(`  [ERROR] ${error.message}`);
    return {
      body: bodyName,
      passed: false,
      delta_lon: 999,
      delta_lat: 999
    };
  }
}

// HORIZONS query and CSV parsing now live in ./lib/horizons. This thin
// wrapper preserves the original null-on-error contract that validateBody
// relies on (line 113-122 of this file): callers see `null` for a failed
// HORIZONS query and degrade gracefully, rather than the lib's throw-
// semantics propagating up.
//
// Dropped from the original implementation: a one-time debug log of HORIZONS
// header lines ("Reference Frame: ..." etc.) printed on the first successful
// query of a run. Pure diagnostic noise; never read by the comparison logic;
// not worth a fetchAndParse export from the lib just to preserve it.
async function queryHORIZONS(bodyCode, date, observer) {
  try {
    return await queryObserverEcliptic(bodyCode, date, observer);
  } catch (error) {
    console.log(`    HORIZONS query error: ${error.message}`);
    return null;
  }
}

if (require.main === module) {
  validateAllBodies();
}

module.exports = { validateAllBodies, validateBody };
