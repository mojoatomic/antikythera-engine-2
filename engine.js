const astronomy = require('astronomy-engine');
const { MS_PER_DAY } = require('./constants/time');
const TimeUtils = require('./utils/time');
const { getUtcOffsetMinutes } = require('./utils/tz');

// =============================================================================
// REGRESSION PREVENTION — DO NOT REMOVE
// -----------------------------------------------------------------------------
// astronomy.Ecliptic(eqj) is NOT the right way to obtain J2000 mean ecliptic
// (ECL) coordinates, despite the suggestive name. It applies precession +
// nutation and returns *true ecliptic of date* (ECT) — i.e. the ecliptic of
// the moment, not the J2000 ecliptic. Using it where ECL is expected silently
// rotates outputs by the accumulated precession (~50.3"/yr ≈ 22 arcmin since
// J2000 by 2026) plus a small nutation envelope.
//
// The canonical J2000 ECL pattern is:
//     RotateVector(Rotation_EQJ_ECL(), eqjVec) → SphereFromVector(...)
// The rotation matrix is constant (both EQJ and ECL are J2000-fixed), so we
// cache it at module load. Per-call recomputation buys nothing.
//
// If you need ECT (true ecliptic of date) — e.g. for the zodiac path or for
// comparison against HORIZONS OBSERVER/QUANTITIES=31 output — use the explicit
// `eclipticFromEquatorVec_EQJ_to_ECT` helper, which wraps astronomy.Ecliptic().
// =============================================================================
const ROT_EQJ_TO_ECL = astronomy.Rotation_EQJ_ECL();

// Frame-stamp every API output that has a coordinate frame. Surfaced as a
// top-level `coordinate_frames` field on /api/state and /api/display; same
// shape across endpoints. Calendar/cycle/phase fields (egyptianCalendar,
// metonicCycle, sarosCycle, moon.phase, moon.illumination,
// equationOfTime.meanSun) don't have celestial frames — correctly absent.
const COORDINATE_FRAMES = Object.freeze({
  'bodies.ecliptic': 'ecliptic_j2000',
  'bodies.equatorial': 'equatorial_j2000',
  'bodies.horizontal': 'topocentric_apparent',
  'zodiac': 'ecliptic_of_date',
  'lunarNodes': 'ecliptic_j2000',
  'sunVisibility.horizontal': 'topocentric_apparent',
  'equationOfTime.apparentSun': 'ecliptic_j2000'
});

// Subset of COORDINATE_FRAMES used by /api/sun, /api/moon, /api/planets.
// Those endpoints return body-only data — three frames are in play
// (ecliptic, equatorial, horizontal) and the `bodies.` prefix becomes
// redundant because the body IS the response. zodiac, lunarNodes,
// sunVisibility.*, equationOfTime.* don't appear on single-body responses
// and so don't appear here. Refs #96.
const SINGLE_BODY_COORDINATE_FRAMES = Object.freeze({
  'ecliptic': 'ecliptic_j2000',
  'equatorial': 'equatorial_j2000',
  'horizontal': 'topocentric_apparent'
});

class AntikytheraEngine {
  /**
   * Convert an equator-of-date vector to J2000 mean ecliptic angles
   */
  eclipticFromEquatorVec_EQD(date, equatorVec) {
    const rot = astronomy.Rotation_EQD_ECL(date);
    const eclVec = astronomy.RotateVector(rot, equatorVec);
    const sph = astronomy.SphereFromVector(eclVec);
    let elon = sph.lon % 360; if (elon < 0) elon += 360;
    return { elon, elat: sph.lat };
  }

  /**
   * Convert a J2000 equator vector (EQJ) to J2000 mean ecliptic (ECL) angles.
   * Uses the canonical Rotation_EQJ_ECL → RotateVector → SphereFromVector chain.
   * See REGRESSION PREVENTION block above.
   */
  eclipticFromEquatorVec_EQJ(equatorJ2000Vec) {
    const eclVec = astronomy.RotateVector(ROT_EQJ_TO_ECL, equatorJ2000Vec);
    const sph = astronomy.SphereFromVector(eclVec);
    return { elon: sph.lon, elat: sph.lat };
  }

