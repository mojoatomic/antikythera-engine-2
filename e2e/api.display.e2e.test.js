const { spawn } = require('child_process');
const fetch = require('node-fetch');

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
