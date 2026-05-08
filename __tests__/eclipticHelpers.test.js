const astronomy = require('astronomy-engine');
const AntikytheraEngine = require('../engine');

const engine = new AntikytheraEngine();

// Convert |Δlon| to a positive arcsec value, accounting for the 360°
// wraparound (e.g. 359.99 vs 0.01 should be 0.02° = 72").
function arcsecDiffLon(a, b) {
  let d = Math.abs(a - b);
  if (d > 180) d = 360 - d;
  return d * 3600;
}

describe('eclipticFromEquatorVec_EQJ — canonical J2000 ECL pattern', () => {
  test('matches direct Rotation_EQJ_ECL → RotateVector → SphereFromVector at J2000 epoch within 1″', () => {
    // J2000.0 reference epoch
    const date = new Date('2000-01-01T12:00:00Z');
    const observer = new astronomy.Observer(0, 0, 0);
    const equator = astronomy.Equator('Sun', date, observer, false, true);

    const helperResult = engine.eclipticFromEquatorVec_EQJ(equator.vec);

    // Compute the same value via the canonical pattern, computed inline as
    // ground truth — deliberately bypasses the helper to detect any drift.
    const groundTruth = astronomy.SphereFromVector(
      astronomy.RotateVector(astronomy.Rotation_EQJ_ECL(), equator.vec)
    );

    expect(arcsecDiffLon(helperResult.elon, groundTruth.lon)).toBeLessThan(1);
    expect(Math.abs(helperResult.elat - groundTruth.lat) * 3600).toBeLessThan(1);
  });

  test('produces longitude in [0, 360)', () => {
    const date = new Date('2026-05-08T00:00:00Z');
    const observer = new astronomy.Observer(0, 0, 0);
    for (const body of ['Sun', 'Moon', 'Mars', 'Jupiter']) {
      const equator = astronomy.Equator(body, date, observer, false, true);
      const result = engine.eclipticFromEquatorVec_EQJ(equator.vec);
      expect(result.elon).toBeGreaterThanOrEqual(0);
      expect(result.elon).toBeLessThan(360);
    }
  });
});

describe('eclipticFromEquatorVec_EQJ_to_ECT — true ecliptic of date wrapper', () => {
  test('at J2000 epoch, ECL and ECT longitudes agree within nutation envelope (≤ 30″)', () => {
    // At J2000.0, precession is zero by definition; only nutation differs.
    // Nutation in ecliptic longitude is bounded by ~17″ (peak), so 30″
    // tolerance is comfortably above the noise floor.
    const date = new Date('2000-01-01T12:00:00Z');
    const observer = new astronomy.Observer(0, 0, 0);
    const equator = astronomy.Equator('Sun', date, observer, false, true);

    const ecl = engine.eclipticFromEquatorVec_EQJ(equator.vec);
    const ect = engine.eclipticFromEquatorVec_EQJ_to_ECT(equator.vec);

    expect(arcsecDiffLon(ecl.elon, ect.elon)).toBeLessThan(30);
  });

  test('at 2026 epoch, ECT lags ECL by ~22 arcmin (precession from J2000)', () => {
    // Structural signature of the bug: general precession of equinoxes is
    // ~50.291″/yr. At 2026-05-08 (~26.35 yr from J2000) that is ~1325″
    // ≈ 22.08 arcmin. A nutation envelope (±17″ ≈ ±0.28′) is layered on top.
    // If this assertion fails, the helpers are not in the frames they claim.
    const date = new Date('2026-05-08T00:00:00Z');
    const observer = new astronomy.Observer(0, 0, 0);
    const equator = astronomy.Equator('Sun', date, observer, false, true);

    const ecl = engine.eclipticFromEquatorVec_EQJ(equator.vec);
    const ect = engine.eclipticFromEquatorVec_EQJ_to_ECT(equator.vec);

    const deltaArcsec = arcsecDiffLon(ecl.elon, ect.elon);
    const expectedArcsec = 22 * 60; // 22 arcmin = 1320″
    // Tolerance ±20″ as specified in the task acceptance criteria.
    expect(deltaArcsec).toBeGreaterThan(expectedArcsec - 20);
    expect(deltaArcsec).toBeLessThan(expectedArcsec + 20);
  });
});
