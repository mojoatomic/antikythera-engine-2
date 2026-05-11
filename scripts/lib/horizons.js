// Shared HORIZONS query + parse primitives used by the validate-*.js scripts.
//
// Two high-level query functions cover the cases needed by the current 5
// validators:
//
//   queryObserverEcliptic — OBSERVER + QUANTITIES=31 → { lon, lat } in ECT.
//                            ObsEcLon/ObsEcLat are of-date regardless of
//                            REF_SYSTEM (HORIZONS API quirk).
//   queryVectorsPosition  — VECTORS + REF_PLANE=ECLIPTIC + REF_SYSTEM=J2000
//                            + VEC_CORR=LT+S → raw { x, y, z } in ECL.
//                            Callers (today only validate-ecl-vectors.js)
//                            do their own lonLatFromVec derivation — by
//                            design, the function name says "Position"
//                            not "Ecliptic". A future queryVectorsState
//                            returning the full 6-vector will land with
//                            validate-state-vectors.js (#101).
//
// Low-level parser primitives are also exported (`formatTime`,
// `parseCSVLine`, `parseHORIZONSCSV`) so unit tests can exercise them with
// fixture inputs without hitting HORIZONS. `buildParams` and `fetchAndParse`
// are module-private — they're used by the high-level functions and
// exported only when a caller actually needs them.

const fetch = require('node-fetch');
const { MS_PER_MINUTE } = require('../../constants/time');

const HORIZONS_API_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';

// Format a Date for HORIZONS START_TIME / STOP_TIME.
// precision: 'seconds' (default) → "YYYY-MM-DD HH:MM:SS"
//            'minutes'           → "YYYY-MM-DD HH:MM"
// Two precisions exist because the pre-refactor validators were split
// between them; preserving each script's pre-refactor URL byte-for-byte is
// the only way to keep the Task 9 equivalence gate meaningful on the
// Moon-only validators (Moon moves ~33 arcsec / minute).
function formatTime(date, precision = 'seconds') {
  const iso = date.toISOString();
  if (precision === 'minutes') {
    return iso.slice(0, 16).replace('T', ' ');
  }
  // 'seconds' default
  return iso.replace('T', ' ').split('.')[0];
}

// HORIZONS CSV rows have trailing commas and stray whitespace around values
// and quote-wrapping in some rows. Strip them.
function parseCSVLine(line) {
  return line.split(',').map(s => s.replace(/(^"|"$)/g, '').trim());
}

// Locate the CSV data section between $$SOE and $$EOE; the header label
// line lives two rows above $$SOE. Returns { header, rows } where rows
// excludes the $$SOE/$$EOE markers and any trailing blank lines.
function parseHORIZONSCSV(text) {
  const lines = text.split('\n');
  const soeIndex = lines.findIndex(l => l.includes('$$SOE'));
  const eoeIndex = lines.findIndex(l => l.includes('$$EOE'));
  if (soeIndex < 0 || eoeIndex < 0 || eoeIndex <= soeIndex) {
    throw new Error('HORIZONS parse error: $$SOE/$$EOE markers not found or out of order');
  }
  const headerIndex = soeIndex - 2;
  if (headerIndex < 0) {
    throw new Error('HORIZONS parse error: no header line above $$SOE');
  }
  const header = parseCSVLine(lines[headerIndex]);
  const rows = [];
  for (let i = soeIndex + 1; i < eoeIndex; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    rows.push(parseCSVLine(line));
  }
  return { header, rows };
}

// Build URLSearchParams from a key/value object. Same shape as
// `new URLSearchParams(obj)` but isolated so query* callers can extend it.
function buildParams(obj) {
  return new URLSearchParams(obj);
}

// Fetch the HORIZONS API and parse the first CSV data row. Returns
// { header, row } — caller does the column lookup themselves.
async function fetchAndParse(params) {
  const url = `${HORIZONS_API_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HORIZONS HTTP ${res.status}`);
  }
  const text = await res.text();
  const { header, rows } = parseHORIZONSCSV(text);
  if (!rows.length) {
    throw new Error('HORIZONS returned no data rows between $$SOE and $$EOE');
  }
  return { header, row: rows[0] };
}

