const fetch = require('node-fetch');

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
  const url = `https://ipapi.co/${ip}/json/`;
  const res = await fetch(url, { timeout: 5000 });
  if (!res.ok) throw new Error(`ipapi HTTP ${res.status}`);
  return res.json();
}

async function getLocationFromIP(ip) {
  const key = ip || 'unknown';
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now()) return hit.data;

  try {
    if (isPrivateIP(ip)) throw new Error('private ip');
    const data = await fetchIpapi(ip);
    const out = {
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      country: data.country_name,
      timezone: data.timezone,
      source: 'ip_geolocation'
    };
    cache.set(key, { data: out, expiresAt: now() + TTL_MS });
    return out;
  } catch (_err) {
    const out = {
      latitude: 37.5,
      longitude: 23.0,
      city: 'Athens',
      country: 'Greece',
      timezone: 'UTC',
      source: 'fallback'
    };
    cache.set(key, { data: out, expiresAt: now() + TTL_MS });
    return out;
  }
}

async function getObserverFromRequest(req) {
  // User override via query
  const lat = req.query.lat; const lon = req.query.lon; const elev = req.query.elev;
  if (lat && lon && isFinite(lat) && isFinite(lon)) {
    return {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      elevation: elev ? parseFloat(elev) : 0,
      source: 'query'
    };
  }
  const ip = parseClientIP(req);
  const loc = await getLocationFromIP(ip);
  return {
    latitude: Number(loc.latitude),
    longitude: Number(loc.longitude),
    elevation: 0,
    city: loc.city,
    country: loc.country,
    timezone: loc.timezone,
    source: loc.source || 'ip_geolocation'
  };
}

module.exports = {
  getLocationFromIP,
  getObserverFromRequest,
  parseClientIP,
  isPrivateIP,
};