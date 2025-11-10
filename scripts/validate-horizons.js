#!/usr/bin/env node

/**
 * NASA HORIZONS Validation Script
 * Compares your API's Moon position against JPL HORIZONS
 */

const fetch = require('node-fetch');
const { MS_PER_MINUTE } = require('../constants/time');
const AntikytheraEngine = require('../engine');

const engine = new AntikytheraEngine();

/**
 * Query NASA HORIZONS for Moon position
 * 
 * HORIZONS Web Interface: https://ssd.jpl.nasa.gov/horizons/app.html
 * Command: 301 (Moon)
 * Center: 500@399 (Geocentric)
 */
async function queryHORIZONS(date, latitude = 37.5, longitude = 23.0) {
  // HORIZONS requires STOP_TIME > START_TIME; request a 1-minute window
  const stop = new Date(date.getTime() + MS_PER_MINUTE);

  const params = new URLSearchParams({
    format: 'text',
    COMMAND: "'301'",           // Moon (quoted per HORIZONS examples)
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'OBSERVER',
    // Topocentric Athens (lon,lat,elevkm): use coord@399 with GEODETIC
    CENTER: "'coord@399'",
    COORD_TYPE: 'GEODETIC',
    SITE_COORD: `'${longitude},${latitude},0'`,
    START_TIME: `'${date.toISOString().slice(0,16).replace('T',' ')}'`,
    STOP_TIME: `'${stop.toISOString().slice(0,16).replace('T',' ')}'`,
    STEP_SIZE: "'1 m'",         // URL-safe with quotes; space allowed
    QUANTITIES: "'31'",         // 31 = Observer ecliptic lon/lat (ObsEcLon, ObsEcLat)
    ANG_FORMAT: 'DEG',           // angles in degrees
    TIME_TYPE: 'UT',
    TIME_DIGITS: 'SECONDS',
    CSV_FORMAT: 'YES'            // easier to parse
  });

  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params}`;
  
  console.log('\n🔍 Querying NASA HORIZONS...');
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const text = await response.text();

    // Extract CSV header and first data row between $$SOE and $$EOE
    const lines = text.split('\n');
    // In CSV mode, header labels line is two lines before $$SOE
    const headerIndex = lines.findIndex(l => l.includes('$$SOE')) - 2; // header labels line
    const startIndex = lines.findIndex(l => l.includes('$$SOE')) + 1;
    const endIndex = lines.findIndex(l => l.includes('$$EOE'));

    if (headerIndex < 0 || startIndex < 0 || endIndex < 0 || startIndex >= endIndex) {
      console.log('⚠️  Could not locate CSV data section in HORIZONS output.');
      return null;
    }

    const header = lines[headerIndex].split(',').map(s => s.replace(/(^\"|\"$)/g,'').trim());
    const dataRow = lines[startIndex].split(',').map(s => s.replace(/(^\"|\"$)/g,'').trim());

    const lonIdx = header.findIndex(h => /ObsEcLon/i.test(h));
    const latIdx = header.findIndex(h => /ObsEcLat/i.test(h));

    if (lonIdx === -1 || latIdx === -1) {
      console.log('⚠️  ObsEcLon/ObsEcLat not found in CSV header.');
      return null;
    }

    const longitude = parseFloat(dataRow[lonIdx]);
    const latitude = parseFloat(dataRow[latIdx]);

    return { longitude, latitude };
  } catch (error) {
    console.error('❌ Error querying HORIZONS:', error.message);
    return null;
  }
}

/**
 * Use astronomy-engine as reference (same library we use)
 */
function getEnginePosition(date) {
  try {
    const astronomy = require('astronomy-engine');
    const equatorial = astronomy.Equator('Moon', date, null, true, true);
    const ecliptic = astronomy.Ecliptic(equatorial.vec);
    return {
      longitude: ecliptic.elon,
      latitude: ecliptic.elat
    };
  } catch (_error) {
    // astronomy-engine direct comparison not available - skip it
    return null;
  }
}

/**
 * Display comparison results
 */
function displayComparison(yourData, horizons, astroEngine) {
  console.log('═'.repeat(70));
  console.log(`  MOON POSITION VALIDATION - ${yourData.timestamp}`);
  console.log('═'.repeat(70));
  
  console.log('\n📍 YOUR API:');
  console.log(`  Ecliptic Longitude: ${yourData.moon.longitude.toFixed(6)}°`);
  console.log(`  Ecliptic Latitude:  ${yourData.moon.latitude.toFixed(6)}°`);
  console.log(`  Velocity: ${yourData.moon.velocity.toFixed(6)}°/day`);
  
  if (astroEngine) {
    console.log('\n🔬 ASTRONOMY-ENGINE (Direct):');
    console.log(`  Ecliptic Longitude: ${astroEngine.longitude.toFixed(6)}°`);
    console.log(`  Ecliptic Latitude:  ${astroEngine.latitude.toFixed(6)}°`);
    
    const diffLon = Math.abs(yourData.moon.longitude - astroEngine.longitude);
    const diffLat = Math.abs(yourData.moon.latitude - astroEngine.latitude);
    
    console.log(`\n  Δ Longitude: ${diffLon.toFixed(8)}° (${(diffLon * 3600).toFixed(4)} arcsec)`);
    console.log(`  Δ Latitude:  ${diffLat.toFixed(8)}° (${(diffLat * 3600).toFixed(4)} arcsec)`);
    
    if (diffLon < 0.001 && diffLat < 0.001) {
      console.log('  ✅ PERFECT MATCH - Using same calculation engine');
    } else {
      console.log('  ⚠️  WARNING - Unexpected difference in same engine');
    }
  }
  
  if (horizons) {
    console.log('\n🛰️  NASA HORIZONS (JPL):');
    console.log(`  Ecliptic Longitude: ${horizons.longitude.toFixed(6)}°`);
    console.log(`  Ecliptic Latitude:  ${horizons.latitude.toFixed(6)}°`);
    
    const diffLon = Math.abs(yourData.moon.longitude - horizons.longitude);
    const diffLat = Math.abs(yourData.moon.latitude - horizons.latitude);
    
    console.log('\n📊 DIFFERENCE vs HORIZONS:');
    console.log(`  Δ Longitude: ${diffLon.toFixed(6)}° (${(diffLon * 3600).toFixed(2)} arcsec)`);
    console.log(`  Δ Latitude:  ${diffLat.toFixed(6)}° (${(diffLat * 3600).toFixed(2)} arcsec)`);
    
    // Moon diameter is ~0.5°, so ±0.1° is good precision
    if (diffLon < 0.01 && diffLat < 0.01) {
      console.log('  ✅ EXCELLENT - Professional precision (<0.01°)');
    } else if (diffLon < 0.1 && diffLat < 0.1) {
      console.log('  ✅ GOOD - Display quality precision (<0.1°)');
    } else if (diffLon < 0.5 && diffLat < 0.5) {
      console.log('  ✓ ACCEPTABLE - Within moon diameter');
    } else {
      console.log('  ⚠️  WARNING - Exceeds expected tolerance');
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('ℹ️  Precision Standards:');
  console.log('  • Display purposes:       ±0.1° (360 arcsec) ✅');
  console.log('  • Professional ephemeris: ±0.01° (36 arcsec)');
  console.log('  • Lunar Laser Ranging:    ±0.0001° (0.36 arcsec)');
  console.log('  • Your engine uses:       astronomy-engine (VSOP87/ELP2000)');
  console.log('═'.repeat(70) + '\n');
}

/**
 * Main validation
 */
async function main() {
  const date = new Date(); // Use current time or pass as argument
  
  console.log('\n🌙 Starting Moon Position Validation...\n');
  console.log(`Test Date: ${date.toISOString()}\n`);
  
  // Get our engine's calculation
  // Use Athens by default (37.5N, 23E) to match our engine defaults
  const latitude = 37.5;
  const longitude = 23.0;

  const state = engine.getState(date, latitude, longitude);
  const yourData = {
    timestamp: state.date,
    moon: state.moon
  };
  
  // Get direct astronomy-engine calculation (baseline)
  const astroEngine = getEnginePosition(date);
  
  // Get HORIZONS data (gold standard)
  const horizons = await queryHORIZONS(date, latitude, longitude);
  
  displayComparison(yourData, horizons, astroEngine);
  
  console.log('💡 Manual Verification:');
  console.log('   https://ssd.jpl.nasa.gov/horizons/app.html');
  console.log('   Command: 301 (Moon)');
  console.log('   Center: Geocentric [500@399]');
  console.log(`   Time: ${date.toISOString().replace('T', ' ').split('.')[0]} UTC\n`);
}

main();
