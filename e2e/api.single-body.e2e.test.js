// /api/sun, /api/moon, /api/planets coordinate_frames metadata — refs #96.
//
// Unlike api.display.e2e.test.js (which reuses a dev server on :3000 when
// present), this file always spawns its own server on TEST_PORT. The reuse
// pattern is unsafe for any test that asserts new response shape — a
// running dev server may be on stale code and silently fail the test for
// the wrong reason. The isolated port avoids that class of confusion.
// We exercise the three single-body endpoints and assert the top-level
// `coordinate_frames` map matches the spec from #96 Option A.

const { spawn } = require('child_process');
const fetch = require('node-fetch');

jest.setTimeout(30000);

// Spawn the server under test on an isolated port so we never reuse a
// developer's running dev server (which would test the wrong code).
// 3099 is well outside the default 3000 and the typical dev range.
const TEST_PORT = 3099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let server;

async function waitForServer(proc) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server did not start within timeout'));
    }, 10000);

    function onData(data) {
      const msg = data.toString();
      if (msg.includes('Antikythera Engine API running')) {
        clearTimeout(timeout);
        proc.stdout.off('data', onData);
        resolve();
      }
    }

    proc.stdout.on('data', onData);
    proc.stderr.on('data', () => {});
    proc.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited early with code ${code}`));
    });
  });
}

beforeAll(async () => {
  server = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      OBSERVER_LATITUDE: '37.5',
      OBSERVER_LONGITUDE: '23.0',
      OBSERVER_CITY: 'Athens',
      OBSERVER_COUNTRY: 'Greece',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForServer(server);
});

afterAll(() => {
  if (server && !server.killed) {
    server.kill('SIGINT');
  }
});

// The map values are the canonical frame identifiers for these three frames.
// Keep this expectation in lockstep with engine.js's SINGLE_BODY_COORDINATE_FRAMES.
const EXPECTED_FRAMES = {
  ecliptic: 'ecliptic_j2000',
  equatorial: 'equatorial_j2000',
  horizontal: 'topocentric_apparent',
};

describe.each([
  ['/api/sun'],
  ['/api/moon'],
  ['/api/planets'],
])('%s', (path) => {
  let body;

  beforeAll(async () => {
    const res = await fetch(`${BASE_URL}${path}`);
    expect(res.ok).toBe(true);
    body = await res.json();
  });

  test('response carries a top-level coordinate_frames map', () => {
    expect(body).toHaveProperty('coordinate_frames');
    expect(typeof body.coordinate_frames).toBe('object');
    expect(body.coordinate_frames).not.toBeNull();
  });

  test('coordinate_frames has exactly the three expected keys with correct values', () => {
    expect(body.coordinate_frames).toEqual(EXPECTED_FRAMES);
  });

  test('coordinate_frames keys are bare (no "bodies." prefix on single-body endpoints)', () => {
    // Issue #96 Option A: the body IS the response, so the `bodies.` prefix
    // used on /api/state's map becomes redundant here.
    expect(body.coordinate_frames).not.toHaveProperty('bodies.ecliptic');
    expect(body.coordinate_frames).not.toHaveProperty('bodies.equatorial');
    expect(body.coordinate_frames).not.toHaveProperty('bodies.horizontal');
  });

  test('zodiac / lunarNodes / sunVisibility / equationOfTime frames are absent', () => {
    // These don't appear in single-body responses, so they don't appear in
    // the frames map for these endpoints either.
    expect(body.coordinate_frames).not.toHaveProperty('zodiac');
    expect(body.coordinate_frames).not.toHaveProperty('lunarNodes');
    expect(body.coordinate_frames).not.toHaveProperty('sunVisibility.horizontal');
    expect(body.coordinate_frames).not.toHaveProperty('equationOfTime.apparentSun');
  });
});

// Range helpers: a value being `typeof === 'number'` accepts NaN and
// Infinity, which would mask arithmetic-bug regressions. Use finite-and-
// in-range checks instead so a NaN longitude or an Infinity declination
// trips the test immediately.
function expectEclipticLongitude(value) {
  expect(Number.isFinite(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThan(360);
}
function expectEclipticLatitude(value) {
  expect(Number.isFinite(value)).toBe(true);
  // Ecliptic latitude bounded by the body's orbital inclination; ±10°
  // safely covers Sun (0°), Moon (±5°), all classical planets (≤ ±7°)
  // with margin. Tightening below this would require per-body bounds.
  expect(Math.abs(value)).toBeLessThanOrEqual(10);
}
function expectRA(value) {
  expect(Number.isFinite(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThan(24); // hours
}
function expectDeclination(value) {
  expect(Number.isFinite(value)).toBe(true);
  expect(Math.abs(value)).toBeLessThanOrEqual(90); // degrees
}

test('/api/sun still returns body data alongside coordinate_frames (no breaking shape change)', async () => {
  const res = await fetch(`${BASE_URL}/api/sun`);
  expect(res.ok).toBe(true);
  const body = await res.json();
  // Existing fields stay top-level — coordinate_frames is purely additive.
  expectEclipticLongitude(body.longitude);
  expectEclipticLatitude(body.latitude);
  expectRA(body.rightAscension);
  expectDeclination(body.declination);
});

test('/api/moon still returns body data alongside coordinate_frames (no breaking shape change)', async () => {
  const res = await fetch(`${BASE_URL}/api/moon`);
  expect(res.ok).toBe(true);
  const body = await res.json();
  expectEclipticLongitude(body.longitude);
  expect(Number.isFinite(body.phase)).toBe(true);
  expect(body.phase).toBeGreaterThanOrEqual(0);
  expect(body.phase).toBeLessThan(360);
  expect(Number.isFinite(body.illumination)).toBe(true);
  expect(body.illumination).toBeGreaterThanOrEqual(0);
  expect(body.illumination).toBeLessThanOrEqual(1);
});

test('/api/planets still returns per-planet data alongside coordinate_frames (no breaking shape change)', async () => {
  const res = await fetch(`${BASE_URL}/api/planets`);
  expect(res.ok).toBe(true);
  const body = await res.json();
  // Each known planet still appears at the top level. coordinate_frames is
  // a sibling key on this collection-shaped endpoint — consumers iterating
  // planets must skip it (documented in #96).
  for (const planet of ['mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
    expect(body).toHaveProperty(planet);
    expectEclipticLongitude(body[planet].longitude);
    expectEclipticLatitude(body[planet].latitude);
  }
});
