const { z } = require('zod');

// Celestial body position schema
const PositionSchema = z.object({
  longitude: z.number(),
  latitude: z.number(),
  rightAscension: z.number(),
  declination: z.number()
});

// Sun position schema (has additional altitude/azimuth)
const SunSchema = PositionSchema.extend({
  altitude: z.number(),
  azimuth: z.number()
});

// Moon schema (has phase information)
const MoonSchema = PositionSchema.extend({
  phase: z.number(),
  illumination: z.number(),
  age: z.number()
});

// Planets schema
const PlanetsSchema = z.object({
  mercury: PositionSchema,
  venus: PositionSchema,
  mars: PositionSchema,
  jupiter: PositionSchema,
  saturn: PositionSchema
});

// Full API response schema
const APIResponseSchema = z.object({
  date: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }),
  sun: SunSchema,
  moon: MoonSchema,
  planets: PlanetsSchema,
  zodiac: z.object({
    sign: z.string(),
    signIndex: z.number(),
    degreeInSign: z.number(),
    absoluteLongitude: z.number()
  }),
  egyptianCalendar: z.object({
    month: z.number(),
    day: z.number(),
    dayOfYear: z.number()
  }),
  metonicCycle: z.object({
    year: z.number(),
    progress: z.number(),
    anglePosition: z.number()
  }),
  sarosCycle: z.object({
    cycle: z.number(),
    progress: z.number(),
    anglePosition: z.number(),
    daysUntilNext: z.number()
  })
}).passthrough(); // Allow extra fields

module.exports = {
  APIResponseSchema,
  PositionSchema,
  SunSchema,
  MoonSchema,
  PlanetsSchema
};
