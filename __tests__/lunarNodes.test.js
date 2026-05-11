const AntikytheraEngine = require('../engine');

const engine = new AntikytheraEngine();

describe('getLunarNodes — instantaneous geometric computation in ECL', () => {
  test('Ω at J2000 epoch matches HORIZONS osculating value within 1′', () => {
    // HORIZONS reference (queried directly from JPL SSD API):
    //   COMMAND=301 (Moon), CENTER=500@399 (geocentric),
    //   EPHEM_TYPE=ELEMENTS, REF_PLANE=ECLIPTIC, REF_SYSTEM=J2000,
    //   START=2000-Jan-01 12:00 TDB
    //   → OM = 123.9580554371928°
    //
    // Our test date is the 12:00 UTC moment, which differs from 12:00 TDB
    // by ΔT ≈ 64 s. Over 64 s, Ω changes by < 0.001″ — negligible at the
    // 1′ tolerance below.
    const date = new Date('2000-01-01T12:00:00Z');
    const HORIZONS_OM = 123.9580554; // degrees, ECL J2000

    const result = engine.getLunarNodes(date);

    expect(result.frame).toBe('ecliptic_j2000');
    const deltaArcmin = Math.abs(result.ascendingNode - HORIZONS_OM) * 60;
    expect(deltaArcmin).toBeLessThan(1); // 1 arcmin
  });

  test('descending node is exactly 180° opposite ascending node', () => {
    const date = new Date('2026-05-08T00:00:00Z');
    const result = engine.getLunarNodes(date);
    let delta = Math.abs(result.ascendingNode - result.descendingNode);
    if (delta > 180) delta = 360 - delta;
    expect(delta).toBeCloseTo(180, 9);
  });

  test('ascending node regresses (mean rate ~ -19.34°/yr) over a multi-year span', () => {
    // Instantaneous Ω wobbles around the mean by ~1.5° on a ~206-day cycle
    // (from short-period lunar perturbations), so a single one-year sample
    // can be off by several °/yr from the mean rate. Averaging over 18 years
    // (≈ one full nodal regression cycle) collapses that wobble.
    const t1 = new Date('2002-01-01T00:00:00Z');
    const t2 = new Date('2020-01-01T00:00:00Z');
    const yearsSpan = (t2 - t1) / (365.25 * 24 * 3600 * 1000);
    const r1 = engine.getLunarNodes(t1);
    const r2 = engine.getLunarNodes(t2);

    // 18 years ≈ 18 × -19.34° = -348°. With unwrap into [-180, 180],
    // 18 × full retrograde mod 360 = -348° mod 360 = +12°. So we count
    // full revolutions and pick the unwrap that matches the secular trend.
    const expectedTotal = -19.3416 * yearsSpan;
    let raw = r2.ascendingNode - r1.ascendingNode;
    // Find the integer k that minimizes |raw + 360k − expectedTotal|.
    const k = Math.round((expectedTotal - raw) / 360);
    const total = raw + 360 * k;
    const ratePerYear = total / yearsSpan;

    expect(ratePerYear).toBeLessThan(0); // retrograde
    expect(ratePerYear).toBeGreaterThan(-19.3416 - 0.2); // ±0.2°/yr after averaging
    expect(ratePerYear).toBeLessThan(-19.3416 + 0.2);
  });

  test('output longitudes are normalized to [0, 360)', () => {
    for (const iso of ['1995-06-15T00:00:00Z', '2025-12-25T00:00:00Z', '2050-03-01T00:00:00Z']) {
      const r = engine.getLunarNodes(new Date(iso));
      expect(r.ascendingNode).toBeGreaterThanOrEqual(0);
      expect(r.ascendingNode).toBeLessThan(360);
      expect(r.descendingNode).toBeGreaterThanOrEqual(0);
      expect(r.descendingNode).toBeLessThan(360);
    }
  });
});

describe('getLunarNodes — ECT frame override (#97)', () => {
  test('passing frame=ecliptic_of_date stamps frame field accordingly', () => {
    const date = new Date('2026-05-11T12:00:00Z');
    const result = engine.getLunarNodes(date, 'ecliptic_of_date');
    expect(result.frame).toBe('ecliptic_of_date');
  });

  test('default (no frame arg) preserves pre-#97 ECL behavior bit-for-bit', () => {
    // The ECT-frame code path uses Rotation_EQJ_ECT(date) instead of the
    // cached ROT_EQJ_TO_ECL. The default-argument path must still hit
    // ROT_EQJ_TO_ECL → same result as before the threading change.
    const date = new Date('2026-05-11T12:00:00Z');
    const explicit = engine.getLunarNodes(date, 'ecliptic_j2000');
    const implicit = engine.getLunarNodes(date);
    expect(implicit.ascendingNode).toBe(explicit.ascendingNode);
    expect(implicit.descendingNode).toBe(explicit.descendingNode);
    expect(implicit.frame).toBe('ecliptic_j2000');
    expect(explicit.frame).toBe('ecliptic_j2000');
  });

  test('ECT ascending node differs from ECL by ≈ accumulated precession+nutation at the epoch', () => {
    // 2026 is ~26.4 yr since J2000 → ~1327″ ≈ 0.369° precession alone,
    // plus ±9″ nutation oscillation. Allow ±0.05° tolerance.
    const date = new Date('2026-05-11T12:00:00Z');
    const ecl = engine.getLunarNodes(date, 'ecliptic_j2000');
    const ect = engine.getLunarNodes(date, 'ecliptic_of_date');

    // The node longitude shift between frames has the same sign+magnitude
    // as for any other body longitude, modulo the 360° wrap. Unwrap to a
    // signed delta in [-180, 180].
    let delta = ect.ascendingNode - ecl.ascendingNode;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    expect(delta).toBeGreaterThan(0.32);
    expect(delta).toBeLessThan(0.42);
  });

  test('descending node remains exactly 180° opposite ascending node in ECT', () => {
    const date = new Date('2026-05-11T12:00:00Z');
    const result = engine.getLunarNodes(date, 'ecliptic_of_date');
    let delta = Math.abs(result.ascendingNode - result.descendingNode);
    if (delta > 180) delta = 360 - delta;
    expect(delta).toBeCloseTo(180, 9);
  });

  test('output longitudes are normalized to [0, 360) in ECT', () => {
    for (const iso of ['1995-06-15T00:00:00Z', '2025-12-25T00:00:00Z', '2050-03-01T00:00:00Z']) {
      const r = engine.getLunarNodes(new Date(iso), 'ecliptic_of_date');
      expect(r.ascendingNode).toBeGreaterThanOrEqual(0);
      expect(r.ascendingNode).toBeLessThan(360);
      expect(r.descendingNode).toBeGreaterThanOrEqual(0);
      expect(r.descendingNode).toBeLessThan(360);
    }
  });
});
