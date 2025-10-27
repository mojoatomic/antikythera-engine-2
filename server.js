const express = require('express');
const cors = require('cors');
const { VALIDATION, CONVENTIONS } = require('./constants/validation');
const { API_VERSION, ENGINE_VERSION, GIT_SHA } = require('./utils/metadata');
const { buildSystemMetadata } = require('./utils/precision-builder');
const { getObserverFromRequest } = require('./lib/location-service');
const AntikytheraEngine = require('./engine');

const app = express();
const engine = new AntikytheraEngine();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/config', express.static('config'));

// Get language setting
app.get('/api/language', (req, res) => {
  const language = process.env.LANGUAGE || 'english';
  res.json({ language: language });
});

// UI settings
app.get('/api/settings', (req, res) => {
  const showSunriseSunset = String(process.env.SHOW_SUNRISE_SUNSET || 'no').toLowerCase() === 'yes';
  res.json({ showSunriseSunset });
});

// Get current state
app.get('/api/state', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const observer = await getObserverFromRequest(req);
    const state = engine.getState(date, observer.latitude, observer.longitude, observer);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get state for a specific date
app.get('/api/state/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    const observer = await getObserverFromRequest(req);
    const state = engine.getState(date, observer.latitude, observer.longitude, observer);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get just sun position
app.get('/api/sun', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const observer = await getObserverFromRequest(req);
    const state = engine.getState(date, observer.latitude, observer.longitude, observer);
    res.json(state.sun);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get just moon position
app.get('/api/moon', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const observer = await getObserverFromRequest(req);
    const state = engine.getState(date, observer.latitude, observer.longitude, observer);
    res.json(state.moon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get planetary positions
app.get('/api/planets', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const observer = await getObserverFromRequest(req);
    const state = engine.getState(date, observer.latitude, observer.longitude, observer);
    res.json(state.planets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Hybrid display endpoint - mechanical + digital data for physical device
app.get('/api/display', async (req, res) => {
  try {
    const startTime = Date.now();
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const observer = await getObserverFromRequest(req);
    const latitude = observer.latitude;
    const longitude = observer.longitude;
    const fullPrecision = req.query.precision === 'full';
    
    const state = engine.getState(date, latitude, longitude, observer);
    
    // Build mechanical data - positions and velocities for stepper motors
    const mechanical = {
      steppers: {
        sun: {
          position: state.sun.longitude,
          velocity: state.sun.velocity,
          altitude: state.sun.altitude,
          azimuth: state.sun.azimuth
        },
        moon: {
          position: state.moon.longitude,
          velocity: state.moon.velocity,
          altitude: state.moon.altitude,
          azimuth: state.moon.azimuth
        },
        mercury: {
          position: state.planets.mercury.longitude,
          velocity: state.planets.mercury.velocity,
          altitude: state.planets.mercury.altitude,
          azimuth: state.planets.mercury.azimuth
        },
        venus: {
          position: state.planets.venus.longitude,
          velocity: state.planets.venus.velocity,
          altitude: state.planets.venus.altitude,
          azimuth: state.planets.venus.azimuth
        },
        mars: {
          position: state.planets.mars.longitude,
          velocity: state.planets.mars.velocity,
          altitude: state.planets.mars.altitude,
          azimuth: state.planets.mars.azimuth
        },
        jupiter: {
          position: state.planets.jupiter.longitude,
          velocity: state.planets.jupiter.velocity,
          altitude: state.planets.jupiter.altitude,
          azimuth: state.planets.jupiter.azimuth
        },
        saturn: {
          position: state.planets.saturn.longitude,
          velocity: state.planets.saturn.velocity,
          altitude: state.planets.saturn.altitude,
          azimuth: state.planets.saturn.azimuth
        },
        lunar_nodes_ascending: {
          position: state.lunarNodes.ascendingNode,
          velocity: state.lunarNodes.motionRate
        },
        lunar_nodes_descending: {
          position: state.lunarNodes.descendingNode,
          velocity: state.lunarNodes.motionRate
        }
      },
      servos: {
        mercury_retrograde: {
          angle: state.planets.mercury.isRetrograde ? 180 : 0,
          state: state.planets.mercury.motionState
        },
        venus_retrograde: {
          angle: state.planets.venus.isRetrograde ? 180 : 0,
          state: state.planets.venus.motionState
        },
        mars_retrograde: {
          angle: state.planets.mars.isRetrograde ? 180 : 0,
          state: state.planets.mars.motionState
        },
        jupiter_retrograde: {
          angle: state.planets.jupiter.isRetrograde ? 180 : 0,
          state: state.planets.jupiter.motionState
        },
        saturn_retrograde: {
          angle: state.planets.saturn.isRetrograde ? 180 : 0,
          state: state.planets.saturn.motionState
        }
      }
    };
    
    // Build digital display data
    const digital = {
      displays: {
        oled_main: {
          line1: `Next Eclipse: ${state.nextEclipse.type}`,
          line2: `${Math.round(state.nextEclipse.daysUntil)} days`,
          line3: new Date(state.nextEclipse.date).toISOString().split('T')[0]
        },
        oled_secondary: state.nextOpposition && !state.nextOpposition.error ? {
          line1: `Next Opposition: ${state.nextOpposition.planet}`,
          line2: `${Math.round(state.nextOpposition.daysUntil)} days`,
          line3: new Date(state.nextOpposition.date).toISOString().split('T')[0]
        } : {
          line1: 'Opposition',
          line2: 'Searching...',
          line3: ''
        },
        lcd_cycles: {
          line1: `Metonic: Year ${state.metonicCycle.year}/19`,
          line2: `Saros: ${(state.sarosCycle.progress * 100).toFixed(1)}% complete`
        }
      },
      leds: {
        visibility: {
          mercury: {
            color: (state.planets.mercury.altitude > 0 && state.sun.altitude < -6) ? 'green' : 'red',
            brightness: (state.planets.mercury.altitude > 0 && state.sun.altitude < -6) ? 255 : 0
          },
          venus: {
            color: (state.planets.venus.altitude > 0 && state.sun.altitude < -6) ? 'green' : 'red',
            brightness: (state.planets.venus.altitude > 0 && state.sun.altitude < -6) ? 255 : 0
          },
          mars: {
            color: (state.planets.mars.altitude > 0 && state.sun.altitude < -6) ? 'green' : 'red',
            brightness: (state.planets.mars.altitude > 0 && state.sun.altitude < -6) ? Math.round(Math.max(100, Math.min(255, 155 + state.planets.mars.altitude * 2))) : 0
          },
          jupiter: {
            color: (state.planets.jupiter.altitude > 0 && state.sun.altitude < -6) ? 'green' : 'red',
            brightness: (state.planets.jupiter.altitude > 0 && state.sun.altitude < -6) ? 255 : 0
          },
          saturn: {
            color: (state.planets.saturn.altitude > 0 && state.sun.altitude < -6) ? 'green' : 'red',
            brightness: (state.planets.saturn.altitude > 0 && state.sun.altitude < -6) ? 200 : 0
          }
        }
      }
    };
    
    // System metadata
    const sunAltitude = state.sun.altitude;
    let twilightStage = 'day';
    if (sunAltitude < -18) twilightStage = 'night';
    else if (sunAltitude < -12) twilightStage = 'astronomical';
    else if (sunAltitude < -6) twilightStage = 'nautical';
    else if (sunAltitude < 0) twilightStage = 'civil';
    
    // Count planets above horizon
    const planetsAboveHorizon = Object.values(state.planets).filter(p => p.altitude > 0).length;
    
    // Calculate next visibility window (when sun < -6°)
    let nextVisibilityWindow = null;
    if (sunAltitude >= -6) {
      // Currently not dark enough - find next evening or current evening
      const sunset = state.sunVisibility.sunset;
      if (sunset && sunset.time) {
        // Approximate: civil twilight ends ~30 min after sunset
        const twilightEnd = new Date(sunset.time);
        twilightEnd.setMinutes(twilightEnd.getMinutes() + 30);
        nextVisibilityWindow = twilightEnd.toISOString();
      }
    }
    
    const eclipticCoords = {
      sun: { lon: state.sun.longitude, lat: state.sun.latitude },
      moon: { lon: state.moon.longitude, lat: state.moon.latitude },
      mercury: { lon: state.planets.mercury.longitude, lat: state.planets.mercury.latitude },
      venus: { lon: state.planets.venus.longitude, lat: state.planets.venus.latitude },
      mars: { lon: state.planets.mars.longitude, lat: state.planets.mars.latitude },
      jupiter: { lon: state.planets.jupiter.longitude, lat: state.planets.jupiter.latitude },
      saturn: { lon: state.planets.saturn.longitude, lat: state.planets.saturn.latitude }
    };

    const debugData = {
      sun_altitude: sunAltitude,
      twilight_stage: twilightStage,
      visibility_threshold: -6,
      planets_above_horizon: planetsAboveHorizon,
      sunrise: state.sunVisibility.sunrise ? state.sunVisibility.sunrise.time : null,
      sunset: state.sunVisibility.sunset ? state.sunVisibility.sunset.time : null,
      next_visibility_window: nextVisibilityWindow,
    };

    const system = {
      ...buildSystemMetadata({
        cached: false,
        computationTime: Date.now() - startTime,
        fullPrecision,
        eclipticCoords,
        debugData,
      }),
      observer: {
        latitude: observer.latitude,
        longitude: observer.longitude,
        elevation: observer.elevation,
        city: observer.city || null,
        country: observer.country || null,
        source: observer.source,
        time_scale: 'UTC'
      }
    };
    
    // Build response
    const response = {
      timestamp: state.date,
      mechanical,
      digital,
      next_opposition: state.nextOpposition && !state.nextOpposition.error ? {
        planet: state.nextOpposition.planet,
        date: state.nextOpposition.date,
        daysUntil: state.nextOpposition.daysUntil
      } : null,
      update_hints: {
        mechanical: 10000, // 10 seconds
        digital: 1000      // 1 second
      },
      system
    };
    
    // Optional: Include raw astronomical data for debugging/CLI/HORIZONS validation
    if (req.query.include === 'astronomical') {
      response.astronomical = {
        observer: {
          type: 'topocentric',
          latitude: latitude,
          longitude: longitude,
          elevation: 0,
          frame: 'ecliptic_j2000'
        },
        sun: {
          ecliptic_longitude: state.sun.longitude,
          ecliptic_latitude: state.sun.latitude,
          altitude: state.sun.altitude,
          azimuth: state.sun.azimuth,
          velocity: state.sun.velocity,
          horizons_comparable: true
        },
        moon: {
          ecliptic_longitude: state.moon.longitude,
          ecliptic_latitude: state.moon.latitude,
          altitude: state.moon.altitude,
          azimuth: state.moon.azimuth,
          velocity: state.moon.velocity,
          phase: state.moon.phase,
          illumination: state.moon.illumination,
          horizons_comparable: true
        },
        planets: {
          mercury: {
            ecliptic_longitude: state.planets.mercury.longitude,
            ecliptic_latitude: state.planets.mercury.latitude,
            altitude: state.planets.mercury.altitude,
            azimuth: state.planets.mercury.azimuth,
            velocity: state.planets.mercury.velocity,
            isRetrograde: state.planets.mercury.isRetrograde,
            horizons_comparable: true
          },
          venus: {
            ecliptic_longitude: state.planets.venus.longitude,
            ecliptic_latitude: state.planets.venus.latitude,
            altitude: state.planets.venus.altitude,
            azimuth: state.planets.venus.azimuth,
            velocity: state.planets.venus.velocity,
            isRetrograde: state.planets.venus.isRetrograde,
            horizons_comparable: true
          },
          mars: {
            ecliptic_longitude: state.planets.mars.longitude,
            ecliptic_latitude: state.planets.mars.latitude,
            altitude: state.planets.mars.altitude,
            azimuth: state.planets.mars.azimuth,
            velocity: state.planets.mars.velocity,
            isRetrograde: state.planets.mars.isRetrograde,
            horizons_comparable: true
          },
          jupiter: {
            ecliptic_longitude: state.planets.jupiter.longitude,
            ecliptic_latitude: state.planets.jupiter.latitude,
            altitude: state.planets.jupiter.altitude,
            azimuth: state.planets.jupiter.azimuth,
            velocity: state.planets.jupiter.velocity,
            isRetrograde: state.planets.jupiter.isRetrograde,
            horizons_comparable: true
          },
          saturn: {
            ecliptic_longitude: state.planets.saturn.longitude,
            ecliptic_latitude: state.planets.saturn.latitude,
            altitude: state.planets.saturn.altitude,
            azimuth: state.planets.saturn.azimuth,
            velocity: state.planets.saturn.velocity,
            isRetrograde: state.planets.saturn.isRetrograde,
            horizons_comparable: true
          }
        }
      };
    }
    
    res.json(response);
  } catch (err) {
    res.status(500).json({ 
      error: err.message,
      system: {
        healthy: false,
        cached: false
      }
    });
  }
});

// System metadata endpoint only
app.get('/api/system', async (req, res) => {
  try {
    const startTime = Date.now();
    const observer = await getObserverFromRequest(req);
    const system = {
      ...buildSystemMetadata({
        cached: false,
        computationTime: Date.now() - startTime,
        fullPrecision: false,
        eclipticCoords: {},
        debugData: {},
      }),
      observer: {
        latitude: observer.latitude,
        longitude: observer.longitude,
        elevation: observer.elevation,
        city: observer.city || null,
        country: observer.country || null,
        source: observer.source,
        time_scale: 'UTC'
      }
    };

    res.json({
      timestamp: new Date().toISOString(),
      system,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Antikythera Engine API running on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/api/state`);
  console.log(`Hybrid display: http://localhost:${PORT}/api/display`);
  console.log(`System metadata: http://localhost:${PORT}/api/system`);
});
