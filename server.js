const express = require('express');
const cors = require('cors');
const AntikytheraEngine = require('./engine');

const app = express();
const engine = new AntikytheraEngine();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Get current state
app.get('/api/state', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const state = engine.getState(date);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get state for a specific date
app.get('/api/state/:date', (req, res) => {
  try {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    const state = engine.getState(date);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get just sun position
app.get('/api/sun', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const state = engine.getState(date);
    res.json(state.sun);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get just moon position
app.get('/api/moon', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const state = engine.getState(date);
    res.json(state.moon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get planetary positions
app.get('/api/planets', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const state = engine.getState(date);
    res.json(state.planets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hybrid display endpoint - mechanical + digital data for physical device
app.get('/api/display', (req, res) => {
  try {
    const startTime = Date.now();
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const latitude = parseFloat(req.query.lat) || 37.5;
    const longitude = parseFloat(req.query.lon) || 23.0;
    
    const state = engine.getState(date, latitude, longitude);
    
    // Build mechanical data - positions and velocities for stepper motors
    const mechanical = {
      steppers: {
        sun: {
          position: state.sun.longitude,
          velocity: state.sun.velocity
        },
        moon: {
          position: state.moon.longitude,
          velocity: state.moon.velocity
        },
        mercury: {
          position: state.planets.mercury.longitude,
          velocity: state.planets.mercury.velocity
        },
        venus: {
          position: state.planets.venus.longitude,
          velocity: state.planets.venus.velocity
        },
        mars: {
          position: state.planets.mars.longitude,
          velocity: state.planets.mars.velocity
        },
        jupiter: {
          position: state.planets.jupiter.longitude,
          velocity: state.planets.jupiter.velocity
        },
        saturn: {
          position: state.planets.saturn.longitude,
          velocity: state.planets.saturn.velocity
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
    
    const system = {
      healthy: true,
      cached: false,
      computation_time_ms: Date.now() - startTime,
      debug: {
        sun_altitude: sunAltitude,
        twilight_stage: twilightStage,
        visibility_threshold: -6,
        planets_above_horizon: planetsAboveHorizon,
        sunrise: state.sunVisibility.sunrise ? state.sunVisibility.sunrise.time : null,
        sunset: state.sunVisibility.sunset ? state.sunVisibility.sunset.time : null,
        next_visibility_window: nextVisibilityWindow
      }
    };
    
    // Build response
    const response = {
      timestamp: state.date,
      mechanical,
      digital,
      update_hints: {
        mechanical: 10000, // 10 seconds
        digital: 1000      // 1 second
      },
      system
    };
    
    // Optional: Include raw astronomical data for debugging/CLI
    if (req.query.include === 'astronomical') {
      response.astronomical = {
        sun: {
          longitude: state.sun.longitude,
          altitude: state.sun.altitude,
          azimuth: state.sun.azimuth,
          velocity: state.sun.velocity
        },
        moon: {
          longitude: state.moon.longitude,
          altitude: state.moon.altitude,
          azimuth: state.moon.azimuth,
          velocity: state.moon.velocity,
          phase: state.moon.phase,
          illumination: state.moon.illumination
        },
        planets: {
          mercury: {
            longitude: state.planets.mercury.longitude,
            altitude: state.planets.mercury.altitude,
            azimuth: state.planets.mercury.azimuth,
            velocity: state.planets.mercury.velocity,
            isRetrograde: state.planets.mercury.isRetrograde
          },
          venus: {
            longitude: state.planets.venus.longitude,
            altitude: state.planets.venus.altitude,
            azimuth: state.planets.venus.azimuth,
            velocity: state.planets.venus.velocity,
            isRetrograde: state.planets.venus.isRetrograde
          },
          mars: {
            longitude: state.planets.mars.longitude,
            altitude: state.planets.mars.altitude,
            azimuth: state.planets.mars.azimuth,
            velocity: state.planets.mars.velocity,
            isRetrograde: state.planets.mars.isRetrograde
          },
          jupiter: {
            longitude: state.planets.jupiter.longitude,
            altitude: state.planets.jupiter.altitude,
            azimuth: state.planets.jupiter.azimuth,
            velocity: state.planets.jupiter.velocity,
            isRetrograde: state.planets.jupiter.isRetrograde
          },
          saturn: {
            longitude: state.planets.saturn.longitude,
            altitude: state.planets.saturn.altitude,
            azimuth: state.planets.saturn.azimuth,
            velocity: state.planets.saturn.velocity,
            isRetrograde: state.planets.saturn.isRetrograde
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

app.listen(PORT, () => {
  console.log(`Antikythera Engine API running on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/api/state`);
  console.log(`Hybrid display: http://localhost:${PORT}/api/display`);
});
