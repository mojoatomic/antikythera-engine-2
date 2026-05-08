module.exports = {
  VALIDATION: {
    authority: 'NASA JPL HORIZONS',
    date: '2026-05-08',
    url: 'https://github.com/mojoatomic/antikythera-engine-2/blob/main/docs/VALIDATION.md',

    // Two parallel measurements:
    //   ECL — `bodies` (canonical public-API frame): `validate-ecl-vectors.js`
    //         using HORIZONS EPHEM_TYPE=VECTORS, REF_PLANE=ECLIPTIC,
    //         REF_SYSTEM=J2000, VEC_CORR=LT+S.
    //   ECT — `bodies_ect`: `validate-extended.js` using
    //         EPHEM_TYPE=OBSERVER, QUANTITIES=31 (ObsEcLon/ObsEcLat — ECT
    //         regardless of REF_SYSTEM, which only affects vector queries).
    //
    // Each block is 48 timestamps × 7 bodies = 336 samples. Numbers below
    // are evidence of measured agreement, not regenerated from code.
    span: {
      start: '2026-05-08T23:25:52Z',
      end: '2026-06-07T23:25:52Z',
    },
    sample_count: 336, // per frame

    // Aggregate (ECL — matches public-API frame). ECT aggregate is within
    // 0.01″ of these on every metric (sampling noise; the two paths produce
    // numerically equivalent agreement against HORIZONS).
    aggregate: {
      typical_arcsec: 1.63,
      max_arcsec: 8.95,
      p50_arcsec: 1.63,
      p95_arcsec: 8.58,
    },

    // Per-body ECL stats — used by validate-ecl-vectors.js for the per-body
    // 3× p95 threshold lookup, and by precision-builder.js for the
    // public-facing `validated_error` block on /api/display.
    bodies: {
      sun: {
        lon: { p50: 1.21, p95: 1.83, max: 2.03 },
        lat: { p50: 0.34, p95: 0.86, max: 0.92 }
      },
      moon: {
        lon: { p50: 2.87, p95: 3.97, max: 4.37 },
        lat: { p50: 0.67, p95: 1.25, max: 1.29 }
      },
      mercury: {
        lon: { p50: 1.21, p95: 3.34, max: 4.00 },
        lat: { p50: 0.86, p95: 1.73, max: 1.85 }
      },
      venus: {
        lon: { p50: 0.48, p95: 1.25, max: 1.31 },
        lat: { p50: 0.43, p95: 0.84, max: 0.97 }
      },
      mars: {
        lon: { p50: 0.83, p95: 1.10, max: 1.12 },
        lat: { p50: 2.40, p95: 2.63, max: 2.67 }
      },
      jupiter: {
        lon: { p50: 2.00, p95: 2.29, max: 2.31 },
        lat: { p50: 1.13, p95: 1.29, max: 1.31 }
      },
      saturn: {
        lon: { p50: 8.49, p95: 8.85, max: 8.95 },
        lat: { p50: 1.24, p95: 1.49, max: 1.50 }
      },
    },

    // Per-body ECT stats — informational mirror, populated from the same
    // 30-day window so the two frames can be compared at a glance.
    // validate-all-bodies.js still reads VALIDATION.bodies for its threshold
    // (ECT and ECL p95 differ by < 0.1″, so the sub-arcsec mismatch is below
    // the validator's resolution).
    bodies_ect: {
      sun: {
        lon: { p50: 1.28, p95: 1.80, max: 1.99 },
        lat: { p50: 0.34, p95: 0.85, max: 0.92 }
      },
      moon: {
        lon: { p50: 2.84, p95: 4.06, max: 4.46 },
        lat: { p50: 0.68, p95: 1.24, max: 1.30 }
      },
      mercury: {
        lon: { p50: 1.19, p95: 3.29, max: 3.95 },
        lat: { p50: 0.86, p95: 1.71, max: 1.85 }
      },
      venus: {
        lon: { p50: 0.45, p95: 1.33, max: 1.40 },
        lat: { p50: 0.43, p95: 0.84, max: 0.97 }
      },
      mars: {
        lon: { p50: 0.87, p95: 1.11, max: 1.25 },
        lat: { p50: 2.40, p95: 2.63, max: 2.67 }
      },
      jupiter: {
        lon: { p50: 2.01, p95: 2.32, max: 2.35 },
        lat: { p50: 1.14, p95: 1.30, max: 1.31 }
      },
      saturn: {
        lon: { p50: 8.47, p95: 8.83, max: 8.89 },
        lat: { p50: 1.24, p95: 1.49, max: 1.50 }
      },
    },
  },

  CONVENTIONS: {
    coordinate_frame: 'J2000 ecliptic',
    calculation_method: 'astronomy-engine (VSOP87/ELP2000)',
    angle_units: 'degrees',
    error_units: 'arcsec',
    longitude_wrap: '[0,360)',
    apparent: true,
  },
};
