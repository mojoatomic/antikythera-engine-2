#!/usr/bin/env node

// ECT validator — compares the zodiac path and ecliptic_coordinates_ect
// debug field against HORIZONS OBSERVER/Q31 (which is also ECT). Use
// validate-ecl-vectors.js for the ECL counterpart (VECTORS query).

/**
 * Simple HORIZONS Validation Example
 * Shows how to use the debug.ecliptic_coordinates_ect for validation
 */

const fetch = require('node-fetch');
const { MS_PER_MINUTE } = require('../constants/time');

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
  const stop = new Date(date.getTime() + MS_PER_MINUTE);
  
  const params = new URLSearchParams({
    format: 'text',
    COMMAND: "'301'",
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'OBSERVER',
    CENTER: "'coord@399'",
    COORD_TYPE: 'GEODETIC',
    SITE_COORD: "'23,37.5,0'",
    START_TIME: `'${date.toISOString().slice(0,16).replace('T',' ')}'`,
    STOP_TIME: `'${stop.toISOString().slice(0,16).replace('T',' ')}'`,
    STEP_SIZE: "'1 m'",
    QUANTITIES: "'31'",
    ANG_FORMAT: 'DEG',
    TIME_TYPE: 'UT',
    TIME_DIGITS: 'SECONDS',
    CSV_FORMAT: 'YES'
  });
  
  try {
    const response = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params}`);
    const text = await response.text();
    
    const lines = text.split('\n');
    const headerIndex = lines.findIndex(l => l.includes('$$SOE')) - 2;
    const startIndex = lines.findIndex(l => l.includes('$$SOE')) + 1;
    const endIndex = lines.findIndex(l => l.includes('$$EOE'));
    
    if (headerIndex < 0 || startIndex < 0 || endIndex < 0) return null;
    
    const header = lines[headerIndex].split(',').map(s => s.replace(/(^"|"$)/g,'').trim());
    const dataRow = lines[startIndex].split(',').map(s => s.replace(/(^"|"$)/g,'').trim());
    
    const lonIdx = header.findIndex(h => /ObsEcLon/i.test(h));
    const latIdx = header.findIndex(h => /ObsEcLat/i.test(h));
    
    if (lonIdx === -1 || latIdx === -1) return null;
    
    return {
      lon: parseFloat(dataRow[lonIdx]),
      lat: parseFloat(dataRow[latIdx])
    };
  } catch (error) {
    console.error('❌ HORIZONS query failed:', error.message);
    return null;
  }
}

validateMoon();