// queryObserverEcliptic — OBSERVER + Q31 → { lon, lat } in ECT.
//
// observer: { latitude, longitude, elevation? }
// opts:
//   timePrecision: 'seconds' | 'minutes' (default 'seconds') — preserves
//                  byte-level URL identity with the pre-refactor scripts.
async function queryObserverEcliptic(bodyCode, date, observer, opts = {}) {
  const timePrecision = opts.timePrecision || 'seconds';
  const stop = new Date(date.getTime() + MS_PER_MINUTE);
  const params = buildParams({
    format: 'text',
    COMMAND: `'${bodyCode}'`,
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'OBSERVER',
    CENTER: "'coord@399'",
    COORD_TYPE: 'GEODETIC',
    SITE_COORD: `'${observer.longitude},${observer.latitude},${observer.elevation || 0}'`,
    START_TIME: `'${formatTime(date, timePrecision)}'`,
    STOP_TIME: `'${formatTime(stop, timePrecision)}'`,
    STEP_SIZE: "'1 m'",
    QUANTITIES: "'31'",
    ANG_FORMAT: 'DEG',
    TIME_TYPE: 'UT',
    TIME_DIGITS: 'SECONDS',
    CSV_FORMAT: 'YES',
    // REF_PLANE / REF_SYSTEM are no-ops in OBSERVER mode (HORIZONS quirk —
    // ObsEcLon/ObsEcLat are inherently of-date regardless). Not set here;
    // callers that want byte-level URL identity with the pre-refactor
    // scripts that included them can pass them through `extraParams` later
    // if we add that escape hatch.
  });
  const { header, row } = await fetchAndParse(params);
  const lonIdx = header.findIndex(h => /ObsEcLon/i.test(h));
  const latIdx = header.findIndex(h => /ObsEcLat/i.test(h));
  if (lonIdx < 0 || latIdx < 0) {
    throw new Error(`HORIZONS OBSERVER response missing ObsEcLon/ObsEcLat columns; header was: ${header.join('|')}`);
  }
  return {
    lon: parseFloat(row[lonIdx]),
    lat: parseFloat(row[latIdx]),
  };
}

// queryVectorsPosition — VECTORS + ECLIPTIC + J2000 + LT+S → raw {x, y, z}
// in J2000 mean ecliptic frame, topocentric apparent (light-time + stellar
// aberration). Returns the raw vector; caller applies lonLatFromVec or
// whatever derivation it needs.
//
// observer: { latitude, longitude, elevation? }
// opts:
//   timePrecision: 'seconds' | 'minutes' (default 'seconds')
async function queryVectorsPosition(bodyCode, date, observer, opts = {}) {
  const timePrecision = opts.timePrecision || 'seconds';
  const stop = new Date(date.getTime() + MS_PER_MINUTE);
  const params = buildParams({
    format: 'text',
    COMMAND: `'${bodyCode}'`,
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    CENTER: "'coord@399'",
    COORD_TYPE: 'GEODETIC',
    SITE_COORD: `'${observer.longitude},${observer.latitude},${observer.elevation || 0}'`,
    START_TIME: `'${formatTime(date, timePrecision)}'`,
    STOP_TIME: `'${formatTime(stop, timePrecision)}'`,
    STEP_SIZE: "'1 m'",
    VEC_TABLE: '2',
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'J2000',
    VEC_CORR: 'LT+S',
    OUT_UNITS: 'AU-D',
    CSV_FORMAT: 'YES',
    TIME_TYPE: 'UT',
    TIME_DIGITS: 'SECONDS',
  });
  const { header, row } = await fetchAndParse(params);
  const xIdx = header.findIndex(h => /^X$/i.test(h));
  const yIdx = header.findIndex(h => /^Y$/i.test(h));
  const zIdx = header.findIndex(h => /^Z$/i.test(h));
  if (xIdx < 0 || yIdx < 0 || zIdx < 0) {
    throw new Error(`HORIZONS VECTORS response missing X/Y/Z columns; header was: ${header.join('|')}`);
  }
  return {
    x: parseFloat(row[xIdx]),
    y: parseFloat(row[yIdx]),
    z: parseFloat(row[zIdx]),
  };
}

module.exports = {
  HORIZONS_API_URL,
  formatTime,
  parseCSVLine,
  parseHORIZONSCSV,
  queryObserverEcliptic,
  queryVectorsPosition,
};
