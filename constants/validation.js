module.exports = {
  VALIDATION: {
    authority: 'NASA JPL HORIZONS',
    date: '2025-10-26',
    url: 'https://github.com/mojoatomic/antikythera-engine-2/blob/main/docs/VALIDATION.md',

    // From single validation run
    span: {
      start: '2025-10-26',
      end: '2025-10-26',
    },
    sample_count: 7, // 7 bodies × 1 timestamp

    // Aggregate statistics
    aggregate: {
      typical_arcsec: 1.4,  // p50 across lon/lat
      max_arcsec: 8.6,
      p50_arcsec: 1.4,
      p95_arcsec: null,
    },

    // Per-body max absolute errors (arcsec) for precision=full
    bodies: {
      sun: { lon: 0.4, lat: 0.7 },
      moon: { lon: 1.9, lat: 0.3 },
      mercury: { lon: 1.4, lat: 2.1 },
      venus: { lon: 1.1, lat: 0.3 },
      mars: { lon: 0.5, lat: 1.6 },
      jupiter: { lon: 2.8, lat: 1.1 },
      saturn: { lon: 8.6, lat: 0.5 },
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
