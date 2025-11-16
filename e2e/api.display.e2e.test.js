const { spawn } = require('child_process');
const fetch = require('node-fetch');
const { getOrCreateControlToken } = require('../lib/control-token');

jest.setTimeout(30000);

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
  // If a server is already running (e.g., dev), reuse it to avoid port conflicts.
  try {
    const probe = await fetch('http://localhost:3000/api/system', { timeout: 500 });
    if (probe.ok) {
      server = null;
      return;
    }
  } catch (_e) {
    // Not running; proceed to start
  }

  server = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      // Force configured observer to avoid network geolocation and flakiness
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

function pickStepper(s) {
  return {
    position: s.position,
    velocity: s.velocity,
    velocityDegPerSec: s.velocityDegPerSec,
    direction: s.direction,
    stepsForInterval: s.stepsForInterval,
  };
}

test('GET /api/display includes stepper metadata and steps', async () => {
  const url = 'http://localhost:3000/api/display?dt=5&stepsPerDegree=200';
  const res = await fetch(url);
  expect(res.ok).toBe(true);
  const body = await res.json();

  // Debug: ensure intervalSec present when dt & stepsPerDegree provided
  // console.log('display keys', Object.keys(body));
  expect(body.intervalSec).toBe(5);

  const sun = pickStepper(body.mechanical.steppers.sun);
  const asc = pickStepper(body.mechanical.steppers.lunar_nodes_ascending);
  const desc = pickStepper(body.mechanical.steppers.lunar_nodes_descending);

  // Validate computation for stepsForInterval
  const expectedSunSteps = Math.round(sun.velocityDegPerSec * 5 * 200);
  expect(sun.stepsForInterval).toBe(expectedSunSteps);

  // Snapshot with property matchers for numeric fields
  expect({
    intervalSec: body.intervalSec,
    mechanical: {
      steppers: {
        sun,
        lunar_nodes_ascending: asc,
        lunar_nodes_descending: desc,
      },
    },
  }).toMatchSnapshot({
    mechanical: {
      steppers: {
        sun: {
          position: expect.any(Number),
          velocity: expect.any(Number),
          velocityDegPerSec: expect.any(Number),
          stepsForInterval: expect.any(Number),
          direction: expect.stringMatching(/^(CW|CCW)$/),
        },
        lunar_nodes_ascending: {
          position: expect.any(Number),
          velocity: expect.any(Number),
          velocityDegPerSec: expect.any(Number),
          stepsForInterval: expect.any(Number),
          direction: expect.stringMatching(/^(CW|CCW)$/),
        },
        lunar_nodes_descending: {
          position: expect.any(Number),
          velocity: expect.any(Number),
          velocityDegPerSec: expect.any(Number),
          stepsForInterval: expect.any(Number),
          direction: expect.stringMatching(/^(CW|CCW)$/),
        },
      },
    },
  });
});

test('GET /api/display baseline omits stepsForInterval and intervalSec', async () => {
  const url = 'http://localhost:3000/api/display';
  const res = await fetch(url);
  expect(res.ok).toBe(true);
  const body = await res.json();

  // intervalSec should not be present when dt/stepsPerDegree are not provided
  expect(body.intervalSec).toBeUndefined();

  const sun = body.mechanical.steppers.sun;
  // stepsForInterval should be omitted
  expect('stepsForInterval' in sun).toBe(false);

  // velocityDegPerSec and direction are always present
  expect(typeof sun.velocityDegPerSec).toBe('number');
  expect(['CW', 'CCW']).toContain(sun.direction);
});

// Explicit date on /api/state must be honored even when control time is active
// so that CLI position/compare commands can perform historical queries.
test('GET /api/state?date=... uses requested date instead of control time', async () => {
  const baseUrl = 'http://localhost:3000';
  const controlToken = getOrCreateControlToken();
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${controlToken}`,
  };

  // Activate a control time far in the past
  const controlTime = '1919-05-29T14:00:00Z';
  let res = await fetch(`${baseUrl}/api/control/time`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ date: controlTime }),
  });
  expect(res.ok).toBe(true);

  // Query two widely separated dates explicitly via /api/state
  const d1 = '2026-01-01T00:00:00Z';
  const d2 = '2026-06-01T00:00:00Z';

  const [res1, res2] = await Promise.all([
    fetch(`${baseUrl}/api/state?date=${encodeURIComponent(d1)}`),
    fetch(`${baseUrl}/api/state?date=${encodeURIComponent(d2)}`),
  ]);

  expect(res1.ok).toBe(true);
  expect(res2.ok).toBe(true);

  const s1 = await res1.json();
  const s2 = await res2.json();

  // The engine should reflect the requested dates, not the control time.
  expect(new Date(s1.date).toISOString()).toBe(new Date(d1).toISOString());
  expect(new Date(s2.date).toISOString()).toBe(new Date(d2).toISOString());

  // Mars longitude/velocity must differ across these dates
  expect(s1.planets.mars.longitude).not.toBeCloseTo(s2.planets.mars.longitude, 10);
  expect(s1.planets.mars.velocity).not.toBeCloseTo(s2.planets.mars.velocity, 10);

  // Clean up: stop control mode so other tests see normal behaviour
  res = await fetch(`${baseUrl}/api/control/stop`, {
    method: 'POST',
    headers: authHeaders,
  });
  expect(res.ok).toBe(true);
});

// BCE control time should be accepted and reflected by /api/state
// using astronomical year numbering (-000490 = 491 BCE, etc.).
test('control time accepts BCE ISO dates and surfaces via /api/state', async () => {
  const baseUrl = 'http://localhost:3000';
  const controlToken = getOrCreateControlToken();
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${controlToken}`,
  };

  const bceIso = '-490-09-12T06:00:00Z';
  const expectedStoredIso = '-000490-09-12T06:00:00.000Z';

  // Set a BCE control time
  let res = await fetch(`${baseUrl}/api/control/time`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ date: bceIso }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BCE control/time failed: status=${res.status} body=${text}`);
  }

  const control = await res.json();
  expect(control.ok).toBe(true);
  expect(control.status).toBeDefined();
  expect(control.status.displayTime).toBe(expectedStoredIso);

  // Query state at the same BCE instant via path param
  res = await fetch(`${baseUrl}/api/state/${encodeURIComponent(bceIso)}`);
  expect(res.ok).toBe(true);
  const state = await res.json();

  expect(state.date).toBe(expectedStoredIso);
  expect(state.planets).toBeDefined();
  expect(state.planets.mars).toBeDefined();

  // Clean up: stop control mode so other tests see normal behaviour
  res = await fetch(`${baseUrl}/api/control/stop`, {
    method: 'POST',
    headers: authHeaders,
  });
  expect(res.ok).toBe(true);
});