  /**
   * Convert a J2000 equator vector (EQJ) to true ecliptic of date (ECT) angles.
   * Wraps astronomy.Ecliptic(), which applies precession + nutation under the
   * hood. Use only where ECT is the intended frame (zodiac path, OBSERVER/Q31
   * HORIZONS comparisons). For inertial/orbital outputs default to ECL via
   * `eclipticFromEquatorVec_EQJ`.
   */
  eclipticFromEquatorVec_EQJ_to_ECT(equatorJ2000Vec) {
    const ecl = astronomy.Ecliptic(equatorJ2000Vec);
    return { elon: ecl.elon, elat: ecl.elat };
  }

  /**
   * Calculate sun visibility and daylight information for a given location and time
   */
  getSunVisibility(date, observer) {
    // Current sun position
    const sunPos = this.getSunPosition(date, observer);
    
    // Find sunrise and sunset for this day
    // Use a search window that ensures we get today's sunrise/sunset
    const startOfDay = TimeUtils.utcStartOfDay(date);
    const _endOfDay = TimeUtils.utcEndOfDay(date);
    
    let sunrise = null;
    let sunset = null;
    
    try {
      // Search for sunrise (sun rising above horizon) within today
      sunrise = astronomy.SearchRiseSet('Sun', observer, 1, startOfDay, 1);
      // Verify it's actually today (using UTC date comparison)
      if (sunrise) {
        const sunriseDate = sunrise.date || sunrise;
        if (!TimeUtils.sameUtcDate(sunriseDate, date)) {
          sunrise = null;
        }
      }
      
      // Search for sunset (sun setting below horizon) within today
      sunset = astronomy.SearchRiseSet('Sun', observer, -1, startOfDay, 1);
      // Verify it's actually today (using UTC date comparison)
      if (sunset) {
        const sunsetDate = sunset.date || sunset;
        if (!TimeUtils.sameUtcDate(sunsetDate, date)) {
          sunset = null;
        }
      }
    } catch (_e) {
      // Handle polar day/night (no sunrise or sunset)
      const noon = TimeUtils.utcNoon(date);
      const noonSun = this.getSunPosition(noon, observer);
      
      if (noonSun.altitude > 0) {
        // Polar day - sun never sets
        return {
          currentPosition: {
            azimuth: sunPos.azimuth,
            altitude: sunPos.altitude,
            isVisible: true
          },
          sunrise: null,
          sunset: null,
          daylight: {
            hours: 24,
            percent: 1.0,
            arcDegrees: 360,
            type: 'polar_day'
          }
        };
      } else {
        // Polar night - sun never rises
        return {
          currentPosition: {
            azimuth: sunPos.azimuth,
            altitude: sunPos.altitude,
            isVisible: false
          },
          sunrise: null,
          sunset: null,
          daylight: {
            hours: 0,
            percent: 0.0,
            arcDegrees: 0,
            type: 'polar_night'
          }
        };
      }
    }
    
    // Get sun positions at sunrise and sunset
    const sunriseDate = sunrise ? (sunrise.date || sunrise) : null;
    const sunsetDate = sunset ? (sunset.date || sunset) : null;
    const sunrisePos = sunriseDate ? this.getSunPosition(sunriseDate, observer) : null;
    const sunsetPos = sunsetDate ? this.getSunPosition(sunsetDate, observer) : null;
    
    // Calculate daylight duration
    // When only one of sunrise/sunset is available (polar twilight transitions),
    // we cannot compute a meaningful daylight duration from the pair.
    let daylightHours, daylightPercent, arcDegrees, daylightType;
    if (sunriseDate && sunsetDate) {
      const daylightMs = sunsetDate - sunriseDate;
      daylightHours = daylightMs / (1000 * 60 * 60);
      // Negative duration means sunset is before sunrise (sun is up at midnight);
      // wrap to get the actual sunlit portion of the day.
      if (daylightHours < 0) daylightHours += 24;
      daylightPercent = daylightHours / 24;
      arcDegrees = daylightPercent * 360;
      daylightType = 'normal';
    } else if (sunriseDate && !sunsetDate) {
      // Sun rises but doesn't set today — approaching polar day
      daylightHours = 24;
      daylightPercent = 1.0;
      arcDegrees = 360;
      daylightType = 'no_sunset';
    } else if (!sunriseDate && sunsetDate) {
      // Sun sets but didn't rise today — approaching polar night
      daylightHours = 0;
      daylightPercent = 0.0;
      arcDegrees = 0;
      daylightType = 'no_sunrise';
    } else {
      // Neither sunrise nor sunset found — determine from current altitude
      const isPolarDay = sunPos.altitude > 0;
      daylightHours = isPolarDay ? 24 : 0;
      daylightPercent = isPolarDay ? 1.0 : 0.0;
      arcDegrees = isPolarDay ? 360 : 0;
      daylightType = isPolarDay ? 'polar_day' : 'polar_night';
    }

    return {
      currentPosition: {
        azimuth: sunPos.azimuth,
        altitude: sunPos.altitude,
        isVisible: sunPos.altitude > 0
      },
      sunrise: sunrise ? {
        time: (sunrise.date || sunrise),
        azimuth: sunrisePos ? sunrisePos.azimuth : null
      } : null,
      sunset: sunset ? {
        time: (sunset.date || sunset),
        azimuth: sunsetPos ? sunsetPos.azimuth : null
      } : null,
      daylight: {
        hours: daylightHours,
        percent: daylightPercent,
        arcDegrees: arcDegrees,
        type: daylightType
      }
    };
  }

