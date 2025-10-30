## High-Frequency Updates

### REST API Polling (Recommended)
For real-time displays, poll the API at your desired framerate:
```javascript
// 250ms = 4 updates/second (smooth for most displays)
setInterval(async () => {
  const state = await fetch('/api/state?bodies=sun,moon,mars').then(r => r.json());
  updateDisplay(state);
}, 250);
```

### Why Not WebSockets?

The Antikythera Engine uses REST polling instead of WebSockets because:
- **Stateless**: No connection management overhead
- **Resilient**: Clients can disconnect/reconnect freely
- **Sufficient**: 250ms polling provides smooth 4fps animation
- **Efficient**: Batch multiple bodies in single request

For classroom scenarios with 30+ students, the REST API easily handles 120 requests/second with negligible server load.
