const { validateConfig } = require('./schema');

describe('Config Schema Validation', () => {
  describe('Valid configurations', () => {
    test('accepts complete valid config', () => {
      const config = {
        configVersion: 1,
        server: { port: 3000, host: 'localhost' },
        observer: {
          mode: 'auto',
          location: {
            latitude: null,
            longitude: null,
            timezone: null,
            elevation: 0
          }
        },
        api: {
          rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
          cache: { enabled: true, ttlSeconds: 300 }
        },
        display: { language: 'english', showSunriseSunset: true }
      };
      
      expect(() => validateConfig(config, 'test.json')).not.toThrow();
    });

    test('accepts valid manual observer mode with required fields', () => {
      const config = {
        configVersion: 1,
        server: { port: 3000, host: 'localhost' },
        observer: {
          mode: 'manual',
          location: {
            latitude: 37.9838,
            longitude: 23.7275,
            timezone: 'Europe/Athens',
            elevation: 0,
            name: 'Athens, Greece'
          }
        },
        api: {
          rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
          cache: { enabled: true, ttlSeconds: 300 }
        },
        display: { language: 'english', showSunriseSunset: true }
      };
      
      const result = validateConfig(config, 'test.json');
      expect(result.observer.mode).toBe('manual');
      expect(result.observer.location.latitude).toBe(37.9838);
      expect(result.observer.location.timezone).toBe('Europe/Athens');
    });
  });

  describe('configVersion validation', () => {
    test('rejects missing configVersion', () => {
      const config = {
        server: { port: 3000, host: 'localhost' },
        observer: { mode: 'auto', location: { latitude: null, longitude: null, timezone: null, elevation: 0 } },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true }
      };
      
      expect(() => validateConfig(config, 'test.json')).toThrow(/Configuration Error/);
    });

    test('rejects wrong configVersion number', () => {
      const config = {
        configVersion: 2,
        server: { port: 3000, host: 'localhost' },
        observer: { mode: 'auto', location: { latitude: null, longitude: null, timezone: null, elevation: 0 } },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true }
      };
      
      expect(() => validateConfig(config, 'test.json')).toThrow(/Configuration Error/);
    });

    test('rejects string configVersion', () => {
      const config = {
        configVersion: '1',
        server: { port: 3000, host: 'localhost' },
        observer: { mode: 'auto', location: { latitude: null, longitude: null, timezone: null, elevation: 0 } },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true }
      };
      
      expect(() => validateConfig(config, 'test.json')).toThrow();
    });
  });

  describe('Manual observer mode validation', () => {
    test('rejects manual mode without latitude', () => {
      const config = {
        configVersion: 1,
        server: { port: 3000, host: 'localhost' },
        observer: {
          mode: 'manual',
          location: {
            latitude: null,
            longitude: 23.7275,
            timezone: 'Europe/Athens',
            elevation: 0
          }
        },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true }
      };
      
      expect(() => validateConfig(config, 'test.json')).toThrow(/observer\.location\.latitude/);
    });

    test('rejects manual mode without longitude', () => {
      const config = {
        configVersion: 1,
        server: { port: 3000, host: 'localhost' },
        observer: {
          mode: 'manual',
          location: {
            latitude: 37.9838,
            longitude: null,
            timezone: 'Europe/Athens',
            elevation: 0
          }
        },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true }
      };
      
      expect(() => validateConfig(config, 'test.json')).toThrow(/observer\.location\.longitude/);
    });

    test('rejects manual mode without timezone', () => {
      const config = {
        configVersion: 1,
        server: { port: 3000, host: 'localhost' },
        observer: {
          mode: 'manual',
          location: {
            latitude: 37.9838,
            longitude: 23.7275,
            timezone: null,
            elevation: 0
          }
        },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true }
      };
      
      expect(() => validateConfig(config, 'test.json')).toThrow(/observer\.location\.timezone/);
    });

    test('error message cites file path', () => {
      const config = {
        configVersion: 1,
        server: { port: 3000, host: 'localhost' },
        observer: {
          mode: 'manual',
          location: {
            latitude: null,
            longitude: null,
            timezone: null,
            elevation: 0
          }
        },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true }
      };
      
      try {
        validateConfig(config, 'config/settings.local.json');
        fail('Should have thrown');
      } catch (err) {
        expect(err.message).toContain('config/settings.local.json');
      }
    });
  });

  describe('Loose mode validation', () => {
    test('allows manual mode with missing fields in loose mode', () => {
      const config = {
        configVersion: 1,
        server: { port: 3000, host: 'localhost' },
        observer: {
          mode: 'manual',
          location: {
            latitude: null,
            longitude: null,
            timezone: null,
            elevation: 0
          }
        },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true }
      };
      
      // Should not throw in loose mode
      const result = validateConfig(config, 'test.json', true);
      expect(result).toBeDefined();
    });

    test('allows invalid schema in loose mode with warnings', () => {
      const config = {
        configVersion: 1,
        server: { port: '3000', host: 'localhost' }, // port should be number
        observer: { mode: 'auto', location: { latitude: null, longitude: null, timezone: null, elevation: 0 } },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true }
      };
      
      // Should use defaults in loose mode
      const result = validateConfig(config, 'test.json', true);
      expect(result.server.port).toBe(3000); // Uses default
    });
  });

  describe('Unknown keys handling', () => {
    test('warns about unknown top-level keys but does not fail', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const config = {
        configVersion: 1,
        server: { port: 3000, host: 'localhost' },
        observer: { mode: 'auto', location: { latitude: null, longitude: null, timezone: null, elevation: 0 } },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true },
        futureFeature: 'ignored value'
      };
      
      const result = validateConfig(config, 'test.json');
      expect(result).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown config keys')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('futureFeature')
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Coordinate validation', () => {
    test('rejects latitude out of range', () => {
      const config = {
        configVersion: 1,
        server: { port: 3000, host: 'localhost' },
        observer: {
          mode: 'manual',
          location: {
            latitude: 91, // Invalid
            longitude: 0,
            timezone: 'UTC',
            elevation: 0
          }
        },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true }
      };
      
      expect(() => validateConfig(config, 'test.json')).toThrow();
    });

    test('rejects longitude out of range', () => {
      const config = {
        configVersion: 1,
        server: { port: 3000, host: 'localhost' },
        observer: {
          mode: 'manual',
          location: {
            latitude: 0,
            longitude: 181, // Invalid
            timezone: 'UTC',
            elevation: 0
          }
        },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true }
      };
      
      expect(() => validateConfig(config, 'test.json')).toThrow();
    });
  });
});
