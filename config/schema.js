const { z } = require('zod');

// Schema for configuration validation
const configSchema = z.object({
  configVersion: z.number().int().refine(v => v === 1, {
    message: 'configVersion must be 1 (current version)'
  }),
  
  server: z.object({
    port: z.number().int().positive().default(3000),
    host: z.string().default('localhost')
  }).default({ port: 3000, host: 'localhost' }),
  
  observer: z.object({
    mode: z.enum(['auto', 'manual']).default('auto'),
    location: z.object({
      latitude: z.number().min(-90).max(90).nullable(),
      longitude: z.number().min(-180).max(180).nullable(),
      timezone: z.string().nullable(),
      elevation: z.number().default(0),
      name: z.string().nullable().optional()
    })
  }),
  
  api: z.object({
    rateLimit: z.object({
      enabled: z.boolean().default(true),
      maxRequests: z.number().int().positive().default(100),
      windowMs: z.number().int().positive().default(60000)
    }).default({ enabled: true, maxRequests: 100, windowMs: 60000 }),
    cache: z.object({
      enabled: z.boolean().default(true),
      ttlSeconds: z.number().int().positive().default(300)
    }).default({ enabled: true, ttlSeconds: 300 })
  }).default({
    rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
    cache: { enabled: true, ttlSeconds: 300 }
  }),
  
  display: z.object({
    language: z.string().default('english'),
    showSunriseSunset: z.boolean().default(true),
    theme: z.string().default('ancient-bronze'),
    layout: z.enum(['hero', 'gallery', 'focus']).default('gallery'),
    orientation: z.enum(['horizontal', 'vertical']).default('horizontal'), // legacy support
    mount: z.enum(['landscape', 'portrait-right', 'portrait-left']).default('landscape')
  }).default({
    language: 'english',
    showSunriseSunset: true,
    theme: 'ancient-bronze',
    layout: 'gallery',
    orientation: 'horizontal',
    mount: 'landscape'
  })
}).passthrough(); // Allow unknown keys for forward compatibility

// Conditional validation: manual mode requires location fields
function validateConfig(data, filePath = 'config', looseMode = false) {
  const unknownKeys = new Set();
  
  // Collect unknown keys
  const knownTopLevel = ['configVersion', 'server', 'observer', 'api', 'display'];
  Object.keys(data).forEach(key => {
    if (!knownTopLevel.includes(key)) {
      unknownKeys.add(key);
    }
  });
  
  // Warn about unknown keys (once per load)
  if (unknownKeys.size > 0) {
    console.warn(`Warning: Unknown config keys in ${filePath}: ${Array.from(unknownKeys).join(', ')}`);
    console.warn('These keys will be ignored. This may indicate a version mismatch or typo.');
  }
  
  // Map legacy orientation/rotation to mount if mount missing (pre-parse)
  try {
    if (data && typeof data === 'object') {
      const d = data.display || {};
      if (!d.mount) {
        const orientation = d.orientation;
        const rotation = d.rotation || d.canvasRotation; // accept legacy key names just in case
        let inferred;
        if (orientation === 'horizontal') inferred = 'landscape';
        else if (orientation === 'vertical') {
          if (rotation === 'ccw90') inferred = 'portrait-right';
          else if (rotation === 'cw90') inferred = 'portrait-left';
          else inferred = 'portrait-right';
        }
        if (inferred) {
          data.display = { ...d, mount: inferred };
        }
      }
    }
  } catch (_) {
    // ignore mapping errors; fall through to schema parse
  }

  // Schema validation
  let result;
  try {
    result = configSchema.parse(data);
  } catch (error) {
    if (looseMode) {
      console.warn(`Config validation warnings in ${filePath}:`);
      if (error.errors) {
        error.errors.forEach(err => {
          console.warn(`  - ${err.path.join('.')}: ${err.message}`);
        });
      }
      // In loose mode, use defaults for invalid fields
      result = configSchema.parse({
        configVersion: 1,
        server: { port: 3000, host: 'localhost' },
        observer: { mode: 'auto', location: { latitude: null, longitude: null, timezone: null, elevation: 0 } },
        api: { rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }, cache: { enabled: true, ttlSeconds: 300 } },
        display: { language: 'english', showSunriseSunset: true }
      });
    } else {
      // Format error message with file path
      const message = [`Configuration Error in ${filePath}:`];
      if (error.errors) {
        error.errors.forEach(err => {
          message.push(`  ${err.path.join('.')}: ${err.message}`);
        });
      }
      throw new Error(message.join('\n'));
    }
  }
  
  // Conditional validation: manual mode requires location fields
  if (result.observer.mode === 'manual') {
    const missing = [];
    if (result.observer.location.latitude === null || result.observer.location.latitude === undefined) {
      missing.push('observer.location.latitude');
    }
    if (result.observer.location.longitude === null || result.observer.location.longitude === undefined) {
      missing.push('observer.location.longitude');
    }
    if (!result.observer.location.timezone) {
      missing.push('observer.location.timezone');
    }
    
    if (missing.length > 0) {
      const errorMsg = [
        `Configuration Error in ${filePath}:`,
        '  observer.mode is "manual" but required fields are missing or null:',
        ...missing.map(field => `    - ${field}`)
      ].join('\n');
      
      if (looseMode) {
        console.warn(errorMsg);
        console.warn('  Continuing in loose mode with defaults');
      } else {
        throw new Error(errorMsg);
      }
    }
  }
  
  return result;
}

module.exports = {
  configSchema,
  validateConfig
};
