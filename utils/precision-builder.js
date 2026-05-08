const { VALIDATION, CONVENTIONS } = require('../constants/validation');
const { API_VERSION, ENGINE_VERSION, GIT_SHA } = require('./metadata');

function buildPrecisionMetadata() {
  return {
    validated_against: VALIDATION.authority,
    validation_date: new Date().toISOString().split('T')[0],
    coordinate_frame: CONVENTIONS.coordinate_frame,
    calculation_method: CONVENTIONS.calculation_method,
    typical_error_arcsec: VALIDATION.aggregate.typical_arcsec,
    max_error_arcsec: VALIDATION.aggregate.max_arcsec,
    validation_url: VALIDATION.url,
    error_quantiles_arcsec: {
      p50: VALIDATION.aggregate.p50_arcsec,
      p95: VALIDATION.aggregate.p95_arcsec,
      max: VALIDATION.aggregate.max_arcsec,
    },
  };
}

function buildReproducibilityMetadata() {
  return {
    api_version: API_VERSION,
    engine_version: ENGINE_VERSION,
    git_sha: GIT_SHA,
    validation_span: {
      start: VALIDATION.span.start,
      end: VALIDATION.span.end,
    },
    sample_count: VALIDATION.sample_count,
    conventions: {
      angle_units: CONVENTIONS.angle_units,
      error_units: CONVENTIONS.error_units,
      longitude_wrap: CONVENTIONS.longitude_wrap,
      apparent: CONVENTIONS.apparent,
      frame: CONVENTIONS.coordinate_frame,
    },
  };
}

function addPerBodyErrors(coords) {
  const result = {};
  for (const [bodyName, coord] of Object.entries(coords)) {
    const bodyErrors = VALIDATION.bodies[bodyName];
    result[bodyName] = { lon: coord.lon, lat: coord.lat };
    if (bodyErrors) {
      result[bodyName].validated_error = {
        lon_arcsec: bodyErrors.lon,
        lat_arcsec: bodyErrors.lat,
        lon_p95_arcsec: null,
        lat_p95_arcsec: null,
        max_arcsec: VALIDATION.aggregate.max_arcsec,
      };
    }
  }
  return result;
}

function buildSystemMetadata(options) {
  const {
    cached = false,
    computationTime = 0,
    fullPrecision = false,
    eclipticCoords = {},
    eclipticCoordsEct = null,
    debugData = {},
  } = options;

  const debug = {
    ...debugData,
    // ecliptic_coordinates carries ECL (J2000 mean ecliptic) post-fix —
    // matches the public-API frame label in CONVENTIONS.coordinate_frame.
    ecliptic_coordinates: fullPrecision ? addPerBodyErrors(eclipticCoords) : eclipticCoords,
  };
  // ecliptic_coordinates_ect carries true-ecliptic-of-date values for the
  // OBSERVER+Q31 HORIZONS validators (validate-extended, validate-all-bodies,
  // validate-horizons, validate-simple). Same shape as ecliptic_coordinates;
  // emitted when the caller opts in by passing eclipticCoordsEct.
  if (eclipticCoordsEct) {
    debug.ecliptic_coordinates_ect = eclipticCoordsEct;
  }

  const system = {
    healthy: true,
    cached,
    computation_time_ms: computationTime,
    precision: buildPrecisionMetadata(),
    reproducibility: buildReproducibilityMetadata(),
    debug,
  };
  return system;
}

module.exports = {
  buildSystemMetadata,
};
