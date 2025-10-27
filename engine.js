const astronomy = require('astronomy-engine');
const TimeUtils = require('./utils/time');

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

  eclipticFromEquatorVec_EQJ(equatorJ2000Vec) {
    // Convert J2000 equator topocentric vector to true ecliptic of date
    const ecl = astronomy.Ecliptic(equatorJ2000Vec);
    // astronomy.Ecliptic returns EclipticCoordinates with elon/elat
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
    const daylightMs = sunsetDate - sunriseDate;
    const daylightHours = daylightMs / (1000 * 60 * 60);
    const daylightPercent = daylightHours / 24;
    const arcDegrees = daylightPercent * 360;
    
    return {
      currentPosition: {
        azimuth: sunPos.azimuth,
        altitude: sunPos.altitude,
        isVisible: sunPos.altitude > 0
      },
      sunrise: sunrise ? {
        time: sunrise.date || sunrise,
        azimuth: sunrisePos.azimuth,
        localTime: (sunrise.date || sunrise).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      } : null,
      sunset: sunset ? {
        time: sunset.date || sunset,
        azimuth: sunsetPos.azimuth,
        localTime: (sunset.date || sunset).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      } : null,
      daylight: {
        hours: daylightHours,
        percent: daylightPercent,
        arcDegrees: arcDegrees,
        type: 'normal'
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
    const observer = new astronomy.Observer(latitude, longitude, 0);
    
    return {
      date: date.toISOString(),
      location: { latitude, longitude },
      observer: observerInfo || { latitude, longitude },
      sun: this.getSunPosition(date, observer),
      moon: this.getMoonPosition(date, observer),
      planets: this.getPlanetaryPositions(date, observer),
      zodiac: this.getZodiacPosition(date),
      egyptianCalendar: this.getEgyptianCalendar(date),
      metonicCycle: this.getMetonicCycle(date),
      sarosCycle: this.getSarosCycle(date),
      lunarNodes: this.getLunarNodes(date),
      nextEclipse: this.getNextEclipse(date),
      nextOpposition: this.getNextOpposition(date),
      equationOfTime: this.getEquationOfTime(date),
      sunVisibility: this.getSunVisibility(date, observer)
    };
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
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
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
    // Get Sun's ecliptic longitude (zodiac is based on Sun, not Moon!)
    const observer = new astronomy.Observer(0, 0, 0); // Ecliptic position same from anywhere
    const sunEquator = astronomy.Equator('Sun', date, observer, false, true); // EQJ
    const sunEcliptic = this.eclipticFromEquatorVec_EQJ(sunEquator.vec);
    const longitude = sunEcliptic.elon;
    
    // Zodiac signs, 30 degrees each
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    
    const signIndex = Math.floor(longitude / 30);
    const degreeInSign = longitude % 30;
    
    return {
      sign: signs[signIndex],
      signIndex: signIndex,
      degreeInSign: degreeInSign,
      absoluteLongitude: longitude
    };
  }

  getEgyptianCalendar(date) {
    // Modern accurate solar year position
    // Maps the full solar year (365.25 days) to 360 degrees for smooth display
    
    // Use centralized time utilities for accurate year progress
    const egyptianDayFloat = TimeUtils.yearProgress360(date);
    const _egyptianDay = Math.floor(egyptianDayFloat) + 1; // 1-360, 1-indexed
    
    // Traditional Egyptian month/day (12 months of 30 days)
    const month = Math.floor(egyptianDayFloat / 30) + 1;
    const day = Math.floor(egyptianDayFloat % 30) + 1;
    
    return {
      month: Math.min(month, 13), // Month 13 = last 60 degrees
      day: day,
      dayOfYear: egyptianDayFloat // Return fractional value for smooth animation (0-360)
    };
  }

  getMetonicCycle(date) {
    // Metonic cycle: 19 solar years = 235 lunar months
    // Reference: 2000-01-01 as year 0 of cycle
    const referenceDate = new Date('2000-01-01');
    const yearsSince = (date - referenceDate) / (1000 * 60 * 60 * 24 * 365.25);
    
    const metonicYear = Math.floor(yearsSince % 19) + 1;
    const progress = (yearsSince % 19) / 19; // 0-1 for dial position
    
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

  getNextEclipse(date) {
    try {
      const lunarEclipse = astronomy.SearchLunarEclipse(date);
      const solarEclipse = astronomy.SearchGlobalSolarEclipse(date);
      
      const nextEclipse = lunarEclipse.peak.date < solarEclipse.peak.date ? 
        { type: 'lunar', data: lunarEclipse } : 
        { type: 'solar', data: solarEclipse };
      
      return {
        type: nextEclipse.type,
        date: nextEclipse.data.peak.date.toISOString(),
        daysUntil: (nextEclipse.data.peak.date - date) / (1000 * 60 * 60 * 24)
      };
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
      const end = new Date(start.getTime() + limit * 86400000);
      // Coarse daily scan to find sign change around target 180°
      let t0 = new Date(start);
      let f0 = diff(rel(planet, t0), 180);
      for (let t = new Date(t0.getTime() + 86400000); t <= end; t = new Date(t.getTime() + 86400000)) {
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
   * Calculate lunar orbital nodes position
   * The nodes precess (move backwards) with an 18.613 year period
   */
  getLunarNodes(date) {
    // Lunar nodes: points where Moon's orbit crosses the ecliptic plane
    // The nodes precess (move backwards) completing a full cycle in 18.613 years
    // This is known as the "Draconic" or "Nodal" cycle
    
    const NODAL_PERIOD_DAYS = 6798.375; // 18.613 years in days
    const NODAL_PERIOD_YEARS = 18.613;
    
    // Reference epoch: J2000.0 (January 1, 2000, 12:00 TT)
    // Ascending node was at ~125.04° on this date
    const referenceDate = new Date('2000-01-01T12:00:00Z');
    const REFERENCE_ASCENDING_NODE = 125.04; // degrees
    
    // Calculate days since reference
    const daysSince = (date - referenceDate) / (1000 * 60 * 60 * 24);
    
    // Node motion: -19.3416° per year (retrograde/westward)
    const nodeMotionPerDay = -19.3416 / 365.25;
    
    // Calculate current ascending node position
    let ascendingNode = (REFERENCE_ASCENDING_NODE + (nodeMotionPerDay * daysSince)) % 360;
    if (ascendingNode < 0) ascendingNode += 360;
    
    // Descending node is 180° opposite
    const descendingNode = (ascendingNode + 180) % 360;
    
    // Progress through current nodal cycle
    const cycleProgress = (daysSince % NODAL_PERIOD_DAYS) / NODAL_PERIOD_DAYS;
    
    // Days until next node passage (approximate)
    const moonLongitude = astronomy.EclipticGeoMoon(date).lon;
    
    // Calculate angular distance to nearest node
    const distToAscending = Math.abs(((moonLongitude - ascendingNode + 180) % 360) - 180);
    const distToDescending = Math.abs(((moonLongitude - descendingNode + 180) % 360) - 180);
    const distToNearestNode = Math.min(distToAscending, distToDescending);
    
    // Approximate days until node passage (moon moves ~13.2°/day)
    const daysUntilNodePassage = distToNearestNode / 13.2;
    
    return {
      ascendingNode: ascendingNode, // degrees (where moon crosses ecliptic northward)
      descendingNode: descendingNode, // degrees (where moon crosses ecliptic southward)
      period: {
        days: NODAL_PERIOD_DAYS,
        years: NODAL_PERIOD_YEARS
      },
      progress: cycleProgress, // 0-1 through current 18.6 year cycle
      anglePosition: cycleProgress * 360, // degrees for display dial
      motionRate: nodeMotionPerDay, // degrees per day (negative = retrograde)
      nextNodePassage: {
        daysUntil: daysUntilNodePassage,
        type: distToAscending < distToDescending ? 'ascending' : 'descending'
      }
    };
  }
}

module.exports = AntikytheraEngine;
