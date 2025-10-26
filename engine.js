const astronomy = require('astronomy-engine');
const TimeUtils = require('./utils/time');

class AntikytheraEngine {
  /**
   * Calculate sun visibility and daylight information for a given location and time
   */
  getSunVisibility(date, observer) {
    // Current sun position
    const sunPos = this.getSunPosition(date, observer);
    
    // Find sunrise and sunset for this day
    // Use a search window that ensures we get today's sunrise/sunset
    const startOfDay = TimeUtils.utcStartOfDay(date);
    const endOfDay = TimeUtils.utcEndOfDay(date);
    
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
    } catch (e) {
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
  getState(date = new Date(), latitude = 37.5, longitude = 23.0) {
    const observer = new astronomy.Observer(latitude, longitude, 0);
    
    return {
      date: date.toISOString(),
      location: { latitude, longitude },
      sun: this.getSunPosition(date, observer),
      moon: this.getMoonPosition(date, observer),
      planets: this.getPlanetaryPositions(date, observer),
      zodiac: this.getZodiacPosition(date),
      egyptianCalendar: this.getEgyptianCalendar(date),
      metonicCycle: this.getMetonicCycle(date),
      sarosCycle: this.getSarosCycle(date),
      nextEclipse: this.getNextEclipse(date),
      equationOfTime: this.getEquationOfTime(date),
      sunVisibility: this.getSunVisibility(date, observer)
    };
  }

  getSunPosition(date, observer) {
    const equator = astronomy.Equator('Sun', date, observer, true, true);
    const horizon = astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');
    const ecliptic = astronomy.Ecliptic(equator.vec);
    
    return {
      longitude: ecliptic.elon, // Ecliptic longitude (degrees)
      latitude: ecliptic.elat,
      rightAscension: equator.ra,
      declination: equator.dec,
      altitude: horizon.altitude,
      azimuth: horizon.azimuth
    };
  }

  getMoonPosition(date, observer) {
    const phase = astronomy.MoonPhase(date);
    const equator = astronomy.Equator('Moon', date, observer, true, true);
    const ecliptic = astronomy.Ecliptic(equator.vec);
    const illumination = astronomy.Illumination('Moon', date);
    
    return {
      longitude: ecliptic.elon,
      latitude: ecliptic.elat,
      phase: phase, // 0-360 degrees
      illumination: illumination.phase_fraction,
      age: phase / 12.368, // Approximate age in days (360°/29.53 days per degree)
      rightAscension: equator.ra,
      declination: equator.dec
    };
  }

  getPlanetaryPositions(date, observer) {
    const planets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
    const positions = {};

    planets.forEach(planet => {
      const equator = astronomy.Equator(planet, date, observer, true, true);
      const ecliptic = astronomy.Ecliptic(equator.vec);
      
      positions[planet.toLowerCase()] = {
        longitude: ecliptic.elon,
        latitude: ecliptic.elat,
        rightAscension: equator.ra,
        declination: equator.dec
      };
    });

    return positions;
  }

  getZodiacPosition(date) {
    const sun = astronomy.EclipticGeoMoon(date);
    const longitude = sun.lon;
    
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
    const egyptianDay = Math.floor(egyptianDayFloat) + 1; // 1-360, 1-indexed
    
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
    } catch (err) {
      return { error: 'Could not calculate next eclipse' };
    }
  }
}

module.exports = AntikytheraEngine;
