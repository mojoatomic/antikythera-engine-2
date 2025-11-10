const fetch = require('node-fetch');
const { MS_PER_DAY } = require('../constants/time');
require('dotenv').config({ path: '.env.local' });

// Simple in-memory TTL cache
const cache = new Map(); // key: ip, value: { data, expiresAt }
const TTL_MS = Number(process.env.IP_GEO_TTL_MS || MS_PER_DAY); // default 24h

function now() { return Date.now(); }

function isPrivateIP(ip) {
  if (!ip) return true;
  // Strip IPv6 prefix for IPv4-mapped addresses
  ip = ip.replace('::ffff:', '');
  // Localhost
  if (ip === '127.0.0.1' || ip === '::1') return true;
  // RFC1918 private IPv4 ranges
  const parts = ip.split('.').map(n => parseInt(n, 10));
  if (parts.length === 4) {
    const [a,b] = parts;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  // Link-local IPv6
  if (ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;
  return false;
}

function parseClientIP(req) {
  // Prefer X-Forwarded-For chain
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const list = String(xff).split(',').map(s => s.trim());
    for (const candidate of list) {
      if (!isPrivateIP(candidate)) return candidate;
    }
  }
  // Common reverse proxies
  const cf = req.headers['cf-connecting-ip'];
  if (cf && !isPrivateIP(cf)) return cf;
  const xri = req.headers['x-real-ip'];
  if (xri && !isPrivateIP(xri)) return xri;
  // Fallback to socket address
  const ra = (req.socket && req.socket.remoteAddress) || (req.connection && req.connection.remoteAddress) || req.ip;
  if (ra) return ra;
  return '127.0.0.1';
}

async function fetchIpapi(ip) {
  let url;
  
  // Hybrid approach: localhost uses auto-detection, production uses client IP
  if (isPrivateIP(ip)) {
    // Dev mode: Let ipapi auto-detect from request origin
    url = 'https://ipapi.co/json/';
  } else {
    // Production: Use client's IP
    url = `https://ipapi.co/${ip}/json/`;
  }
  
  const res = await fetch(url, { 
    timeout: 5000,
    headers: {
      'User-Agent': 'Antikythera-Engine/1.0'
    }
  });
  if (!res.ok) throw new Error(`ipapi HTTP ${res.status}`);
  return res.json();
}

async function getLocationFromIP(ip) {
  const key = ip || 'unknown';
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now()) {
    // Cache hit - return silently without logging
    return hit.data;
  }

  try {
    const data = await fetchIpapi(ip);
    
    // Check for ipapi error response
    if (data.error) {
      throw new Error(data.reason || 'ipapi error');
    }
    
    const out = {
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      state: data.region || '', // Now includes state/region!
      country: data.country_name,
      timezone: data.timezone,
      postal: data.postal || '',
      source: 'ip_geolocation'
    };
    
    console.log(`Location detected: ${out.city}, ${out.state}, ${out.country}`);
    cache.set(key, { data: out, expiresAt: now() + TTL_MS });
    return out;
  } catch (err) {
    console.error('ipapi.co detection failed:', err.message);
    
    // Memphis fallback (changed from Athens)
    const out = {
      latitude: 35.1184,
      longitude: -90.0489,
      city: 'Memphis',
      state: 'Tennessee',
      country: 'USA',
      timezone: 'America/Chicago',
      postal: '38103',
      source: 'fallback'
    };
    
    console.log('Using Memphis fallback location');
    cache.set(key, { data: out, expiresAt: now() + TTL_MS });
    return out;
  }
}

/**
 * Extract observer location from configuration.
 * Returns observer data if mode is 'manual' and required fields are present.
 * 
 * @param {object} config - Configuration object from config loader
 * @returns {object|null} Observer data or null if not in manual mode
 */
function getObserverFromConfig(config) {
  if (!config || !config.observer) {
    return null;
  }
  
  // Only use config location when mode is 'manual'
  if (config.observer.mode !== 'manual') {
    return null;
  }
  
  const loc = config.observer.location;
  
  // Validate required fields for manual mode
  if (!Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude) || !loc.timezone) {
    return null;
  }
  
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    elevation: loc.elevation || 0,
    timezone: loc.timezone,
    name: loc.name || null,
    source: 'config'
  };
}

/**
 * Resolve observer location from available sources with priority ordering.
 * 
 * Priority order:
 * 1. Query parameters (?lat=X&lon=Y&elev=Z) - temporary override
 * 2. Config observer (when mode === 'manual') - persistent configuration
 * 3. IP geolocation (when mode === 'auto' or no config) - automatic detection
 * 4. Fallback (Memphis, Tennessee) - last resort
 * 
 * Note: Control mode location takes precedence over all sources,
 * but is handled by the caller (server.js) before invoking this function.
 * 
 * @param {object} req - Express request object
 * @param {object} config - Configuration object from config loader
 * @returns {Promise<object>} Observer location data
 */
async function getObserverFromRequest(req, config = null) {
  // Priority 1: Query parameter override (temporary, per-request)
  const lat = req.query.lat;
  const lon = req.query.lon;
  const elev = req.query.elev;
  
  if (lat && lon && isFinite(lat) && isFinite(lon)) {
    return {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      elevation: elev ? parseFloat(elev) : 0,
      source: 'query'
    };
  }
  
  // Priority 2: Config observer (manual mode, persistent)
  if (config) {
    const configObserver = getObserverFromConfig(config);
    if (configObserver) {
      return configObserver;
    }
  }
  
  // Priority 3: IP geolocation (auto mode or no config)
  const ip = parseClientIP(req);
  const loc = await getLocationFromIP(ip);
  
  return {
    latitude: Number(loc.latitude),
    longitude: Number(loc.longitude),
    elevation: 0,
    city: loc.city,
    state: loc.state || '',
    country: loc.country,
    timezone: loc.timezone,
    postal: loc.postal || '',
    source: loc.source || 'ip_geolocation'
  };
}

module.exports = {
  getLocationFromIP,
  getObserverFromRequest,
  getObserverFromConfig,
  parseClientIP,
  isPrivateIP,
};
