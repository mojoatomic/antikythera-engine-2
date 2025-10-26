#!/usr/bin/env node

/**
 * Comprehensive HORIZONS Validation
 * Validates ALL celestial bodies against NASA JPL HORIZONS
 */

const fetch = require('node-fetch');

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
    const coords = apiData.system.debug.ecliptic_coordinates;
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
    
    const TOLERANCE_DEG = 0.1;
    const passed = delta_lon < TOLERANCE_DEG && delta_lat < TOLERANCE_DEG;
    
    console.log(`  ${passed ? '[PASS]' : '[FAIL]'} ${passed ? 'Within' : 'Exceeds'} tolerance`);
    
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

async function queryHORIZONS(bodyCode, date, observer) {
  const stop = new Date(date.getTime() + 60 * 1000);
  
  const params = new URLSearchParams({
    format: 'text',
    COMMAND: `'${bodyCode}'`,
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'OBSERVER',
    CENTER: "'coord@399'",
    COORD_TYPE: 'GEODETIC',
    SITE_COORD: `'${observer.longitude},${observer.latitude},${observer.elevation || 0}'`,
    START_TIME: `'${formatHORIZONSTime(date)}'`,
    STOP_TIME: `'${formatHORIZONSTime(stop)}'`,
    STEP_SIZE: "'1 m'",
    QUANTITIES: "'31'",
    ANG_FORMAT: 'DEG',
    TIME_TYPE: 'UT',
    TIME_DIGITS: 'SECONDS',
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'J2000',
    CSV_FORMAT: 'YES'
  });
  
  try {
    const response = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const text = await response.text();
    // Log reference frame lines once for debugging
    if (!global.__printedHorizonsHeader) {
      const headerLines = text.split('\n').slice(0, 60).filter(l => /Reference|Ecliptic|Equinox|Frame/i.test(l));
      if (headerLines.length) {
        console.log('    HORIZONS Header (frame):');
        headerLines.forEach(l => console.log('    ', l));
        global.__printedHorizonsHeader = true;
      }
    }
    return parseHORIZONSCSV(text);
    
  } catch (error) {
    console.log(`    HORIZONS query error: ${error.message}`);
    return null;
  }
}

function formatHORIZONSTime(date) {
  // Preserve seconds to avoid lunar fast motion discrepancies
  return date.toISOString().replace('T', ' ').split('.')[0];
}

function parseHORIZONSCSV(text) {
  const lines = text.split('\n');
  
  const soeIndex = lines.findIndex(l => l.includes('$$SOE'));
  const eoeIndex = lines.findIndex(l => l.includes('$$EOE'));
  
  if (soeIndex === -1 || eoeIndex === -1) return null;
  
  const headerIndex = soeIndex - 2;
  if (headerIndex < 0) return null;
  
  const header = parseCSVLine(lines[headerIndex]);
  const dataRow = parseCSVLine(lines[soeIndex + 1]);
  
  const lonIdx = header.findIndex(h => /ObsEcLon/i.test(h));
  const latIdx = header.findIndex(h => /ObsEcLat/i.test(h));
  
  if (lonIdx === -1 || latIdx === -1) return null;
  
  return {
    lon: parseFloat(dataRow[lonIdx]),
    lat: parseFloat(dataRow[latIdx])
  };
}

function parseCSVLine(line) {
  return line.split(',').map(s => s.replace(/(^"|"$)/g, '').trim());
}

if (require.main === module) {
  validateAllBodies();
}

module.exports = { validateAllBodies, validateBody };
