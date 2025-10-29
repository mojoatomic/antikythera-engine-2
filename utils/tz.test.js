const { getUtcOffsetMinutes } = require('../utils/tz');
const AntikytheraEngine = require('../engine');

test('sunrise/sunset have UTC times and no localTime', () => {
  const engine = new AntikytheraEngine();
  const date = new Date('2025-10-29T12:00:00Z');
  const observer = { latitude: 35.139, longitude: -90.01, elevation: 80, timezone: 'America/Chicago' };
  const state = engine.getState(date, observer.latitude, observer.longitude, observer);
  expect(state.sunVisibility.sunrise).toBeTruthy();
  expect(state.sunVisibility.sunset).toBeTruthy();
  expect(state.sunVisibility.sunrise.localTime).toBeUndefined();
  expect(state.sunVisibility.sunset.localTime).toBeUndefined();
  expect(typeof state.sunVisibility.sunrise.time.toISOString).toBe('function');
  expect(state.observer.utcOffsetMinutes).toEqual(getUtcOffsetMinutes(date, observer.timezone));
});

test('tz offset changes across DST for America/Chicago', () => {
  const zone = 'America/Chicago';
  const jan = new Date('2025-01-15T12:00:00Z');
  const jul = new Date('2025-07-15T12:00:00Z');
  const offJan = getUtcOffsetMinutes(jan, zone);
  const offJul = getUtcOffsetMinutes(jul, zone);
  expect(offJan).not.toBeNull();
  expect(offJul).not.toBeNull();
  // Typically CST=-360, CDT=-300
  expect(Math.abs(offJan % 60)).toBe(0);
  expect(Math.abs(offJul % 60)).toBe(0);
  expect(offJan).not.toEqual(offJul);
});
