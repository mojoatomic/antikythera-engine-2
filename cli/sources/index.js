const AntikytheraEngine = require('../../engine');
const axios = require('axios');

const engine = new AntikytheraEngine();

/**
 * Get astronomical data from embedded engine
 */
async function getFromEngine(date = new Date()) {
  return engine.getState(date);
}

/**
 * Get astronomical data from API server
 */
async function getFromAPI(date = new Date()) {
  try {
    const response = await axios.get(`http://localhost:3000/api/state/${date.toISOString()}`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
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
  const { local, remote } = options;
  
  // Force local
  if (local) {
    return getFromEngine(date);
  }
  
  // Force remote
  if (remote) {
    return getFromAPI(date);
  }
  
  // Smart: try API first, fallback to engine
  try {
    return await getFromAPI(date);
  } catch (_error) {
    return getFromEngine(date);
  }
}

module.exports = {
  getData,
  getFromEngine,
  getFromAPI
};
