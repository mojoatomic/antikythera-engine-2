module.exports = {
  VALIDATION: {
    authority: 'NASA JPL HORIZONS',
    date: '2025-10-26',
    url: 'https://github.com/mojoatomic/antikythera-engine-2/blob/main/docs/VALIDATION.md',

    // Extended validation (48 samples over 30 days)
    span: {
      start: '2025-10-26',
      end: '2025-11-25',
    },
    sample_count: 336, // 7 bodies × 48 timestamps

    // Aggregate statistics (arcsec)
    aggregate: {
      typical_arcsec: 1.61,  // p50 across lon/lat
      max_arcsec: 8.62,
      p50_arcsec: 1.61,
      p95_arcsec: 8.30,
    },

    // Per-body statistics (arcsec) for precision=full
    bodies: {
      sun: { 
        lon: { p50: 0.52, p95: 0.91, max: 0.96 },
        lat: { p50: 0.40, p95: 0.66, max: 0.70 }
      },
      moon: { 
        lon: { p50: 2.61, p95: 5.51, max: 6.04 },
        lat: { p50: 0.64, p95: 1.13, max: 1.28 }
      },
      mercury: { 
        lon: { p50: 0.78, p95: 2.37, max: 2.59 },
        lat: { p50: 1.36, p95: 3.98, max: 4.11 }
      },
      venus: { 
        lon: { p50: 1.39, p95: 2.10, max: 2.37 },
        lat: { p50: 0.40, p95: 1.45, max: 1.52 }
      },
      mars: { 
        lon: { p50: 0.44, p95: 0.74, max: 0.91 },
        lat: { p50: 1.32, p95: 1.54, max: 1.61 }
      },
      jupiter: { 
        lon: { p50: 2.96, p95: 3.32, max: 3.38 },
        lat: { p50: 1.35, p95: 1.54, max: 1.58 }
      },
      saturn: { 
        lon: { p50: 8.22, p95: 8.60, max: 8.62 },
        lat: { p50: 0.50, p95: 0.70, max: 0.73 }
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
