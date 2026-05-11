#!/usr/bin/env node

// ECL validator — compares the ecliptic_coordinates debug field (ECL,
// J2000 mean ecliptic) against HORIZONS using EPHEM_TYPE: VECTORS,
// REF_PLANE: ECLIPTIC, REF_SYSTEM: J2000. Derives lon/lat from the
// returned position vector. The OBSERVER+Q31 path (validate-extended.js,
// validate-all-bodies.js, validate-horizons.js, validate-simple.js)
// validates the ECT side; this script validates the ECL side.
//
// Why VECTORS instead of OBSERVER: HORIZONS OBSERVER+Q31 returns angular
// quantities (ObsEcLon/ObsEcLat) that are ECT regardless of REF_SYSTEM.
// REF_SYSTEM: J2000 only meaningfully applies to vector-style ephemerides.

const fetch = require('node-fetch');
const { VALIDATION } = require('../constants/validation');
const { MS_PER_DAY } = require('../constants/time');
const { queryVectorsPosition } = require('./lib/horizons');
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
  const opts = { samples: 24, spanDays: 30, start: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--samples' && args[i+1]) { opts.samples = parseInt(args[++i], 10); }
    else if (a === '--span-days' && args[i+1]) { opts.spanDays = parseFloat(args[++i]); }
    else if (a === '--start' && args[i+1]) { opts.start = new Date(args[++i]); }
  }
  if (!opts.start || isNaN(opts.start)) opts.start = new Date();
  return opts;
}

// Derive ecliptic lon/lat from a J2000 ecliptic position vector.
// HORIZONS VECTORS table (TYPE=2: position only) returns x, y, z in AU.
function lonLatFromVec(x, y, z) {
  const r = Math.sqrt(x*x + y*y + z*z);
  let lon = Math.atan2(y, x) * (180 / Math.PI);
  if (lon < 0) lon += 360;
  const lat = Math.asin(z / r) * (180 / Math.PI);
  return { lon, lat };
}

async function queryHorizons(bodyCode, date, observer) {
  // Match the API's topocentric apparent path: the engine's
  // ecliptic_coordinates field uses astronomy.Equator(..., aberration=true)
  // with a topocentric Observer — i.e. topocentric apparent. The lib's
  // queryVectorsPosition uses CENTER=coord@399 + GEODETIC site (topocentric)
  // and VEC_CORR=LT+S (light-time + stellar aberration → apparent), with
  // REF_PLANE=ECLIPTIC + REF_SYSTEM=J2000 + VEC_TABLE=2 — same conventions
  // as the pre-refactor inline query. Going geocentric or astrometric here
  // adds 20–30″ of nuisance signal that has nothing to do with the frame
  // being validated, so the lib defaults are exactly right.
  //
  // lonLatFromVec stays in this script (per MUST 2): the lib returns the
  // raw {x, y, z} vector and we own the angular derivation. A future
  // queryVectorsState will return the full 6-vector for validate-state-
  // vectors.js under #101.
  const { x, y, z } = await queryVectorsPosition(bodyCode, date, observer);
  return lonLatFromVec(x, y, z);
}

async function getAPI(dateISO, observer) {
  const q = new URLSearchParams({
    date: dateISO,
    lat: String(observer.latitude),
    lon: String(observer.longitude),
    elev: String(observer.elevation || 0),
    precision: 'full'
  });
  const res = await fetch(`http://localhost:3000/api/display?${q}`);
  if (!res.ok) throw new Error(`/api/display HTTP ${res.status}`);
  const data = await res.json();
  return data.system.debug.ecliptic_coordinates; // ECL post-fix
}

// Per-body 3× p95 thresholds in arcsec. Falls back to a flat 30″ if a body
// is missing from constants/validation.js (e.g. before Task 11's refresh).
function thresholdArcsec(body) {
  const stats = VALIDATION.bodies && VALIDATION.bodies[body];
  if (!stats || !stats.lon || typeof stats.lon.p95 !== 'number') return 30;
  return 3 * stats.lon.p95;
}

async function main() {
  const { samples, spanDays, start } = parseArgs();
  const observer = { latitude: 37.5, longitude: 23.0, elevation: 0 };

  const perBody = {};
  Object.keys(BODY_CODES).forEach(b => {
    perBody[b] = { lon: [], lat: [] };
  });

  console.log('ECL validator — HORIZONS VECTORS (REF_PLANE=ECLIPTIC, REF_SYSTEM=J2000)');
  console.log(`Sampling ${samples} timestamps across ${spanDays} day(s) starting ${start.toISOString()}`);
  console.log(`Observer (only relevant for API call): ${observer.latitude}°N, ${observer.longitude}°E\n`);

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
          // Skip on error
        }
      }
      console.log('✓');
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(86));
  console.log('VSOP87 (astronomy-engine, ECL) vs HORIZONS VECTORS — arcsec, per-body 3× p95 threshold');
  console.log('='.repeat(86));
  let anyFail = false;
  for (const body of Object.keys(BODY_CODES)) {
    const L = perBody[body].lon.slice().sort((a,b)=>a-b);
    const B = perBody[body].lat.slice().sort((a,b)=>a-b);
    const threshold = thresholdArcsec(body);
    const lonMax = L.length ? L[L.length-1] : null;
    const fail = lonMax != null && lonMax > threshold;
    if (fail) anyFail = true;
    const tag = fail ? '[FAIL]' : '[PASS]';
    console.log(
      `${tag} ${body.padEnd(8)} ` +
      `lon p50=${(quantile(L, 0.5) ?? 0).toFixed(2).padStart(6)}  ` +
      `p95=${(quantile(L, 0.95) ?? 0).toFixed(2).padStart(6)}  ` +
      `max=${(lonMax ?? 0).toFixed(2).padStart(6)} | ` +
      `lat p50=${(quantile(B, 0.5) ?? 0).toFixed(2).padStart(6)}  ` +
      `p95=${(quantile(B, 0.95) ?? 0).toFixed(2).padStart(6)}  ` +
      `max=${((B.length ? B[B.length-1] : 0)).toFixed(2).padStart(6)} | ` +
      `threshold=${threshold.toFixed(2)}″ (n=${L.length})`
    );
  }
  console.log('='.repeat(86));

  // Aggregate
  const allLon = Object.values(perBody).flatMap(b => b.lon).sort((a,b)=>a-b);
  const allLat = Object.values(perBody).flatMap(b => b.lat).sort((a,b)=>a-b);
  console.log(
    `OVERALL  lon p50=${(quantile(allLon, 0.5) ?? 0).toFixed(2)}  ` +
    `p95=${(quantile(allLon, 0.95) ?? 0).toFixed(2)}  ` +
    `max=${(allLon.length ? allLon[allLon.length-1] : 0).toFixed(2)} | ` +
    `lat p50=${(quantile(allLat, 0.5) ?? 0).toFixed(2)}  ` +
    `p95=${(quantile(allLat, 0.95) ?? 0).toFixed(2)}  ` +
    `max=${(allLat.length ? allLat[allLat.length-1] : 0).toFixed(2)}`
  );
  console.log('='.repeat(86) + '\n');

  process.exit(anyFail ? 1 : 0);
}

if (require.main === module) {
  main().catch(err => {
    console.error('\nERROR:', err.message);
    process.exit(1);
  });
}

module.exports = { lonLatFromVec, queryHorizons, thresholdArcsec };