  /**
   * Calculate Equation of Time - difference between apparent and mean solar time
   */
  getEquationOfTime(date) {
    // Calculate fractional day of year using centralized time utilities
    const dayOfYear = TimeUtils.fractionalDayOfYear(date);
    
    // B parameter (in radians)
    const B = (2 * Math.PI / 365.25) * (dayOfYear - 81);
    
    // Equation of Time in minutes (simplified formula)
    const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    
    // Mean sun longitude (uniform motion: 360° / 365.25 days)
    // This represents where the sun WOULD be if it moved uniformly
    const meanLongitude = ((dayOfYear - 1) * (360 / 365.25)) % 360;
    
    // Get actual sun position for apparent longitude
    const observer = new astronomy.Observer(37.5, 23.0, 0);
    const sunPos = this.getSunPosition(date, observer);
    const apparentLongitude = sunPos.longitude;
    
    return {
      equationOfTime: {
        minutes: EoT,
        degrees: EoT / 4,
        status: EoT > 0 ? 'ahead' : 'behind'
      },
      meanSun: {
        longitude: meanLongitude,
        degreeOfYear: meanLongitude
      },
      apparentSun: {
        longitude: apparentLongitude,
        degreeOfYear: apparentLongitude
      }
    };
  }

  /**
   * Get the complete state of the Antikythera mechanism for a given date
   */
  getState(date = new Date(), latitude = 37.5, longitude = 23.0, observerInfo = null) {
    const elevation = observerInfo && typeof observerInfo.elevation === 'number' ? observerInfo.elevation : 0;
    const observer = new astronomy.Observer(latitude, longitude, elevation);
    
    const observerOut = observerInfo ? { ...observerInfo } : { latitude, longitude };
    if (observerOut && observerOut.timezone) {
      const off = getUtcOffsetMinutes(date, observerOut.timezone);
      if (off !== null) observerOut.utcOffsetMinutes = off;
    }

    return {
      date: date.toISOString(),
      location: { latitude, longitude },
      observer: observerOut,
      coordinate_frames: COORDINATE_FRAMES,
      sun: this.getSunPosition(date, observer),
      moon: this.getMoonPosition(date, observer),
      planets: this.getPlanetaryPositions(date, observer),
      zodiac: this.getZodiacPosition(date),
      egyptianCalendar: this.getEgyptianCalendar(date),
      metonicCycle: this.getMetonicCycle(date),
      sarosCycle: this.getSarosCycle(date),
      lunarNodes: this.getLunarNodes(date),
      nextEclipse: this.getNextEclipse(date, observer),
      nextOpposition: this.getNextOpposition(date),
      equationOfTime: this.getEquationOfTime(date),
      sunVisibility: this.getSunVisibility(date, observer)
    };
  }

