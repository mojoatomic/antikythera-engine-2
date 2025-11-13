const path = require('path');
const { spawnSync } = require('child_process');
const pty = require('node-pty');

function stripAnsi(s) {
  return s.replace(/[\u001b\u009b][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PR-TZcf-ntqry=><~]/g, '');
}

function runCli(args, extraEnv = {}) {
  const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8'
  });
  return {
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

const envControlE2E = process.env.ANTIKYTHERA_CONTROL_E2E === '1';

// Preflight: only run when env flag is on AND control server responds to `control status` via CLI
let controlReady = false;
if (envControlE2E) {
  try {
    const probe = runCli(['control', 'status']);
    controlReady = probe.code === 0;
    if (!controlReady) {
      // eslint-disable-next-line no-console
      console.warn('Skipping REPL control E2E: `antikythera control status` failed. Ensure server and control token are configured.');
    }
  } catch (_) {
    controlReady = false;
    // eslint-disable-next-line no-console
    console.warn('Skipping REPL control E2E: error invoking `antikythera control status`.');
  }
}

const describeControl = envControlE2E && controlReady ? describe : describe.skip;

describeControl('REPL control integration (opt-in E2E)', () => {
  jest.setTimeout(30000);

  test('control location here updates control state and context', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(d => { out += d.toString(); });

    // Set REPL context location + tz
    await new Promise(res => setTimeout(res, 200));
    term.write('set location 37.9838,23.7275,100\r');
    await new Promise(res => setTimeout(res, 200));
    term.write('set tz Europe/Athens\r');
    await new Promise(res => setTimeout(res, 200));

    // Push context into control via "here"
    term.write('control location here\r');
    await new Promise(res => setTimeout(res, 500));

    // Check status via alias
    term.write('control location status\r');
    await new Promise(res => setTimeout(res, 500));

    term.write('exit\r');
    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));

    const clean = stripAnsi(out);
    expect(code).toBe(0);
    // JSON from control status should contain timezone and coordinates and basic shape
    expect(clean).toMatch(/Europe\/Athens/);
    expect(clean).toMatch(/"latitude"\s*:\s*37\.9838/);
    expect(clean).toMatch(/"longitude"\s*:\s*23\.7275/);

    // Extract status JSON and assert structure
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const jsonStr = clean.slice(start, end + 1);
    const status = JSON.parse(jsonStr);
    expect(typeof status).toBe('object');
    expect(status).toHaveProperty('active');
    expect(status).toHaveProperty('mode');
    expect(status).toHaveProperty('location');
    expect(status.location).toEqual(expect.objectContaining({
      latitude: expect.any(Number),
      longitude: expect.any(Number),
      timezone: 'Europe/Athens'
    }));

    // Context update hint
    expect(clean).toMatch(/context updated from control location: 37\.9838,23\.7275/);
  });

  test('sync control pulls control location into REPL context', async () => {
    // First, set a known control location via CLI
    const locBody = ['control', 'location', '40.0,20.0', '--timezone', 'UTC', '--name', 'SyncTest'];
    const cliRes = runCli(locBody);
    expect(cliRes.code).toBe(0);

    // Now start REPL with a different context location
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(d => { out += d.toString(); });

    await new Promise(res => setTimeout(res, 200));
    term.write('set location 0,0,0\r');
    await new Promise(res => setTimeout(res, 200));
    term.write('set tz Europe/Athens\r');
    await new Promise(res => setTimeout(res, 200));

    // Sync from control server
    term.write('sync control\r');
    await new Promise(res => setTimeout(res, 600));
    term.write('context\r');
    await new Promise(res => setTimeout(res, 400));

    term.write('exit\r');
    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));

    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/Synced REPL context from control location\./i);
    // Context location should match the CLI-set control location
    expect(clean).toMatch(/location: 40\.0,20\.0/);
    expect(clean).toMatch(/tz:\s+UTC/);
  });

  test('control time now pushes REPL date into control displayTime', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(d => { out += d.toString(); });

    // Set REPL context date to a known fixed time
    await new Promise(res => setTimeout(res, 200));
    term.write('goto 2025-01-02T03:04:05Z\r');
    await new Promise(res => setTimeout(res, 300));

    // Push that date into control via `control time now`
    term.write('control time now\r');
    await new Promise(res => setTimeout(res, 600));

    // Inspect control status JSON from REPL
    term.write('control status\r');
    await new Promise(res => setTimeout(res, 600));

    term.write('exit\r');
    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));

    const clean = stripAnsi(out);
    expect(code).toBe(0);

    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const jsonStr = clean.slice(start, end + 1);
    const status = JSON.parse(jsonStr);

    expect(status).toHaveProperty('displayTime');
    expect(status.displayTime).toMatch(/^2025-01-02T03:04:05/);
    expect(status.mode).toBe('time');
    expect(status.active).toBe(true);
  });
});
