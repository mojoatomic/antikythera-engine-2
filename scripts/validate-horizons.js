#!/usr/bin/env node

/**
 * NASA HORIZONS Validation Script
 * Compares your API's Moon position against JPL HORIZONS
 */

const fetch = require('node-fetch');
const AntikytheraEngine = require('../engine');

const engine = new AntikytheraEngine();

/**
 * Query NASA HORIZONS for Moon position
 * 
 * HORIZONS Web Interface: https://ssd.jpl.nasa.gov/horizons/app.html
 * Command: 301 (Moon)
 * Center: 500@399 (Geocentric)
 */
async function queryHORIZONS(date) {
  const params = new URLSearchParams({
    format: 'text',
    COMMAND: '301',           // Moon
    OBJ_DATA: 'YES',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'OBSERVER',
    CENTER: '500@399',        // Geocentric
    START_TIME: date.toISOString().split('.')[0].replace('T', ' '),
    STOP_TIME: date.toISOString().split('.')[0].replace('T', ' '),
    STEP_SIZE: '1m',
    QUANTITIES: '31',         // Full observer data
    CSV_FORMAT: 'NO'
  });

  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params}`;
  
  console.log('\n🔍 Querying NASA HORIZONS...');
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    // Parse ecliptic longitude from HORIZONS output
    // Look for "ObsEcLon" or similar in the output
    const eclipticMatch = text.match(/ObsEcLon[^\d]+([\d.]+)/i);
    const latitudeMatch = text.match(/ObsEcLat[^\d-]+([-\d.]+)/i);
    
    if (!eclipticMatch) {
      console.log('⚠️  Could not parse HORIZONS response.');
      console.log('Attempting alternative parsing...\n');
      
      // Try to find ecliptic coordinates in table format
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('ObsEcLon') || lines[i].includes('ObsEcLat')) {
          console.log('Found: ', lines[i]);
        }
      }
      
      return null;
    }
    
    return {
      longitude: parseFloat(eclipticMatch[1]),
      latitude: latitudeMatch ? parseFloat(latitudeMatch[1]) : null
    };
    
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
    
    // Calculate using astronomy-engine (same as our engine)
    const equatorial = astronomy.Equator('Moon', date, null, true, true);
    const ecliptic = astronomy.Ecliptic(equatorial.vec);
    
    return {
      longitude: ecliptic.elon,
      latitude: ecliptic.elat
    };
  } catch (error) {
    console.error('❌ Could not load astronomy-engine:', error.message);
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
    if (horizons.latitude !== null) {
      console.log(`  Ecliptic Latitude:  ${horizons.latitude.toFixed(6)}°`);
    }
    
    const diff = Math.abs(yourData.moon.longitude - horizons.longitude);
    console.log('\n📊 DIFFERENCE vs HORIZONS:');
    console.log(`  Δ Longitude: ${diff.toFixed(6)}° (${(diff * 3600).toFixed(2)} arcsec)`);
    
    // Moon diameter is ~0.5°, so ±0.1° is good precision
    if (diff < 0.01) {
      console.log('  ✅ EXCELLENT - Professional precision (<0.01°)');
    } else if (diff < 0.1) {
      console.log('  ✅ GOOD - Display quality precision (<0.1°)');
    } else if (diff < 0.5) {
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
  const state = engine.getState(date);
  const yourData = {
    timestamp: state.date,
    moon: state.moon
  };
  
  // Get direct astronomy-engine calculation (baseline)
  const astroEngine = getEnginePosition(date);
  
  // Get HORIZONS data (gold standard)
  const horizons = await queryHORIZONS(date);
  
  displayComparison(yourData, horizons, astroEngine);
  
  console.log('💡 Manual Verification:');
  console.log('   https://ssd.jpl.nasa.gov/horizons/app.html');
  console.log('   Command: 301 (Moon)');
  console.log('   Center: Geocentric [500@399]');
  console.log(`   Time: ${date.toISOString().replace('T', ' ').split('.')[0]} UTC\n`);
}

main();