  /**
   * Compute ecliptic-of-date (ECT) coordinates for the standard set of bodies.
   * Parallel to the ECL block in /api/display but routed through the explicit
   * ECT helper. Used by the OBSERVER+Q31 HORIZONS validators (validate-extended,
   * validate-all-bodies, validate-horizons, validate-simple) which inherently
   * compare against ECT.
   *
   * Accepts the same observer-shape used by getState (latitude, longitude,
   * optional elevation) to keep callers from having to construct an
   * astronomy.Observer themselves.
   */
  getEclipticCoordsECT(date, latitude = 37.5, longitude = 23.0, elevation = 0) {
    const observer = new astronomy.Observer(latitude, longitude, elevation);
    const result = {};
    const bodies = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
    for (const body of bodies) {
      const eq = astronomy.Equator(body, date, observer, false, true); // EQJ
      const ect = this.eclipticFromEquatorVec_EQJ_to_ECT(eq.vec);
      result[body.toLowerCase()] = { lon: ect.elon, lat: ect.elat };
    }
    return result;
  }

  getSunPosition(date, observer) {
    const equator = astronomy.Equator('Sun', date, observer, false, true); // EQJ
    const horizonEqd = astronomy.Equator('Sun', date, observer, true, true);
    const horizon = astronomy.Horizon(date, observer, horizonEqd.ra, horizonEqd.dec, 'normal');
    const ecliptic = this.eclipticFromEquatorVec_EQJ(equator.vec);
    
    const velocity = this.getVelocity('Sun', date, observer);
    
    return {
      longitude: ecliptic.elon, // Ecliptic longitude (degrees)
      latitude: ecliptic.elat,
      rightAscension: equator.ra,
      declination: equator.dec,
      altitude: horizon.altitude,
      azimuth: horizon.azimuth,
      velocity: velocity, // degrees per day
      angularVelocity: velocity / 24 // degrees per hour
    };
  }

  getMoonPosition(date, observer) {
    const phase = astronomy.MoonPhase(date);
    const equator = astronomy.Equator('Moon', date, observer, false, true); // EQJ
    const ecliptic = this.eclipticFromEquatorVec_EQJ(equator.vec);
    const illumination = astronomy.Illumination('Moon', date);
    const horizon = astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');
    
    const velocity = this.getVelocity('Moon', date, observer);
    
    return {
      longitude: ecliptic.elon,
      latitude: ecliptic.elat,
      phase: phase, // 0-360 degrees
      illumination: illumination.phase_fraction,
      age: phase / 12.368, // Approximate age in days (360°/29.53 days per degree)
      rightAscension: equator.ra,
      declination: equator.dec,
      altitude: horizon.altitude,
      azimuth: horizon.azimuth,
      velocity: velocity, // degrees per day
      angularVelocity: velocity / 24 // degrees per hour
    };
  }

  /**
   * Calculate velocity (degrees per day) for a celestial body
   * Uses 1-day delta to determine rate of change
   */
  getVelocity(body, date, observer) {
    const currentEquator = astronomy.Equator(body, date, observer, false, true);
    const currentEcliptic = this.eclipticFromEquatorVec_EQJ(currentEquator.vec);
    const currentLongitude = currentEcliptic.elon;
    
    // Calculate position 1 day later
    const nextDate = new Date(date.getTime() + MS_PER_DAY);
    const nextEquator = astronomy.Equator(body, nextDate, observer, false, true);
    const nextEcliptic = this.eclipticFromEquatorVec_EQJ(nextEquator.vec);
    const nextLongitude = nextEcliptic.elon;
    
    // Handle 360° wraparound (e.g., 359° -> 1°)
    let delta = nextLongitude - currentLongitude;
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }
    
