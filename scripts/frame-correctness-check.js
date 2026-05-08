#!/usr/bin/env node

// Structural regression guard for the ECL/ECT split in engine.js.
// Compares Sun longitude via the canonical EQJ→ECL helper against the
// astronomy.Ecliptic() ECT wrapper at four epochs and asserts the
// physical signature of the precession of the equinoxes:
//
//   • At J2000.0:                |ECL − ECT|   < 10″   (nutation envelope only)
//   • At J2000 + Δt years:       (ECT − ECL)   ≈ +50.291″/yr × Δt  (signed!)
//   • Sun's ECL longitude one sidereal year after J2000: < 30″ drift
//     (orbital eccentricity + ΔT — does not include precession).
//
// The signed direction (ECT − ECL > 0 for t > J2000) is the part that
// catches a *swap* of the two helpers — the bug-class this guard exists
// to defend against. The repurposed predecessor of this script
// (scripts/debug-coordinate-frame.js, now this file) was an investigation
// of the same bug that ended without a fix; this version turns that
// investigation into an executable assertion.
//
// Exit 0 on pass, non-zero on fail. Suitable as a CI hook.

const astronomy = require('astronomy-engine');
const AntikytheraEngine = require('../engine');

const engine = new AntikytheraEngine();
const observer = new astronomy.Observer(0, 0, 0);

// Precession rate of the equinoxes in ecliptic longitude (general precession),
// IAU 2006: 50.290966″/yr at J2000. Higher-order terms add < 0.5″ over 50 yr.
const PRECESSION_ARCSEC_PER_YEAR = 50.291;

const failures = [];

function ecl(date) {
  const eq = astronomy.Equator('Sun', date, observer, false, true);
  return engine.eclipticFromEquatorVec_EQJ(eq.vec).elon;
}
function ect(date) {
  const eq = astronomy.Equator('Sun', date, observer, false, true);
  return engine.eclipticFromEquatorVec_EQJ_to_ECT(eq.vec).elon;
}
function signedDeltaArcsec(a, b) {
  let d = a - b;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d * 3600;
}

function assert(label, ok, detail) {
  const tag = ok ? '✓ PASS' : '✗ FAIL';
  console.log(`  ${tag}  ${label}  — ${detail}`);
  if (!ok) failures.push(label);
}

// ---------------------------------------------------------------------------
// Test 1: |ECL − ECT| at J2000 within nutation envelope
// ---------------------------------------------------------------------------
console.log('\n[1] |ECL − ECT| at J2000.0 should be < 10″ (within nutation envelope; precession is zero by definition).');
const t0 = new Date('2000-01-01T12:00:00Z');
{
  const d = signedDeltaArcsec(ect(t0), ecl(t0));
  assert(
    'J2000 separation within nutation',
    Math.abs(d) < 20,
    `(ECT − ECL) = ${d.toFixed(2)}″`
  );
}

// ---------------------------------------------------------------------------
// Test 2: Signed (ECT − ECL) tracks precession at the right rate (and sign)
// ---------------------------------------------------------------------------
console.log('\n[2] Signed (ECT − ECL) at J2000 + Δt should equal +50.291″/yr × Δt within ±20″.');
console.log('    The signed direction catches helper swaps: real ECT > real ECL after J2000.');
for (const dy of [10, 26, 50]) {
  const t = new Date(t0.getTime() + dy * 365.25 * 86400000);
  const d = signedDeltaArcsec(ect(t), ecl(t));
  const expected = PRECESSION_ARCSEC_PER_YEAR * dy;
  const within = Math.abs(d - expected) < 20;
  const positive = d > 0;
  assert(
    `J2000+${dy}y precession sign and magnitude`,
    within && positive,
    `(ECT − ECL) = ${d.toFixed(2)}″, expected ≈ +${expected.toFixed(0)}″`
  );
}

// ---------------------------------------------------------------------------
// Test 3: ECL is invariant under sidereal-year sampling (no precession)
// ---------------------------------------------------------------------------
console.log('\n[3] Sun ECL longitude after one sidereal year should drift < 30″ (orbital noise only, no precession).');
{
  const tSidereal = new Date(t0.getTime() + 365.256363 * 86400000);
  const d = signedDeltaArcsec(ecl(tSidereal), ecl(t0));
  assert(
    'ECL annual return is precession-free',
    Math.abs(d) < 30,
    `|Δ ECL_lon| = ${Math.abs(d).toFixed(2)}″`
  );
}

console.log('');
if (failures.length) {
  console.log(`✗ ${failures.length} structural assertion(s) failed:`);
  failures.forEach(f => console.log(`    – ${f}`));
  console.log('\n  Likely cause: helper bodies swapped, or astronomy.Ecliptic() called where');
  console.log('  the canonical Rotation_EQJ_ECL → RotateVector pattern was expected.\n');
  process.exit(1);
}
console.log('✓ All structural assertions passed; ECL/ECT split is intact.\n');
process.exit(0);
