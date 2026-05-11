// ?frame= query parameter end-to-end coverage — refs #97.
//
// Spawns its own server on TEST_PORT (different from api.single-body's
// 3099 to avoid collision when both suites run together). Covers:
//   - default behavior (no ?frame=) matches ?frame=ecliptic_j2000
//   - ?frame=ecliptic_of_date returns numerically different ecliptic
//     longitudes (precession+nutation envelope at current epoch)
//   - the coordinate_frames response map correctly reflects the actual
//     frame returned, on both /api/state-style and single-body endpoints
//   - zodiac stays ECT regardless (it's a definitional constraint per
//     the issue's mechanics section)
//   - equatorial/horizontal/equationOfTime.apparentSun frames are
//     unaffected (out of scope per #97)
//   - lunarNodes.frame field echoes the actual frame used
//   - invalid ?frame= values return HTTP 400 with a helpful message
//   - empty ?frame= is treated as default

const { spawn } = require('child_process');
const fetch = require('node-fetch');

jest.setTimeout(30000);

const TEST_PORT = 3098;
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
      // Force a configured observer so the test doesn't depend on IP
      // geolocation (which is per-developer flaky and would not match
      // between baseline and post-refactor runs).
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

// Pin a deterministic date so the ECL/ECT longitude difference is a
// well-defined number rather than depending on whatever wall-clock the
// test runs at. May 11, 2026 is ~26.4 years since J2000; precession
// alone runs at ~50.291"/yr → ~1327" ≈ 0.369° expected diff on
// ecliptic longitude.
const FIXED_DATE = '2026-05-11T12:00:00Z';
const EXPECTED_ECL_VS_ECT_LON_DEG = 0.369;
// Allow ±0.05° tolerance — nutation oscillates ±9″ on the 18.6-yr cycle
// and there's a few-arcsec uncertainty in the precession model.
const LON_DIFF_TOLERANCE_DEG = 0.05;

describe('?frame= default behavior', () => {
  test('absent ?frame= is equivalent to ?frame=ecliptic_j2000 for /api/sun', async () => {
    const [a, b] = await Promise.all([
      fetch(`${BASE_URL}/api/sun?date=${encodeURIComponent(FIXED_DATE)}`).then(r => r.json()),
      fetch(`${BASE_URL}/api/sun?date=${encodeURIComponent(FIXED_DATE)}&frame=ecliptic_j2000`).then(r => r.json()),
    ]);
    expect(a.coordinate_frames).toEqual(b.coordinate_frames);
    expect(a.longitude).toBeCloseTo(b.longitude, 9);
    expect(a.latitude).toBeCloseTo(b.latitude, 9);
  });

  test('empty ?frame= (e.g. ?frame=) is treated as default', async () => {
    const res = await fetch(`${BASE_URL}/api/sun?date=${encodeURIComponent(FIXED_DATE)}&frame=`);
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.coordinate_frames.ecliptic).toBe('ecliptic_j2000');
  });
});

describe('?frame=ecliptic_of_date returns ECT', () => {
  let sunEcl, sunEct;

  beforeAll(async () => {
    [sunEcl, sunEct] = await Promise.all([
      fetch(`${BASE_URL}/api/sun?date=${encodeURIComponent(FIXED_DATE)}&frame=ecliptic_j2000`).then(r => r.json()),
      fetch(`${BASE_URL}/api/sun?date=${encodeURIComponent(FIXED_DATE)}&frame=ecliptic_of_date`).then(r => r.json()),
    ]);
  });

  test('coordinate_frames.ecliptic reflects the actual frame returned', () => {
    expect(sunEcl.coordinate_frames.ecliptic).toBe('ecliptic_j2000');
    expect(sunEct.coordinate_frames.ecliptic).toBe('ecliptic_of_date');
  });

  test('ECL vs ECT ecliptic longitude differs within the precession+nutation envelope', () => {
    const diff = sunEct.longitude - sunEcl.longitude;
    expect(diff).toBeGreaterThan(EXPECTED_ECL_VS_ECT_LON_DEG - LON_DIFF_TOLERANCE_DEG);
    expect(diff).toBeLessThan(EXPECTED_ECL_VS_ECT_LON_DEG + LON_DIFF_TOLERANCE_DEG);
  });

  test('equatorial and horizontal frames are unchanged by ?frame= (out of scope per #97)', () => {
    expect(sunEcl.rightAscension).toBeCloseTo(sunEct.rightAscension, 9);
    expect(sunEcl.declination).toBeCloseTo(sunEct.declination, 9);
    expect(sunEcl.altitude).toBeCloseTo(sunEct.altitude, 9);
    expect(sunEcl.azimuth).toBeCloseTo(sunEct.azimuth, 9);
    expect(sunEct.coordinate_frames.equatorial).toBe('equatorial_j2000');
    expect(sunEct.coordinate_frames.horizontal).toBe('topocentric_apparent');
  });
});

