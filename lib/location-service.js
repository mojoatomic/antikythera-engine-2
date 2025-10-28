const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

// Simple in-memory TTL cache
const cache = new Map(); // key: ip, value: { data, expiresAt }
const TTL_MS = Number(process.env.IP_GEO_TTL_MS || 24 * 60 * 60 * 1000); // default 24h

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

async function getObserverFromRequest(req) {
  // Priority 1: Environment variables from .env.local
  if (process.env.OBSERVER_LATITUDE && process.env.OBSERVER_LONGITUDE) {
    console.log('Using configured location from .env.local');
    return {
      latitude: parseFloat(process.env.OBSERVER_LATITUDE),
      longitude: parseFloat(process.env.OBSERVER_LONGITUDE),
      elevation: parseFloat(process.env.OBSERVER_ELEVATION || 0),
      city: process.env.OBSERVER_CITY || 'Unknown',
      state: process.env.OBSERVER_STATE || '',
      country: process.env.OBSERVER_COUNTRY || '',
      timezone: process.env.OBSERVER_TIMEZONE || 'UTC',
      postal: process.env.OBSERVER_POSTAL || '',
      source: 'config'
    };
  }
  
  // Priority 2: User override via query parameters
  const lat = req.query.lat; const lon = req.query.lon; const elev = req.query.elev;
  if (lat && lon && isFinite(lat) && isFinite(lon)) {
    return {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      elevation: elev ? parseFloat(elev) : 0,
      source: 'query'
    };
  }
  
  // Priority 3: IP geolocation (auto-detect or client IP)
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
  parseClientIP,
  isPrivateIP,
};