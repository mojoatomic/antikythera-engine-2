# Configuration System

Modern, validated JSON-based configuration architecture for the Antikythera Engine.

## Quick Start

The system works out of the box with sensible defaults in `settings.default.json`. For custom configuration:

1. Copy `settings.default.json` to `settings.local.json`
2. Edit `settings.local.json` with your preferences
3. Restart the server (or wait for hot reload)

## File Structure

```
config/
├── settings.default.json    # Committed defaults (DO NOT EDIT)
├── settings.local.json       # Your local overrides (gitignored)
├── schema.js                 # Zod validation schema
└── README.md                 # This file
```

## Configuration Layering

The configuration system loads and merges settings in priority order:

1. **Custom config path** (highest priority)
   - Set via `ANTIKYTHERA_CONFIG` environment variable
   - Example: `ANTIKYTHERA_CONFIG=/path/to/custom.json npm start`

2. **Local overrides** (`settings.local.json`)
   - Gitignored file for your personal settings
   - Merged over defaults

3. **Default settings** (`settings.default.json`, lowest priority)
   - Committed to repository
   - Always loaded as base

### Merge Behavior

The system performs a **deep merge** of nested objects:

```json
// settings.default.json
{
  "observer": {
    "mode": "auto",
    "location": {
      "latitude": null,
      "longitude": null
    }
  }
}

// settings.local.json
{
  "observer": {
    "location": {
      "latitude": 37.9838,
      "longitude": 23.7275
    }
  }
}

// Result (merged)
{
  "observer": {
    "mode": "auto",  // ← from default
    "location": {
      "latitude": 37.9838,   // ← from local
      "longitude": 23.7275   // ← from local
    }
  }
}
```

## Hot Reload

The config system automatically reloads when files change:

- ✅ **`settings.local.json`** - Hot reload enabled
- ✅ **Custom config path** - Hot reload enabled
- ❌ **`settings.default.json`** - Requires server restart (committed file)

When a config file changes, the server:
1. Re-reads and re-parses the file
2. Re-validates with Zod schema
3. Emits a `reload` event
4. Continues serving with the new config

### Control Mode Interaction

Hot reload **does not affect** active control mode sessions:
- If control mode has a location set, it takes precedence over config
- Config changes apply when control mode is stopped (`control stop`)
- Control mode overrides are in-memory and independent of config files

## Configuration Schema

### `configVersion` (integer, required)

Version of the configuration schema. Must be `1` for this release.

```json
{
  "configVersion": 1
}
```

### `server` (object)

Server startup settings:

```json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  }
}
```

### `observer` (object)

Observer location settings with two modes:

#### Auto Mode (Default)

Uses IP-based geolocation to detect observer location:

```json
{
  "observer": {
    "mode": "auto",
    "location": {
      "latitude": null,
      "longitude": null,
      "timezone": null,
      "elevation": 0,
      "name": null
    }
  }
}
```

#### Manual Mode

Explicitly sets observer location. **Requires** `latitude`, `longitude`, and `timezone`:

```json
{
  "observer": {
    "mode": "manual",
    "location": {
      "latitude": 37.9838,
      "longitude": 23.7275,
      "timezone": "Europe/Athens",
      "elevation": 0,
      "name": "Athens, Greece"
    }
  }
}
```

**Validation:** In strict mode, manual mode with missing required fields will fail on startup. In loose mode (dev), warnings are logged but the server continues with defaults.

### `api` (object)

API behavior settings:

```json
{
  "api": {
    "rateLimit": {
      "enabled": true,
      "maxRequests": 100,
      "windowMs": 60000
    },
    "cache": {
      "enabled": true,
      "ttlSeconds": 300
    }
  }
}
```

### `display` (object)

Display and UI settings:

```json
{
  "display": {
    "language": "english",
    "showSunriseSunset": true
  }
}
```

## Validation

