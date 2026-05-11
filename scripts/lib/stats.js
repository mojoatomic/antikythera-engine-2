// Statistics utilities shared by the validate-*.js scripts.
//
// Implementations match the existing inline copies in validate-extended.js
// and validate-ecl-vectors.js bit-for-bit, including the longitude-
// wraparound convention. Bit-identity is the load-bearing property for the
// Task 9 equivalence gate.

// Smallest absolute longitude difference in degrees, with [0, 360)
// wraparound. Result is always in [0, 180].
function wrapLonDiffDeg(a, b) {
  let d = (a - b + 540) % 360 - 180;
  return Math.abs(d);
}

// Linear-interpolation quantile on a pre-sorted array.
// p in [0, 1]. Returns null on empty input. Matches the existing inline
// implementations in validate-extended.js (line 49) and validate-ecl-vectors.js
// (line 46) bit-for-bit.
function quantile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const h = idx - lo;
  return sorted[lo] * (1 - h) + sorted[hi] * h;
}

// |a - b| in arcsec, treating both as longitude on [0, 360) so wraparound
// at 0°/360° produces the small-angle answer. Convenience wrapper.
function arcsecDiffLon(a, b) {
  return wrapLonDiffDeg(a, b) * 3600;
}

module.exports = {
  wrapLonDiffDeg,
  quantile,
  arcsecDiffLon,
};
