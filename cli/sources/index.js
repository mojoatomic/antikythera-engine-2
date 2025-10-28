const AntikytheraEngine = require('../../engine');
const axios = require('axios');
const { APIResponseSchema } = require('../schemas');
const chalk = require('chalk');

const engine = new AntikytheraEngine();
let fallbackNotified = false;
let lastApiFailureAt = 0;
const API_COOLDOWN_MS = 60 * 1000; // 60s cooldown after failure
function notifyFallbackOnce() {
  if (fallbackNotified) return;
  try {
    // Keep this plain for easy grepping in demos/tests
    console.log('API timeout... Falling back to local engine');
  } catch (_) {}
  fallbackNotified = true;
}
function apiAvailable() {
  return (Date.now() - lastApiFailureAt) >= API_COOLDOWN_MS;
}

/**
 * Get astronomical data from embedded engine
 */
async function getFromEngine(date = new Date(), observer = null) {
  if (observer && isFinite(observer.latitude) && isFinite(observer.longitude)) {
    return engine.getState(date, observer.latitude, observer.longitude, observer);
  }
  return engine.getState(date);
}

/**
 * Get astronomical data from API server
 */
async function getFromAPI(date = new Date(), { validate = true, observer = null } = {}) {
  try {
    const params = new URLSearchParams({ date: date.toISOString() });
    if (observer && isFinite(observer.latitude) && isFinite(observer.longitude)) {
      params.set('lat', String(observer.latitude));
      params.set('lon', String(observer.longitude));
      if (isFinite(observer.elevation)) params.set('elev', String(observer.elevation));
    }
    const url = `http://localhost:3000/api/state?${params.toString()}`;
    const response = await axios.get(url, { timeout: 5000 });
    
    // Validate API response
    if (validate) {
      try {
        APIResponseSchema.parse(response.data);
      } catch (validationError) {
        console.warn(chalk.yellow('⚠ API response validation failed:'));
        validationError.errors.forEach(err => {
          console.warn(chalk.gray(`  ${err.path.join('.')}: ${err.message}`));
        });
        // Return data anyway but warn user
      }
    }
    
    return response.data;
  } catch (error) {
    lastApiFailureAt = Date.now();
    if (error.code === 'ECONNREFUSED') {
      throw new Error('API server not running. Start with: npm start');
    }
    throw error;
  }
}

/**
 * Get astronomical data - smart selection between engine and API
 */
async function getData(date = new Date(), options = {}) {
  const { local, remote, observer = null } = options;
  
  // Force local
  if (local) {
    return getFromEngine(date, observer);
  }
  
  // Force remote
  if (remote) {
    return getFromAPI(date, { observer });
  }
  
  // Smart: try API first unless in cooldown, fallback to engine
  if (!apiAvailable()) {
    notifyFallbackOnce();
    return getFromEngine(date, observer);
  }
  try {
    return await getFromAPI(date, { observer });
  } catch (_error) {
    // Notify once for demo/UX visibility
    notifyFallbackOnce();
    return getFromEngine(date, observer);
  }
}

async function getDisplayFromAPI(date = new Date(), observer = null) {
  try {
    const params = new URLSearchParams({ date: date.toISOString() });
    if (observer && isFinite(observer.latitude) && isFinite(observer.longitude)) {
      params.set('lat', String(observer.latitude));
      params.set('lon', String(observer.longitude));
      if (isFinite(observer.elevation)) params.set('elev', String(observer.elevation));
    }
    const url = `http://localhost:3000/api/display?${params.toString()}`;
    const response = await axios.get(url, { timeout: 5000 });
    return response.data;
  } catch (error) {
    lastApiFailureAt = Date.now();
    if (error.code === 'ECONNREFUSED') {
      throw new Error('API server not running. Start with: npm start');
    }
    throw error;
  }
}

async function getNextConjunction(date = new Date(), a = 'moon', b = 'sun') {
  const A = String(a || 'moon');
  const B = String(b || 'sun');
  return engine.getNextConjunction(date, A, B);
}

async function getNextEquinox(date = new Date()) {
  return engine.getNextEquinox(date);
}
async function getNextSolstice(date = new Date()) {
  return engine.getNextSolstice(date);
}

module.exports = {
  getData,
  getFromEngine,
  getFromAPI,
  getDisplayFromAPI,
  getNextConjunction,
  getNextEquinox,
  getNextSolstice
};