Configuration is validated using [Zod](https://github.com/colinhacks/zod) on every load/reload.

### Strict Mode (Default)

```bash
npm start  # Fails fast on invalid config
```

Validation errors halt server startup with clear error messages:

```
Configuration Error in config/settings.local.json:
  observer.mode is "manual" but required fields are missing or null:
    - observer.location.timezone
```

### Loose Mode (Development)

```bash
ANTIKYTHERA_CONFIG_LOOSE=1 npm start
```

In loose mode:
- Validation warnings are logged but don't halt startup
- Invalid fields use default values
- Useful for rapid development/testing

**Warning:** Loose mode should only be used during development. Production deployments should use strict mode.

## Unknown Keys

The config system allows unknown keys for forward compatibility:

```json
{
  "configVersion": 1,
  "futureFeature": "will be ignored"  // ← Warned but not fatal
}
```

Unknown keys trigger a warning on load but do not fail validation:

```
Warning: Unknown config keys in config/settings.local.json: futureFeature
These keys will be ignored. This may indicate a version mismatch or typo.
```

This allows:
- Downgrades without config breakage
- Feature flags for future releases
- Comments (via unused keys - not recommended, use actual comments when possible)

## Location Resolution Priority

When determining observer location, the system uses this priority order:

1. **Control location** (highest)
   - Set via `control location` CLI command or `/api/control/location`
   - Overrides all other sources while active
   - Cleared by `control stop`

2. **Config observer** (when `mode === 'manual'`)
   - From `settings.local.json` or custom config
   - Requires `latitude`, `longitude`, `timezone`

3. **Query parameters**
   - `?lat=X&lon=Y&elev=Z` in API requests
   - Temporary override for single request

4. **IP geolocation** (when `mode === 'auto'`)
   - Automatic detection via ipapi.co
   - 24-hour cache
   - City-level accuracy

5. **Fallback** (lowest)
   - Memphis, Tennessee (35.1184°N, 90.0489°W)
   - Used when all else fails

## Secrets Management

**Never put secrets in JSON config files!**

Secrets belong in environment variables or secure token files.

### Control Token

The server automatically generates a persistent control token on first startup:

- **Location:** `.antikythera/control-token` (gitignored, 0600 permissions)
- **Behavior:** Token persists across restarts
- **Override:** Set `ANTIKYTHERA_CONTROL_TOKEN` environment variable
- **Regenerate:** Delete `.antikythera/control-token` and restart server

For normal local development, no configuration is needed - the CLI automatically reads the token file.

For classroom/shared deployments, set `ANTIKYTHERA_CONTROL_TOKEN` on the server and distribute to clients:

```bash
# .env.local (gitignored)
ANTIKYTHERA_CONTROL_TOKEN=your-shared-token-here
```

### Other Secrets

Future secrets (API keys, database credentials, TLS certificates) will also use environment variables, never config files.

**Config files are for:**
- Application settings
- Feature flags  
- Display preferences
- Observer location

**Config files are NOT for:**
- ❌ Control tokens (use `.antikythera/control-token` or env var)
- ❌ API keys
- ❌ Database passwords
- ❌ TLS certificates

## Example: Manual Observer Mode

For a fixed observatory location:

**`config/settings.local.json`:**
```json
{
  "observer": {
    "mode": "manual",
    "location": {
      "latitude": 29.9792,
      "longitude": 31.1342,
      "timezone": "Africa/Cairo",
      "elevation": 60,
      "name": "Giza Plateau"
    }
  }
}
```

Now all API requests will use the Giza location by default (unless overridden by control mode or query parameters).

## Troubleshooting

### Config not loading

Check file paths:
```bash
ls -la config/
# Should see: settings.default.json (required)
#             settings.local.json (optional)
```

### Validation errors on startup

Enable loose mode to see warnings instead of errors:
```bash
ANTIKYTHERA_CONFIG_LOOSE=1 npm start
```

Review the warnings and fix the config issues.

### Hot reload not working

1. Check file exists: `ls config/settings.local.json`
2. Check file permissions: `ls -l config/settings.local.json`
3. Edit the file and save - you should see "Local config changed, reloading..." in logs
4. If still not working, restart the server

### Control mode not working after config change

Control mode overrides config. To apply new config settings:
```bash
antikythera control stop  # Clear control overrides
# Config settings now active
```

## Migration from .env.local

**Not applicable** - this config system is new. If you have observer settings in `.env.local`, they are ignored. Use `settings.local.json` instead.

## API Access

The `/api/settings` endpoint exposes **only** display-safe settings:

```bash
curl http://localhost:3000/api/settings
```

```json
{
  "language": "english",
  "showSunriseSunset": true
}
```

**Security:** The full config is never exposed via API. Only whitelisted display settings are returned.

## Further Reading

- Issue #38: Config migration specification
- `lib/config-loader.js`: Implementation details
- `config/schema.js`: Zod validation schema
