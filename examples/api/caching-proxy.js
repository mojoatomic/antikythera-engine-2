const express = require('express');
const fetch = require('node-fetch');

const app = express();
const cache = new Map();
const TTL = 10000; // 10 seconds

// In-memory cache with TTL
function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// Proxy endpoint
app.get('/api/state', async (req, res) => {
  const cacheKey = `state-${JSON.stringify(req.query)}`;
  
  // Check cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  // Cache miss - fetch from Antikythera Engine
  const queryString = new URLSearchParams(req.query).toString();
  const response = await fetch(`http://localhost:3000/api/state?${queryString}`);
  const data = await response.json();

  // Store in cache
  setCachedData(cacheKey, data);

  res.json({ ...data, cached: false });
});

app.listen(4000, () => {
  console.log('Caching proxy running on http://localhost:4000');
});