describe('/api/state ?frame=ecliptic_of_date', () => {
  let stateEcl, stateEct;

  beforeAll(async () => {
    [stateEcl, stateEct] = await Promise.all([
      fetch(`${BASE_URL}/api/state?date=${encodeURIComponent(FIXED_DATE)}`).then(r => r.json()),
      fetch(`${BASE_URL}/api/state?date=${encodeURIComponent(FIXED_DATE)}&frame=ecliptic_of_date`).then(r => r.json()),
    ]);
  });

  test('bodies.ecliptic and lunarNodes flip; zodiac/equatorial/horizontal/EOT do not', () => {
    expect(stateEct.coordinate_frames).toEqual({
      'bodies.ecliptic': 'ecliptic_of_date',
      'bodies.equatorial': 'equatorial_j2000',
      'bodies.horizontal': 'topocentric_apparent',
      'zodiac': 'ecliptic_of_date',
      'lunarNodes': 'ecliptic_of_date',
      'sunVisibility.horizontal': 'topocentric_apparent',
      'equationOfTime.apparentSun': 'ecliptic_j2000',
    });
    // Verify the ECL baseline still has the original mapping unchanged.
    expect(stateEcl.coordinate_frames['bodies.ecliptic']).toBe('ecliptic_j2000');
    expect(stateEcl.coordinate_frames.lunarNodes).toBe('ecliptic_j2000');
  });

  test('lunarNodes.frame field echoes the actual frame', () => {
    expect(stateEcl.lunarNodes.frame).toBe('ecliptic_j2000');
    expect(stateEct.lunarNodes.frame).toBe('ecliptic_of_date');
  });

  test('lunarNodes ascendingNode differs between frames (ECT path takes effect)', () => {
    // Precession+nutation moves the ECT node position relative to ECL by
    // the same ~0.37° as Sun longitude at this epoch. We just check it's
    // numerically different — within the same envelope, not byte-equal.
    expect(stateEct.lunarNodes.ascendingNode).not.toBeCloseTo(stateEcl.lunarNodes.ascendingNode, 2);
  });

  test('zodiac longitude is unchanged regardless of ?frame= (always ECT, definitional)', () => {
    // Zodiac response uses `absoluteLongitude` (the full 0–360 ecliptic
    // longitude) rather than `longitude` (which is degree-in-sign).
    // Both are ECT-derived regardless of the ?frame= override.
    expect(stateEct.zodiac.absoluteLongitude).toBeCloseTo(stateEcl.zodiac.absoluteLongitude, 9);
    expect(stateEct.zodiac.frame).toBe('ecliptic_of_date');
    expect(stateEcl.zodiac.frame).toBe('ecliptic_of_date');
  });

  test('body longitudes (sun, moon, planets) shift by the precession envelope', () => {
    const sunDiff = stateEct.sun.longitude - stateEcl.sun.longitude;
    const moonDiff = stateEct.moon.longitude - stateEcl.moon.longitude;
    const marsDiff = stateEct.planets.mars.longitude - stateEcl.planets.mars.longitude;
    for (const diff of [sunDiff, moonDiff, marsDiff]) {
      expect(diff).toBeGreaterThan(EXPECTED_ECL_VS_ECT_LON_DEG - LON_DIFF_TOLERANCE_DEG);
      expect(diff).toBeLessThan(EXPECTED_ECL_VS_ECT_LON_DEG + LON_DIFF_TOLERANCE_DEG);
    }
  });
});

describe('?frame= validation', () => {
  test.each([
    ['/api/state', '?frame=garbage'],
    ['/api/state/2026-05-11T12:00:00Z', '?frame=garbage'],
    ['/api/display', '?frame=ecliptic_garbage'],
    ['/api/sun', '?frame=ECLIPTIC_J2000'], // case-sensitive — uppercase rejected
    ['/api/moon', '?frame=of_date'],       // alias not accepted
    ['/api/planets', '?frame=true'],
  ])('%s%s → HTTP 400 with helpful error', async (path, qs) => {
    const res = await fetch(`${BASE_URL}${path}${qs}`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid frame parameter/);
    expect(body.error).toMatch(/ecliptic_j2000/);
    expect(body.error).toMatch(/ecliptic_of_date/);
  });
});

describe('?frame= across all six affected endpoints', () => {
  test.each([
    '/api/state',
    '/api/state/2026-05-11T12:00:00Z',
    '/api/display',
    '/api/sun',
    '/api/moon',
    '/api/planets',
  ])('%s accepts ?frame=ecliptic_of_date and updates coordinate_frames', async (path) => {
    const url = path.includes('?')
      ? `${BASE_URL}${path}&frame=ecliptic_of_date`
      : `${BASE_URL}${path}?frame=ecliptic_of_date`;
    const res = await fetch(url);
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty('coordinate_frames');
    // For the full-state shape the key is `bodies.ecliptic`; for the
    // single-body shape (and /api/display, which carries the full map)
    // we need to handle both.
    if (body.coordinate_frames['bodies.ecliptic'] !== undefined) {
      expect(body.coordinate_frames['bodies.ecliptic']).toBe('ecliptic_of_date');
    } else {
      expect(body.coordinate_frames.ecliptic).toBe('ecliptic_of_date');
    }
  });
});
