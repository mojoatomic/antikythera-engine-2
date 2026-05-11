#!/usr/bin/env node

// ECT validator — compares the zodiac path and ecliptic_coordinates_ect
// debug field against HORIZONS OBSERVER/Q31 (which is also ECT). Use
// validate-ecl-vectors.js for the ECL counterpart (VECTORS query).

/**
 * Simple HORIZONS Validation Example
 * Shows how to use the debug.ecliptic_coordinates_ect for validation
 */

const fetch = require('node-fetch');
const { queryObserverEcliptic } = require('./lib/horizons');

async function validateMoon() {
  // 1. Get your API data
  const apiResponse = await fetch('http://localhost:3000/api/display');
  const apiData = await apiResponse.json();
  
  const yourMoon = apiData.system.debug.ecliptic_coordinates_ect && apiData.system.debug.ecliptic_coordinates_ect.moon;
  if (!yourMoon) {
    console.error('Missing system.debug.ecliptic_coordinates_ect.moon — server out of date?');
    process.exit(1);
  }
  console.log('\n📍 YOUR API (debug.ecliptic_coordinates_ect.moon — ECT):');
  console.log(`  lon: ${yourMoon.lon.toFixed(6)}°`);
  console.log(`  lat: ${yourMoon.lat.toFixed(6)}°`);
  
  // 2. Query HORIZONS
  const date = new Date(apiData.timestamp);
  const horizons = await queryHORIZONS(date);
  
  if (horizons) {
    console.log('\n🛰️  NASA HORIZONS:');
    console.log(`  ObsEcLon: ${horizons.lon.toFixed(6)}°`);
    console.log(`  ObsEcLat: ${horizons.lat.toFixed(6)}°`);
    
    // 3. Calculate differences
    const delta_lon = Math.abs(horizons.lon - yourMoon.lon);
    const delta_lat = Math.abs(horizons.lat - yourMoon.lat);
    
    console.log('\n📊 VALIDATION:');
    console.log(`  Δ Longitude: ${delta_lon.toFixed(6)}° (${(delta_lon * 3600).toFixed(2)} arcsec)`);
    console.log(`  Δ Latitude:  ${delta_lat.toFixed(6)}° (${(delta_lat * 3600).toFixed(2)} arcsec)`);
    
    if (delta_lon < 0.1 && delta_lat < 0.1) {
      console.log('  ✅ PASS - Display quality precision\n');
    } else {
      console.log('  ⚠️  WARNING - Exceeds display tolerance\n');
    }
  }
}

async function queryHORIZONS(date) {
  // Moon (301) via OBSERVER/Q31 → ECT, site Athens (23E, 37.5N, 0km). Pre-
  // refactor used .slice(0,16) minute-resolution time formatting; pass
  // timePrecision: 'minutes' to keep byte-level URL identity. The lib
  // returns { lon, lat } — same shape this script's caller expects.
  try {
    return await queryObserverEcliptic(
      '301',
      date,
      { latitude: 37.5, longitude: 23, elevation: 0 },
      { timePrecision: 'minutes' }
    );
  } catch (error) {
    console.error('❌ HORIZONS query failed:', error.message);
    return null;
  }
}

validateMoon();