    return delta; // degrees per day
  }

  getPlanetaryPositions(date, observer) {
    const planets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
    const positions = {};

    planets.forEach(planet => {
      const equator = astronomy.Equator(planet, date, observer, false, true);
      const ecliptic = this.eclipticFromEquatorVec_EQJ(equator.vec);
      const horizon = astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');
      
      // Calculate velocity and retrograde status
      const velocity = this.getVelocity(planet, date, observer);
      const isRetrograde = velocity < 0;
      
      positions[planet.toLowerCase()] = {
        longitude: ecliptic.elon,
        latitude: ecliptic.elat,
        rightAscension: equator.ra,
        declination: equator.dec,
        altitude: horizon.altitude,
        azimuth: horizon.azimuth,
        velocity: velocity, // degrees per day
        angularVelocity: velocity / 24, // degrees per hour
        isRetrograde: isRetrograde,
        motionState: isRetrograde ? 'retrograde' : 'prograde'
      };
    });

    return positions;
  }

  getZodiacPosition(date) {
    // Zodiac signs are tropical: bound to the equinoxes of the moment, which
    // means the relevant frame is true ecliptic of date (ECT), not J2000 mean
    // ecliptic (ECL). Routing through the ECT helper keeps the sign cusps
    // anchored to the equinox at this date — same convention used by HORIZONS
    // OBSERVER + QUANTITIES=31 output.
    const observer = new astronomy.Observer(0, 0, 0); // Ecliptic position same from anywhere
    const sunEquator = astronomy.Equator('Sun', date, observer, false, true); // EQJ
    const sunEcliptic = this.eclipticFromEquatorVec_EQJ_to_ECT(sunEquator.vec);
    const longitude = sunEcliptic.elon;

    // Zodiac signs, 30 degrees each
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];

    const signIndex = Math.floor(longitude / 30) % 12;
    const degreeInSign = longitude % 30;

    return {
      sign: signs[signIndex],
      signIndex: signIndex,
      degreeInSign: degreeInSign,
      absoluteLongitude: longitude,
      frame: 'ecliptic_of_date'
    };
  }

  getEgyptianCalendar(date) {
    // Modern display: drive the calendar pointer by accurate year progress,
    // but show Gregorian month/day in the label.
    const yearProgress = TimeUtils.yearProgress360(date); // 0..360
    const month = date.getUTCMonth() + 1; // 1-12 (Gregorian, UTC)
    const day = date.getUTCDate();        // 1-31 (Gregorian, UTC)

    return {
      month,
      day,
      dayOfYear: yearProgress // used for ring geometry (outer pointer)
    };
  }

  getMetonicCycle(date) {
    // Metonic cycle: 19 solar years = 235 lunar months
    // Reference: 2000-01-01 as year 0 of cycle
    const referenceDate = new Date('2000-01-01');
    const yearsSince = (date - referenceDate) / (1000 * 60 * 60 * 24 * 365.25);
    
    const cyclePosition = ((yearsSince % 19) + 19) % 19; // always in [0, 19)
    const metonicYear = Math.floor(cyclePosition) + 1;
    const progress = cyclePosition / 19; // 0-1 for dial position
    
    return {
      year: metonicYear,
      progress: progress,
      anglePosition: progress * 360 // Degrees on spiral dial
    };
  }

  getSarosCycle(date) {
    // Saros cycle: 223 synodic months ≈ 18 years, 11 days, 8 hours
    // Used for eclipse predictions
    const sarosLength = 6585.32; // days
    const referenceDate = new Date('2000-01-06'); // Known eclipse date
    
    const daysSince = (date - referenceDate) / (1000 * 60 * 60 * 24);
    const cycleNumber = Math.floor(daysSince / sarosLength);
    const progress = (daysSince % sarosLength) / sarosLength;
    
    return {
      cycle: cycleNumber,
      progress: progress,
      anglePosition: progress * 360,
      daysUntilNext: sarosLength * (1 - progress)
    };
  }

  getNextEclipse(date, observer) {
    try {
      const lunarEclipse = astronomy.SearchLunarEclipse(date);
      const solarEclipse = astronomy.SearchGlobalSolarEclipse(date);

      const lunarPeakDate = lunarEclipse?.peak?.date ?? null;
      const solarPeakDate = solarEclipse?.peak?.date ?? null;

      let next;
      if (lunarPeakDate && solarPeakDate) {
        next = (lunarPeakDate < solarPeakDate)
          ? { type: 'lunar', data: lunarEclipse }
          : { type: 'solar', data: solarEclipse };
      } else if (lunarPeakDate) {
        next = { type: 'lunar', data: lunarEclipse };
      } else if (solarPeakDate) {
        next = { type: 'solar', data: solarEclipse };
      } else {
        return { error: 'Could not calculate next eclipse' };
      }

      const peakDate = next.data.peak && (next.data.peak.date || (next.data.peak.time && next.data.peak.time.date))
        ? (next.data.peak.date || next.data.peak.time.date)
        : null;

      const base = {
        type: next.type,
        kind: next.data.kind || null,
        date: peakDate ? peakDate.toISOString() : null,
        daysUntil: peakDate ? ((peakDate - date) / (1000 * 60 * 60 * 24)) : null
      };

      // Add local observer context when solar eclipse is next
      if (next.type === 'solar' && observer) {
        try {
          const local = astronomy.SearchLocalSolarEclipse(date, observer);
          const toIso = (ev) => {
            if (!ev) return null;
            const t = ev.date || (ev.time && ev.time.date) || ev.time || ev;
            return t instanceof Date ? t.toISOString() : null;
          };
          base.local = {
            kind: local.kind || null,
            obscuration: typeof local.obscuration === 'number' ? local.obscuration : null,
            partialBegin: toIso(local.partialBegin),
            totalBegin: toIso(local.totalBegin),
            peak: toIso(local.peak),
            totalEnd: toIso(local.totalEnd),
            partialEnd: toIso(local.partialEnd)
          };
        } catch (_e) {
          // ignore local failure
        }
      }

      // Add extra lunar details if available
      if (next.type === 'lunar') {
        base.details = {
          sdPenum: next.data.sdPenum || null,
          sdPartial: next.data.sdPartial || null,
          sdTotal: next.data.sdTotal || null,
          obscuration: typeof next.data.obscuration === 'number' ? next.data.obscuration : null
        };
      }

      return base;
    } catch (_err) {
      return { error: 'Could not calculate next eclipse' };
    }
  }

  /**
   * Find the next planetary opposition (frame-stable)
   * Opposition occurs when the planet's geocentric ecliptic longitude is 180° from the Sun's.
   * Uses Astronomy.PairLongitude and a bracket + bisection search for accuracy.
   */
  getNextOpposition(date, maxDays = 1095) {
    const planets = ['Mars', 'Jupiter', 'Saturn'];
    const synodic = { Mars: 780, Jupiter: 399, Saturn: 378 };

    // Normalize angle to [0,360)
    const norm = (a) => ((a % 360) + 360) % 360;
    // Signed smallest difference a-b in [-180,180]
    const diff = (a, b) => {
      let d = norm(a) - norm(b);
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      return d;
    };

    const rel = (planet, t) => astronomy.PairLongitude(planet, 'Sun', t);

    const findOpposition = (planet, start) => {
      const limit = synodic[planet] || 800;
      const end = new Date(start.getTime() + limit * MS_PER_DAY);
      // Coarse daily scan to find sign change around target 180°
      let t0 = new Date(start);
      let f0 = diff(rel(planet, t0), 180);
      for (let t = new Date(t0.getTime() + MS_PER_DAY); t <= end; t = new Date(t.getTime() + MS_PER_DAY)) {
        const f1 = diff(rel(planet, t), 180);
        if (f0 === 0) return t0;
        if (f0 * f1 <= 0) {
          // Bracket found between t0 and t
          let lo = t0, hi = t;
          for (let i = 0; i < 30; i++) {
            const mid = new Date((lo.getTime() + hi.getTime()) / 2);
            const fm = diff(rel(planet, mid), 180);
            if (f0 * fm <= 0) {
              hi = mid;
            } else {
              lo = mid;
              f0 = fm;
            }
            if ((hi.getTime() - lo.getTime()) < 1000) break; // ~1s
          }
          return new Date((lo.getTime() + hi.getTime()) / 2);
        }
        t0 = t; f0 = f1;
      }
      return null;
    };

    const results = [];
    for (const planet of planets) {
      try {
        const when = findOpposition(planet, date);
        if (when) {
          results.push({
            planet,
            date: when.toISOString(),
            daysUntil: (when - date) / 86400000
          });
        }
      } catch (_err) {
        // skip
      }
    }

    if (!results.length) return { error: 'No oppositions found', searchedDays: maxDays };
    results.sort((a, b) => a.daysUntil - b.daysUntil);
    return results[0];
  }

  /**
   * Find the next conjunction between two bodies (geocentric ecliptic longitude equality)
   */
  getNextConjunction(date, bodyA = 'Moon', bodyB = 'Sun', maxDays = 1095) {
    const cap = (s) => String(s || '').toLowerCase().replace(/^(\w)/, (m, c) => c.toUpperCase());
    const A = cap(bodyA);
    const B = cap(bodyB);

    const norm = (a) => ((a % 360) + 360) % 360;
    const diff = (a, b) => {
      let d = norm(a) - norm(b);
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      return d;
    };

    const rel = (t) => astronomy.PairLongitude(A, B, t);

    const end = new Date(date.getTime() + maxDays * 86400000);
    let t0 = new Date(date);
    let f0 = diff(rel(t0), 0);
    for (let t = new Date(t0.getTime() + 86400000); t <= end; t = new Date(t.getTime() + 86400000)) {
      const f1 = diff(rel(t), 0);
      if (f0 === 0) return { bodies: [A, B], date: t0.toISOString(), daysUntil: (t0 - date) / 86400000 };
      if (f0 * f1 <= 0) {
        let lo = t0, hi = t;
        for (let i = 0; i < 30; i++) {
          const mid = new Date((lo.getTime() + hi.getTime()) / 2);
          const fm = diff(rel(mid), 0);
          if (f0 * fm <= 0) hi = mid; else { lo = mid; f0 = fm; }
          if ((hi.getTime() - lo.getTime()) < 1000) break;
        }
        const when = new Date((lo.getTime() + hi.getTime()) / 2);
        return { bodies: [A, B], date: when.toISOString(), daysUntil: (when - date) / 86400000 };
      }
      t0 = t; f0 = f1;
    }
    return { error: `No conjunction found for ${A}-${B} within ${maxDays} days` };
  }

  /**
   * Next equinox after given date (March/Sep) using Astronomy.Seasons.
   */
  getNextEquinox(date) {
    try {
      const y = date.getUTCFullYear();
      const s1 = astronomy.Seasons(y);
      const s2 = astronomy.Seasons(y + 1);
      const events = [
        { type: 'March equinox', t: s1.mar_equinox?.date || s1.mar_equinox },
        { type: 'September equinox', t: s1.sep_equinox?.date || s1.sep_equinox },
        { type: 'March equinox', t: s2.mar_equinox?.date || s2.mar_equinox },
        { type: 'September equinox', t: s2.sep_equinox?.date || s2.sep_equinox },
      ].filter(e => e.t instanceof Date);
      events.sort((a,b) => a.t - b.t);
      const next = events.find(e => e.t > date);
      if (!next) return { error: 'No equinox found' };
      return { type: next.type, date: next.t.toISOString(), daysUntil: (next.t - date) / 86400000 };
    } catch (_e) {
      return { error: 'Could not compute equinox' };
    }
  }

  /**
   * Next solstice after given date (June/Dec) using Astronomy.Seasons.
   */
  getNextSolstice(date) {
    try {
      const y = date.getUTCFullYear();
      const s1 = astronomy.Seasons(y);
      const s2 = astronomy.Seasons(y + 1);
      const events = [
        { type: 'June solstice', t: s1.jun_solstice?.date || s1.jun_solstice },
        { type: 'December solstice', t: s1.dec_solstice?.date || s1.dec_solstice },
        { type: 'June solstice', t: s2.jun_solstice?.date || s2.jun_solstice },
        { type: 'December solstice', t: s2.dec_solstice?.date || s2.dec_solstice },
      ].filter(e => e.t instanceof Date);
      events.sort((a,b) => a.t - b.t);
      const next = events.find(e => e.t > date);
      if (!next) return { error: 'No solstice found' };
      return { type: next.type, date: next.t.toISOString(), daysUntil: (next.t - date) / 86400000 };
    } catch (_e) {
      return { error: 'Could not compute solstice' };
    }
  }

  /**
   * Calculate lunar orbital nodes (instantaneous / osculating).
   *
   * Geometric computation in J2000 mean ecliptic (ECL):
   *   1. Get geocentric Moon state vector (r, v) in EQJ via GeoMoonState.
   *   2. Rotate r and v separately into ECL using ROT_EQJ_TO_ECL.
   *      (MUST: never compute h = r × v in EQJ and rotate the result —
   *       ẑ in EQJ ≠ ẑ in ECL, so n = ẑ × h in mixed frames is garbage.)
   *   3. h = r × v is the angular-momentum vector (orbit-plane normal in ECL).
   *   4. n = ẑ × h with ẑ = (0,0,1) in ECL gives a vector along the line of
   *      nodes; for a prograde orbit (Moon: i ≈ 5.14°) it points toward the
   *      ascending node.
   *   5. Ω = atan2(n.y, n.x), normalized to [0, 360).
   *
   * Replaces a linear approximation (REFERENCE_ASCENDING_NODE + mean rate × Δt)
   * which drifted from the true (osculating) value by up to ~1.5° from
   * mid-month perturbations.
   */
  getLunarNodes(date) {
    const NODAL_PERIOD_DAYS = 6798.375;   // 18.613 years
    const NODAL_PERIOD_YEARS = 18.613;
    const nodeMotionPerDay = -19.3416 / 365.25; // mean retrograde rate, deg/day

    // 1. Moon state in EQJ.
    const state = astronomy.GeoMoonState(date);

    // 2. Rotate position and velocity into ECL — separately, per invariant.
    const r_eqj = new astronomy.Vector(state.x, state.y, state.z, state.t);
    const v_eqj = new astronomy.Vector(state.vx, state.vy, state.vz, state.t);
    const r = astronomy.RotateVector(ROT_EQJ_TO_ECL, r_eqj);
    const v = astronomy.RotateVector(ROT_EQJ_TO_ECL, v_eqj);

    // 3. Specific angular momentum h = r × v (in ECL).
    const hx = r.y * v.z - r.z * v.y;
    const hy = r.z * v.x - r.x * v.z;
    // hz omitted: only needed to confirm orientation; n.x and n.y are
    // determined entirely by hx and hy (see step 4).

    // 4. n = ẑ × h with ẑ = (0,0,1) in ECL → (-hy, hx, 0).
    const nx = -hy;
    const ny =  hx;

    // 5. Ω = longitude of ascending node, normalized to [0, 360).
    let ascendingNode = Math.atan2(ny, nx) * (180 / Math.PI);
    if (ascendingNode < 0) ascendingNode += 360;
    const descendingNode = (ascendingNode + 180) % 360;

    // Cycle dial: drive from time-since-reference so the dial sweeps smoothly.
    const referenceDate = new Date('2000-01-01T12:00:00Z');
    const daysSince = (date - referenceDate) / (1000 * 60 * 60 * 24);
    const cycleProgress = (((daysSince % NODAL_PERIOD_DAYS) + NODAL_PERIOD_DAYS) % NODAL_PERIOD_DAYS) / NODAL_PERIOD_DAYS;

    // Days until next node passage by the Moon. Moon longitude here is ECT
    // (from EclipticGeoMoon), which is at most ~22 arcmin from ECL today;
    // the resulting passage estimate is a few-hour resolution at best, so
    // the frame mismatch on this auxiliary number is below the noise floor.
    const moonLongitude = astronomy.EclipticGeoMoon(date).lon;
    const distToAscending = Math.abs(((moonLongitude - ascendingNode + 180) % 360) - 180);
    const distToDescending = Math.abs(((moonLongitude - descendingNode + 180) % 360) - 180);
    const distToNearestNode = Math.min(distToAscending, distToDescending);
    const daysUntilNodePassage = distToNearestNode / 13.2; // Moon moves ~13.2°/day

    return {
      ascendingNode,
      descendingNode,
      period: {
        days: NODAL_PERIOD_DAYS,
        years: NODAL_PERIOD_YEARS
      },
      progress: cycleProgress,
      anglePosition: cycleProgress * 360,
      motionRate: nodeMotionPerDay,
      nextNodePassage: {
        daysUntil: daysUntilNodePassage,
        type: distToAscending < distToDescending ? 'ascending' : 'descending'
      },
      frame: 'ecliptic_j2000'
    };
  }
}

module.exports = AntikytheraEngine;
module.exports.COORDINATE_FRAMES = COORDINATE_FRAMES;
module.exports.SINGLE_BODY_COORDINATE_FRAMES = SINGLE_BODY_COORDINATE_FRAMES;
