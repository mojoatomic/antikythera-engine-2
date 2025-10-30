const fs = require('fs');
const path = require('path');
const { ConfigLoader } = require('./config-loader');

// Mock file system for isolated testing
jest.mock('fs');
jest.mock('chokidar');

describe('ConfigLoader', () => {
  let mockFS;
  let originalCwd;
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock filesystem
    mockFS = {
      [path.join(originalCwd, 'config', 'settings.default.json')]: JSON.stringify({
        configVersion: 1,
        server: { port: 3000, host: 'localhost' },
        observer: { mode: 'auto', location: { latitude: null, longitude: null, timezone: null, elevation: 0 } },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true }
      })
    };

    // Mock fs.existsSync
    fs.existsSync.mockImplementation((filePath) => {
      return mockFS[filePath] !== undefined;
    });

    // Mock fs.readFileSync
    fs.readFileSync.mockImplementation((filePath, encoding) => {
      if (mockFS[filePath] === undefined) {
        const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
        error.code = 'ENOENT';
        throw error;
      }
      return mockFS[filePath];
    });

    // Mock fs.mkdirSync (no-op for tests)
    fs.mkdirSync.mockImplementation(() => {});

    // Mock chokidar.watch
    const chokidar = require('chokidar');
    chokidar.watch.mockReturnValue({
      on: jest.fn().mockReturnThis(),
      close: jest.fn()
    });
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Default configuration loading', () => {
    test('loads default config successfully', () => {
      const loader = new ConfigLoader();
      const config = loader.getConfig();
      
      expect(config).toBeDefined();
      expect(config.configVersion).toBe(1);
      expect(config.server.port).toBe(3000);
      expect(config.observer.mode).toBe('auto');
    });

    test('caches config after first load', () => {
      const loader = new ConfigLoader();
      
      // First call
      const config1 = loader.getConfig();
      // Second call - should use cached config
      const config2 = loader.getConfig();
      
      expect(config1).toBe(config2); // Same object reference
      expect(fs.readFileSync).toHaveBeenCalledTimes(1); // Only read once
    });
  });

  describe('Configuration layering', () => {
    test('merges local config over default', () => {
      // Add local config to mock filesystem
      const localPath = path.join(originalCwd, 'config', 'settings.local.json');
      mockFS[localPath] = JSON.stringify({
        server: { port: 4000 }, // Override port
        observer: { mode: 'manual', location: { latitude: 37.9838, longitude: 23.7275, timezone: 'Europe/Athens', elevation: 0 } }
      });

      const loader = new ConfigLoader();
      const config = loader.getConfig();
      
      // Local overrides should win
      expect(config.server.port).toBe(4000);
      expect(config.server.host).toBe('localhost'); // From default
      expect(config.observer.mode).toBe('manual');
      expect(config.observer.location.latitude).toBe(37.9838);
    });

    test('merges custom config over local and default', () => {
      // Add local config
      const localPath = path.join(originalCwd, 'config', 'settings.local.json');
      mockFS[localPath] = JSON.stringify({
        server: { port: 4000 }
      });

      // Add custom config
      const customPath = '/tmp/custom-config.json';
      mockFS[customPath] = JSON.stringify({
        server: { port: 5000 }, // Overrides local
        display: { language: 'greek' } // Overrides default
      });

      process.env.ANTIKYTHERA_CONFIG = customPath;

      const loader = new ConfigLoader();
      const config = loader.getConfig();
      
      // Custom config has highest priority
      expect(config.server.port).toBe(5000);
      expect(config.display.language).toBe('greek');
      expect(config.server.host).toBe('localhost'); // From default
    });

    test('deep merges nested objects', () => {
      const localPath = path.join(originalCwd, 'config', 'settings.local.json');
      mockFS[localPath] = JSON.stringify({
        observer: {
          location: {
            latitude: 37.9838,
            longitude: 23.7275
            // timezone not specified - should use default (null)
          }
        }
      });

      const loader = new ConfigLoader();
      const config = loader.getConfig();
      
      // Should merge deeply, not replace entire observer object
      expect(config.observer.mode).toBe('auto'); // From default
      expect(config.observer.location.latitude).toBe(37.9838); // From local
      expect(config.observer.location.timezone).toBeNull(); // From default
    });
  });

  describe('Validation integration', () => {
    test('validates merged config and throws on error', () => {
      const localPath = path.join(originalCwd, 'config', 'settings.local.json');
      mockFS[localPath] = JSON.stringify({
        configVersion: 2 // Invalid version
      });

      expect(() => new ConfigLoader()).toThrow(/Configuration Error/);
    });

    test('applies loose mode validation when env var set', () => {
      process.env.ANTIKYTHERA_CONFIG_LOOSE = '1';
      
      const localPath = path.join(originalCwd, 'config', 'settings.local.json');
      mockFS[localPath] = JSON.stringify({
        observer: {
          mode: 'manual',
          location: { latitude: null, longitude: null, timezone: null, elevation: 0 }
        }
      });

      // Should not throw in loose mode
      const loader = new ConfigLoader();
      const config = loader.getConfig();
      
      expect(config).toBeDefined();
    });
  });

  describe('Hot reload behavior', () => {
    test('sets up watcher for local config if it exists', () => {
      const chokidar = require('chokidar');
      const localPath = path.join(originalCwd, 'config', 'settings.local.json');
      mockFS[localPath] = JSON.stringify({ server: { port: 4000 } });

      new ConfigLoader();

      expect(chokidar.watch).toHaveBeenCalledWith(
        localPath,
        expect.objectContaining({ persistent: true, ignoreInitial: true })
      );
    });

    test('watches local config even if it does not exist initially', () => {
      const chokidar = require('chokidar');
      const localPath = path.join(originalCwd, 'config', 'settings.local.json');
      
      // Local config doesn't exist initially
      delete mockFS[localPath];
      
      new ConfigLoader();
      
      // Should still set up watcher to catch file creation
      expect(chokidar.watch).toHaveBeenCalledWith(
        localPath,
        expect.objectContaining({ persistent: true, ignoreInitial: true })
      );
    });

    test('sets up watcher for custom config path if specified', () => {
      const chokidar = require('chokidar');
      const customPath = '/tmp/custom-config.json';
      mockFS[customPath] = JSON.stringify({ server: { port: 5000 } });
      process.env.ANTIKYTHERA_CONFIG = customPath;

      new ConfigLoader();

      expect(chokidar.watch).toHaveBeenCalledWith(
        customPath,
        expect.objectContaining({ persistent: true, ignoreInitial: true })
      );
    });

    test('emits reload event when config changes', (done) => {
      const chokidar = require('chokidar');
      let changeCallback;
      
      chokidar.watch.mockReturnValue({
        on: jest.fn((event, callback) => {
          if (event === 'change') {
            changeCallback = callback;
          }
          return { on: jest.fn(), close: jest.fn() };
        }),
        close: jest.fn()
      });

      const localPath = path.join(originalCwd, 'config', 'settings.local.json');
      mockFS[localPath] = JSON.stringify({ server: { port: 4000 } });

      const loader = new ConfigLoader();
      
      loader.on('reload', (newConfig) => {
        expect(newConfig).toBeDefined();
        expect(newConfig.server.port).toBe(5000);
        done();
      });

      // Simulate file change
      mockFS[localPath] = JSON.stringify({ server: { port: 5000 } });
      if (changeCallback) {
        changeCallback();
      }
    });
  });

  describe('Error handling', () => {
    test('throws error if default config file is missing', () => {
      // Remove default config from mock filesystem
      const defaultPath = path.join(originalCwd, 'config', 'settings.default.json');
      delete mockFS[defaultPath];

      expect(() => new ConfigLoader()).toThrow(/Config file not found/);
    });

    test('throws error if default config has invalid JSON', () => {
      const defaultPath = path.join(originalCwd, 'config', 'settings.default.json');
      mockFS[defaultPath] = 'invalid json{';

      expect(() => new ConfigLoader()).toThrow();
    });

    test('ignores missing local config file (optional)', () => {
      // Local config doesn't exist - should not throw
      const loader = new ConfigLoader();
      const config = loader.getConfig();
      
      expect(config).toBeDefined();
      expect(config.server.port).toBe(3000); // Uses default
    });

    test('throws error if custom config specified but not found', () => {
      process.env.ANTIKYTHERA_CONFIG = '/nonexistent/path.json';

      expect(() => new ConfigLoader()).toThrow(/Config file not found/);
    });

    test('uses cached config if reload fails in loose mode', () => {
      process.env.ANTIKYTHERA_CONFIG_LOOSE = '1';
      
      const loader = new ConfigLoader();
      const initialConfig = loader.getConfig();
      expect(initialConfig.server.port).toBe(3000);

      // Corrupt the default config
      const defaultPath = path.join(originalCwd, 'config', 'settings.default.json');
      mockFS[defaultPath] = 'invalid json';

      // Attempt reload - should use cached config
      loader.reload();
      const configAfterReload = loader.getConfig();
      
      expect(configAfterReload.server.port).toBe(3000); // Still has cached config
    });
  });

  describe('Resource cleanup', () => {
    test('closes watchers when close() is called', () => {
      const chokidar = require('chokidar');
      const mockWatcher = {
        on: jest.fn().mockReturnThis(),
        close: jest.fn()
      };
      chokidar.watch.mockReturnValue(mockWatcher);

      const localPath = path.join(originalCwd, 'config', 'settings.local.json');
      mockFS[localPath] = JSON.stringify({ server: { port: 4000 } });

      const loader = new ConfigLoader();
      loader.close();

      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });

  describe('Environment variable precedence', () => {
    test('ANTIKYTHERA_CONFIG_LOOSE enables loose mode', () => {
      process.env.ANTIKYTHERA_CONFIG_LOOSE = '1';
      
      const localPath = path.join(originalCwd, 'config', 'settings.local.json');
      mockFS[localPath] = JSON.stringify({
        observer: { mode: 'manual', location: { latitude: null, longitude: null, timezone: null, elevation: 0 } }
      });

      // Should not throw
      const loader = new ConfigLoader();
      expect(loader.looseMode).toBe(true);
    });

    test('ANTIKYTHERA_CONFIG specifies custom config path', () => {
      const customPath = '/custom/path/config.json';
      mockFS[customPath] = JSON.stringify({
        server: { port: 9000 }
      });
      process.env.ANTIKYTHERA_CONFIG = customPath;

      const loader = new ConfigLoader();
      const config = loader.getConfig();

      expect(config.server.port).toBe(9000);
    });
  });
});
