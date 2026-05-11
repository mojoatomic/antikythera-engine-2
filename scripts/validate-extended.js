#!/usr/bin/env node

// ECT validator — compares the zodiac path and ecliptic_coordinates_ect
// debug field against HORIZONS OBSERVER/Q31 (which is also ECT). HORIZONS
// EPHEM_TYPE: OBSERVER + QUANTITIES: '31' returns true ecliptic of date
// regardless of REF_SYSTEM (which only affects vector ephemerides). Pair
// this script with validate-ecl-vectors.js for the ECL ground truth via
// EPHEM_TYPE: VECTORS, REF_PLANE: ECLIPTIC, REF_SYSTEM: J2000.

/**
 * Extended validation for VSOP87 (astronomy-engine) against NASA JPL HORIZONS
 * - Samples multiple timestamps
 * - Compares lon/lat per body
 * - Reports p50 / p95 / max (arcseconds)
 */

const fetch = require('node-fetch');
const { MS_PER_DAY } = require('../constants/time');
const { queryObserverEcliptic } = require('./lib/horizons');
const { quantile, wrapLonDiffDeg } = require('./lib/stats');

const BODY_CODES = {
  sun: '10',
  moon: '301',
  mercury: '199',
  venus: '299',
  mars: '499',
  jupiter: '599',
  saturn: '699',
};

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { samples: 48, spanDays: 30, start: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--samples' && args[i+1]) { opts.samples = parseInt(args[++i], 10); }
    else if (a === '--span-days' && args[i+1]) { opts.spanDays = parseFloat(args[++i]); }
    else if (a === '--start' && args[i+1]) { opts.start = new Date(args[++i]); }
  }
  if (!opts.start || isNaN(opts.start)) opts.start = new Date();
  return opts;
}

// quantile, wrapLonDiffDeg now imported from ./lib/stats — see top of file.
// HORIZONS query/parse logic now lives in ./lib/horizons — see top of file.
// This script's queryHorizons wrapper is kept for backward compatibility
// with anything that imports it (nothing on main, but the module.exports
// at the bottom of the file preserved the surface historically).
async function queryHorizons(bodyCode, date, observer) {
  return queryObserverEcliptic(bodyCode, date, observer);
}

async function getAPI(dateISO, observer) {
  const q = new URLSearchParams({ date: dateISO, lat: String(observer.latitude), lon: String(observer.longitude), elev: String(observer.elevation || 0), precision: 'full' });
  const res = await fetch(`http://localhost:3000/api/display?${q}`);
  if (!res.ok) throw new Error(`/api/display HTTP ${res.status}`);
  const data = await res.json();
  return data.system.debug.ecliptic_coordinates_ect; // ECT — matches HORIZONS OBSERVER/Q31
}

async function main() {
  const { samples, spanDays, start } = parseArgs();
  const observer = { latitude: 37.5, longitude: 23.0, elevation: 0 };

  const perBody = {};
  Object.keys(BODY_CODES).forEach(b => {
    perBody[b] = { lon: [], lat: [] };
  });

  console.log(`Sampling ${samples} timestamps across ${spanDays} day(s) starting ${start.toISOString()}`);
  console.log(`Observer: ${observer.latitude}°N, ${observer.longitude}°E\n`);

  for (let i = 0; i < samples; i++) {
    const t = new Date(start.getTime() + (i * spanDays * MS_PER_DAY) / Math.max(1, samples-1));
    const dateISO = t.toISOString();

    process.stdout.write(`[${i+1}/${samples}] ${dateISO.slice(0,19)}Z `);

    try {
      const positions = await getAPI(dateISO, observer);

      for (const [body, code] of Object.entries(BODY_CODES)) {
        try {
          const h = await queryHorizons(code, t, observer);
          const mine = positions[body];
          if (!mine) throw new Error('No API data');
          const dlon = wrapLonDiffDeg(h.lon, mine.lon) * 3600;
          const dlat = Math.abs(h.lat - mine.lat) * 3600;
          perBody[body].lon.push(dlon);
          perBody[body].lat.push(dlat);
        } catch (_err) {
          // Skip sample on error for this body
        }
      }
      console.log('✓');
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }

  // Summarize
  const summary = {};
  for (const body of Object.keys(BODY_CODES)) {
    const L = perBody[body].lon.slice().sort((a,b)=>a-b);
    const B = perBody[body].lat.slice().sort((a,b)=>a-b);
    summary[body] = {
      lon: {
        p50: quantile(L, 0.5),
        p95: quantile(L, 0.95),
        max: L.length ? L[L.length-1] : null,
        n: L.length,
      },
      lat: {
        p50: quantile(B, 0.5),
        p95: quantile(B, 0.95),
        max: B.length ? B[B.length-1] : null,
        n: B.length,
      }
    };
  }

  // Print concise table
  console.log('\n' + '='.repeat(80));
  console.log('VSOP87 (astronomy-engine) vs HORIZONS (arcsec)');
  console.log('='.repeat(80));
  for (const [body, stats] of Object.entries(summary)) {
    console.log(`${body.padEnd(8)} lon p50=${stats.lon.p50?.toFixed(2).padStart(5)}  p95=${stats.lon.p95?.toFixed(2).padStart(5)}  max=${stats.lon.max?.toFixed(2).padStart(5)} | lat p50=${stats.lat.p50?.toFixed(2).padStart(5)}  p95=${stats.lat.p95?.toFixed(2).padStart(5)}  max=${stats.lat.max?.toFixed(2).padStart(5)}  (n=${stats.lon.n})`);
  }

  // Global stats
  const allLon = Object.values(perBody).flatMap(b => b.lon).sort((a,b)=>a-b);
  const allLat = Object.values(perBody).flatMap(b => b.lat).sort((a,b)=>a-b);
  console.log('='.repeat(80));
  console.log(`OVERALL  lon p50=${quantile(allLon, 0.5)?.toFixed(2).padStart(5)}  p95=${quantile(allLon, 0.95)?.toFixed(2).padStart(5)}  max=${allLon.length ? allLon[allLon.length-1].toFixed(2) : 'N/A'} | lat p50=${quantile(allLat, 0.5)?.toFixed(2).padStart(5)}  p95=${quantile(allLat, 0.95)?.toFixed(2).padStart(5)}  max=${allLat.length ? allLat[allLat.length-1].toFixed(2) : 'N/A'}`);
  console.log('='.repeat(80) + '\n');

  // Emit JSON blob
  const out = { 
    engine: 'VSOP87 via astronomy-engine',
    span: { start: start.toISOString(), end: new Date(start.getTime()+spanDays*MS_PER_DAY).toISOString() },
    samples, observer, summary,
    aggregate: {
      lon: { p50: quantile(allLon, 0.5), p95: quantile(allLon, 0.95), max: allLon.length ? allLon[allLon.length-1] : null },
      lat: { p50: quantile(allLat, 0.5), p95: quantile(allLat, 0.95), max: allLat.length ? allLat[allLat.length-1] : null }
    }
  };
  console.log('JSON:');
  console.log(JSON.stringify(out, null, 2));
}

if (require.main === module) {
  main().catch(err => {
    console.error('\nERROR:', err.message);
    process.exit(1);
  });
}

module.exports = { parseArgs, queryHorizons, quantile };
