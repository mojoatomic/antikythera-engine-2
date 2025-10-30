const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const chokidar = require('chokidar');
const { validateConfig } = require('../config/schema');

class ConfigLoader extends EventEmitter {
  constructor() {
    super();
    this.config = null;
    this.watchers = [];
    this.looseMode = process.env.ANTIKYTHERA_CONFIG_LOOSE === '1';
    
    // Load initial config
    this.reload();
    
    // Setup file watching for hot reload
    this.setupWatchers();
  }
  
  getConfig() {
    if (!this.config) {
      this.reload();
    }
    return this.config;
  }
  
  reload() {
    try {
      const merged = this.loadLayered();
      this.config = merged;
      this.emit('reload', this.config);
    } catch (error) {
      console.error('Failed to load configuration:', error.message);
      if (!this.looseMode) {
        throw error;
      }
      // In loose mode, use defaults if reload fails
      if (!this.config) {
        console.warn('Using default configuration due to load failure');
        this.config = this.loadDefault();
      }
    }
  }
  
  loadLayered() {
    // Layer 3 (base): Default config (always exists)
    const defaultConfig = this.loadDefault();
    
    // Layer 2: Local config (optional)
    const localPath = path.join(process.cwd(), 'config', 'settings.local.json');
    const localConfig = this.loadFile(localPath, true);
    
    // Layer 1 (highest): Custom config path (optional)
    const customPath = process.env.ANTIKYTHERA_CONFIG;
    const customConfig = customPath ? this.loadFile(customPath, false) : null;
    
    // Merge layers: custom > local > default
    let merged = { ...defaultConfig };
    if (localConfig) {
      merged = this.deepMerge(merged, localConfig);
    }
    if (customConfig) {
      merged = this.deepMerge(merged, customConfig);
    }
    
    // Validate merged config
    const filePath = customPath || (localConfig ? localPath : 'config/settings.default.json');
    const validated = validateConfig(merged, filePath, this.looseMode);
    
    return validated;
  }
  
  loadDefault() {
    const defaultPath = path.join(__dirname, '..', 'config', 'settings.default.json');
    return this.loadFile(defaultPath, false);
  }
  
  loadFile(filePath, optional = false) {
    try {
      if (!fs.existsSync(filePath)) {
        if (optional) {
          return null;
        }
        throw new Error(`Config file not found: ${filePath}`);
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (optional && error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to load config from ${filePath}: ${error.message}`);
    }
  }
  
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] instanceof Object && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  setupWatchers() {
    // Watch local config file (hot reload)
    const localPath = path.join(process.cwd(), 'config', 'settings.local.json');
    if (fs.existsSync(localPath)) {
      const localWatcher = chokidar.watch(localPath, {
        persistent: true,
        ignoreInitial: true
      });
      
      localWatcher.on('change', () => {
        console.log('Local config changed, reloading...');
        this.reload();
      });
      
      this.watchers.push(localWatcher);
    }
    
    // Watch custom config path if specified (hot reload)
    const customPath = process.env.ANTIKYTHERA_CONFIG;
    if (customPath && fs.existsSync(customPath)) {
      const customWatcher = chokidar.watch(customPath, {
        persistent: true,
        ignoreInitial: true
      });
      
      customWatcher.on('change', () => {
        console.log('Custom config changed, reloading...');
        this.reload();
      });
      
      this.watchers.push(customWatcher);
    }
    
    // Note: settings.default.json is NOT watched (requires restart)
  }
  
  close() {
    // Clean up watchers
    this.watchers.forEach(watcher => watcher.close());
    this.watchers = [];
  }
}

// Singleton instance
let instance = null;

function getConfigLoader() {
  if (!instance) {
    instance = new ConfigLoader();
  }
  return instance;
}

module.exports = {
  ConfigLoader,
  getConfigLoader
};
