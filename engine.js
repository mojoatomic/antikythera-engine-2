const astronomy = require('astronomy-engine');

class AntikytheraEngine {
  /**
   * Get the complete state of the Antikythera mechanism for a given date
   */
  getState(date = new Date()) {
    const observer = new astronomy.Observer(37.5, 23.0, 0); // Athens coordinates
    
    return {
      date: date.toISOString(),
      sun: this.getSunPosition(date, observer),
      moon: this.getMoonPosition(date, observer),
      planets: this.getPlanetaryPositions(date, observer),
      zodiac: this.getZodiacPosition(date),
      egyptianCalendar: this.getEgyptianCalendar(date),
      metonicCycle: this.getMetonicCycle(date),
      sarosCycle: this.getSarosCycle(date),
      nextEclipse: this.getNextEclipse(date)
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
    // Egyptian calendar: 12 months of 30 days + 5 epagomenal days
    // Starting from a reference point (roughly aligned with Gregorian calendar)
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((date - startOfYear) / (1000 * 60 * 60 * 24));
    
    const month = Math.floor(dayOfYear / 30) + 1;
    const day = (dayOfYear % 30) + 1;
    
    return {
      month: Math.min(month, 13), // Month 13 = epagomenal days
      day: day,
      dayOfYear: dayOfYear
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
