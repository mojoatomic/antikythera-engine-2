const path = require('path');
const { spawn } = require('child_process');
const pty = require('node-pty');
const fs = require('fs');
const os = require('os');
const pathFs = require('path');

function stripAnsi(s) {
  return s.replace(/[\u001b\u009b][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PR-TZcf-ntqry=><~]/g, '');
}

describe('REPL e2e (startup/help/exit)', () => {
  jest.setTimeout(10000);

  test('starts, shows help, exits cleanly', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
 cols: 80, rows: 24,
      cwd: process.cwd(), env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(d => { out += d.toString(); });

    // Send help then exit
    await new Promise(res => setTimeout(res, 150));
    term.write('help\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));

    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/Antikythera REPL/i);
    expect(clean).toMatch(/Commands/i);
    expect(clean).toMatch(/Goodbye/i);
  });
});

describe('REPL e2e (persistence across restart)', () => {
  jest.setTimeout(15000);

  test('context and history persist between sessions', async () => {
    const tmpBase = fs.mkdtempSync(pathFs.join(os.tmpdir(), 'antikythera-repl-'));
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');

    // Session 1: set context values and exit (PTY to record history)
    const env1 = { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1', XDG_CONFIG_HOME: tmpBase };
    const term1 = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: env1
    });
    let out1 = '';
    term1.onData(c => { out1 += c.toString(); });
    await new Promise(res => setTimeout(res, 150));
    term1.write('set format json\r');
    await new Promise(res => setTimeout(res, 120));
    term1.write('set tolerance 0.002\r');
    await new Promise(res => setTimeout(res, 120));
    term1.write('exit\r');
    const code1 = await new Promise(r => term1.onExit(({ exitCode }) => r(exitCode)));
    expect(code1).toBe(0);

    // Verify history persisted
    const histPath = pathFs.join(tmpBase, 'antikythera', 'history');
    const hist = fs.readFileSync(histPath, 'utf8');
    expect(hist).toMatch(/set format json/);
    expect(hist).toMatch(/set tolerance 0\.002/);

    // Session 2: verify context persisted
    const term2 = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: env1
    });
    let out2 = '';
    term2.onData(c => { out2 += c.toString(); });
    await new Promise(res => setTimeout(res, 150));
    term2.write('context\r');
    await new Promise(res => setTimeout(res, 150));
    term2.write('exit\r');
    const code2 = await new Promise(r => term2.onExit(({ exitCode }) => r(exitCode)));
    const clean = stripAnsi(out2);
    expect(code2).toBe(0);
    expect(clean).toMatch(/format:\s+json/i);
    expect(clean).toMatch(/tolΔ:\s+0\.002/i);
  });
});

describe('REPL e2e (double SIGINT exit)', () => {
  jest.setTimeout(30000);

  test('double Ctrl+C exits REPL from prompt (PTY)', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 600));
    // First Ctrl+C should print hint
    term.write('\u0003');
    await new Promise(res => setTimeout(res, 400));
    // Second Ctrl+C should exit
    term.write('\u0003');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/press again to exit/i);
    expect(clean).toMatch(/Goodbye/i);
  });
});

describe('REPL e2e (compare behavior with API down/up)', () => {
  jest.setTimeout(30000);

  test.skip('compare moon reports API unavailable', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
term.write('compare moon\r');
    await new Promise(res => setTimeout(res, 400));
term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/Comparing moon/i);
    expect(clean).toMatch(/API unavailable/);
  });

  test.skip('compare moon matches within tolerance when API up', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('set tolerance 6\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('compare moon\r');
    await new Promise(res => setTimeout(res, 600));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    // Pass if API is up (sources match) or gracefully report unavailability in CI
    expect(/Sources match/i.test(clean) || /API unavailable/i.test(clean)).toBe(true);
  });
});

describe('REPL e2e (time navigation, watch cancel, JSON purity, pipes)', () => {
  jest.setTimeout(15000);

  test('moon at <date> updates lastDate via body-at-date syntax', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('set source local\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('moon at 2025-01-01T00:00:00Z\r');
    await new Promise(res => setTimeout(res, 300));
    term.write('context\r');
    await new Promise(res => setTimeout(res, 200));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/lastDate: .*2025-01-01T00:00:00\.000Z/);
  });

  test('now unified snapshot runs against local source and shows SUN/MOON', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('set source local\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('set format table\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('now\r');
    await new Promise(res => setTimeout(res, 400));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).not.toMatch(/Unknown command/i);
    // Expect at least SUN and MOON labels somewhere in the snapshot
    expect(clean).toMatch(/SUN/i);
    expect(clean).toMatch(/MOON/i);
  });

  test('position mars produces debug output and longitude field', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('set source local\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('set format table\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('position mars --debug\r');
    await new Promise(res => setTimeout(res, 600));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    // Debug mode should identify MARS and include a longitude field
    expect(clean).toMatch(/=== DEBUG: MARS ===/);
    expect(clean).toMatch(/longitude[^\n]*\d/);
  });

  test('plain all prints ALL BODIES header and at least SUN and MOON', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('set format table\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('all\r');
    await new Promise(res => setTimeout(res, 400));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/=== ALL BODIES ===/i);
    expect(clean).toMatch(/^SUN\s/m);
    expect(clean).toMatch(/^MOON\s/m);
  });

  test('set tz and set intent impact context and intent echoing', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('set tz Europe/Paris\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('set intent off\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('moon\r');
    await new Promise(res => setTimeout(res, 250));
    term.write('set intent on\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('moon\r');
    await new Promise(res => setTimeout(res, 250));
    term.write('context\r');
    await new Promise(res => setTimeout(res, 250));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    // tz should be updated in context
    expect(clean).toMatch(/tz:\s+Europe\/Paris/);
    // With intent off then on, we should see exactly one "moon at now" intent line
    const intentMatches = clean.match(/moon at now/gi) || [];
    expect(intentMatches.length).toBe(1);
  });

  test('history prints header and file path', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('history\r');
    await new Promise(res => setTimeout(res, 250));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/=== HISTORY \(/i);
    expect(clean).toMatch(/file:\s+/i);
  });

  test('clear does not break subsequent commands', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('clear\r');
    await new Promise(res => setTimeout(res, 200));
    term.write('moon\r');
    await new Promise(res => setTimeout(res, 400));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).not.toMatch(/Unknown command/i);
    expect(clean).toMatch(/MOON/i);
  });

  test('plot visibility sun 1d renders VIS(SUN) chart', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('set source local\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('plot visibility sun 1d\r');
    await new Promise(res => setTimeout(res, 500));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/VIS\(SUN\)/);
    const lines = clean.split(/\r?\n/).filter(l => l.trim().length);
    expect(lines.length).toBeGreaterThan(5);
  });

  test('plot speed mars 5d csv emits MARS_vel header', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('set source local\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('plot speed mars 5d csv\r');
    await new Promise(res => setTimeout(res, 500));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    const lines = clean.split(/\r?\n/).filter(l => l.trim().length);
    expect(lines.length).toBeGreaterThan(2);
    // CSV header should include a velocity column for MARS
    expect(lines.join('\n')).toMatch(/MARS_vel/);
  });

  test('time navigation: goto, step, reset updates context date', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    // goto a fixed ISO date
    await new Promise(res => setTimeout(res, 150));
    term.write('goto 2025-12-25T00:00:00Z\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('context\r');
    await new Promise(res => setTimeout(res, 150));

    // step +2h
    term.write('+2h\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('context\r');
    await new Promise(res => setTimeout(res, 150));

    // reset
    term.write('reset\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('context\r');
    await new Promise(res => setTimeout(res, 150));

    term.write('exit\r');
    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));

    const clean = stripAnsi(out);
    expect(code).toBe(0);
    // After goto
    expect(clean).toMatch(/lastDate: .*2025-12-25T00:00:00\.000Z/);
    // After +2h
    expect(clean).toMatch(/lastDate: .*2025-12-25T02:00:00\.000Z/);
    // After reset: lastDate no longer equals the +2h date (check final context block)
    const lastIdx = clean.lastIndexOf('lastDate: ');
    const tail = lastIdx >= 0 ? clean.slice(lastIdx, lastIdx + 100) : '';
    expect(tail).not.toMatch(/2025-12-25T02:00:00\.000Z/);
  });

test('watch cancels on Ctrl+C and returns to prompt (PTY)', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
term.onData(chunk => { out += chunk.toString(); });

    // Start watch then send Ctrl+C (SIGINT)
    await new Promise(res => setTimeout(res, 150));
term.write('watch moon\r');
    await new Promise(res => setTimeout(res, 400));
term.write('\u0003'); // Ctrl+C (cancel watch)
    await new Promise(res => setTimeout(res, 200));

    // Exit
term.write('exit\r');
    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));

    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/Watching MOON/i);
    expect(clean).toMatch(/Watch canceled/i);
  });

test('plot moon.illumination 5d renders ASCII without crash', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
    term.write('plot moon.illumination 5d\r');
    await new Promise(res => setTimeout(res, 400));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const lines = out.split(/\r?\n/).filter(l => l.trim().length);
    expect(code).toBe(0);
    expect(lines.length).toBeGreaterThan(5);
  });

  test('plot venus.illumination is rejected (no fallback to moon)', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
    term.write('plot venus.illumination 5d\r');
    await new Promise(res => setTimeout(res, 300));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/Illumination plots are only supported for the Moon/i);
    expect(clean).not.toMatch(/MOON\.ILLUM/);
  });

  test('plot pluto.illumination is rejected as invalid', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
    term.write('plot pluto.illumination 5d\r');
    await new Promise(res => setTimeout(res, 300));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/Illumination plots are only supported for the Moon/i);
    expect(clean).not.toMatch(/MOON\.ILLUM/);
  });

  test('watch multi-body pause/resume works', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('watch sun moon interval 300\r');
    await new Promise(res => setTimeout(res, 600));
    term.write('pause\r');
    await new Promise(res => setTimeout(res, 200));
    term.write('resume\r');
    await new Promise(res => setTimeout(res, 600));
    term.write('\u0003');
    await new Promise(res => setTimeout(res, 200));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/Watching SUN, MOON/i);
    expect(clean).toMatch(/Watch paused/i);
    expect(clean).toMatch(/Watch canceled/i);
  });

  test('watch compare: shows Δ or API unavailable and cancels cleanly', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('watch moon compare\r');
    await new Promise(res => setTimeout(res, 700));
    term.write('\u0003');
    await new Promise(res => setTimeout(res, 200));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/Watching MOON/i);
    expect(clean).toMatch(/Watch canceled/i);
    // Either we saw a diff symbol or an API unavailable notice
    expect(/Δ|API unavailable/i.test(clean)).toBe(true);
  });

  test('multi-series: plot mars,jupiter 5d renders without crash', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
    term.write('plot mars,jupiter 5d\r');
    await new Promise(res => setTimeout(res, 500));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    // Expect header with both series names
    expect(clean).toMatch(/MARS/i);
    expect(clean).toMatch(/JUPITER/i);
  });

  test('set location persists and shows in context', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
    term.write('set location 40.0,-105.0\r');
    await new Promise(res => setTimeout(res, 120));
    term.write('context\r');
    await new Promise(res => setTimeout(res, 150));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/location:\s+40(?:\.0)?,-105(?:\.0)?/);
  });

  test('JSON purity: format=json for moon has no ANSI', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
    term.write('set format json\r');
    await new Promise(res => setTimeout(res, 120));
    term.write('moon\r');
    await new Promise(res => setTimeout(res, 300));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    // Extract JSON block between first '{' after the command and the matching '}'
    const idx = out.indexOf('{');
    expect(idx).toBeGreaterThan(-1);
    const last = out.lastIndexOf('}');
    const jsonStr = out.slice(idx, last + 1);
    expect(jsonStr).not.toMatch(/\u001b|\x1b/); // no ANSI
    expect(() => JSON.parse(jsonStr)).not.toThrow();
    expect(code).toBe(0);
  });

  test('pipeline: all | visible | sort alt desc | limit 3 outputs filtered list', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
    term.write('set format table\r');
    await new Promise(res => setTimeout(res, 120));
    term.write('all | visible | sort alt desc | limit 3\r');
    await new Promise(res => setTimeout(res, 400));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/ALL BODIES \(filtered\)/i);
    // Expect at most 3 body lines after header (approx check)
    const lines = clean.split(/\r?\n/).filter(l => /^(SUN|MOON|MERCURY|VENUS|MARS|JUPITER|SATURN)\s/.test(l));
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  test('pipeline: all | fields name lon alt | grep MAR reduces columns', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
    term.write('set format table\r');
    await new Promise(res => setTimeout(res, 120));
    term.write('all | fields name lon alt | grep MAR\r');
    await new Promise(res => setTimeout(res, 400));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    // Should contain MARS line with only Lon and Alt displayed
    const marsLine = clean.split(/\r?\n/).find(l => /^MARS\s/.test(l));
    expect(marsLine).toBeTruthy();
    expect(marsLine).toMatch(/Lon:/);
    expect(marsLine).toMatch(/Alt:/);
  });

  test('sample moon from now to +2h every 30m json outputs parsable JSON', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
    term.write('set source local\r');
    await new Promise(res => setTimeout(res, 120));
    term.write('sample moon from now to +2h every 30m json\r');
    await new Promise(res => setTimeout(res, 2500));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const matches = out.match(/{[\s\S]*}/g) || [];
    const jsonStr = matches.length ? matches[matches.length - 1] : '';
    const parsed = JSON.parse(jsonStr);
    expect(code).toBe(0);
    expect(Array.isArray(parsed.rows)).toBe(true);
    expect(parsed.rows.length).toBeGreaterThan(1);
  });

  test('pipeline: all | where alt > 0 | fields name alt | limit 2 filters numerically', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
    term.write('set format table\r');
    await new Promise(res => setTimeout(res, 120));
    term.write('all | where alt > 0 | fields name alt | limit 2\r');
    await new Promise(res => setTimeout(res, 400));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    const bodyLines = clean.split(/\r?\n/).filter(l => /^(SUN|MOON|MERCURY|VENUS|MARS|JUPITER|SATURN)\s/.test(l));
    // Should be <= 2 lines based on limit
    expect(bodyLines.length).toBeLessThanOrEqual(2);
    // Each line should contain Alt:
    bodyLines.forEach(l => expect(l).toMatch(/Alt:/));
  });

  test('pipeline: all | visible | json outputs JSON rows array', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
    term.write('all | visible | json\r');
    await new Promise(res => setTimeout(res, 400));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const idx = out.indexOf('{');
    const last = out.lastIndexOf('}');
    const jsonStr = out.slice(idx, last + 1);
    const parsed = JSON.parse(jsonStr);
    expect(code).toBe(0);
    expect(Array.isArray(parsed.rows)).toBe(true);
  });

  test('find next equinox and solstice print results', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
    term.write('find next equinox\r');
    await new Promise(res => setTimeout(res, 300));
    term.write('find next solstice\r');
    await new Promise(res => setTimeout(res, 500));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/NEXT EQUINOX/i);
    expect(clean).toMatch(/NEXT SOLSTICE/i);
  });

  test('sync control shows friendly error when control API unreachable', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    // Point API base at an unreachable port and provide a dummy control token
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: {
        ...process.env,
        ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1',
        ANTIKYTHERA_API_BASE: 'http://127.0.0.1:65535',
        ANTIKYTHERA_CONTROL_TOKEN: 'dummy-token'
      }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('sync control\r');
    await new Promise(res => setTimeout(res, 800));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/Control status request failed \(cannot reach control API\)/i);
    expect(clean).toMatch(/Ensure server is running \(npm start\) and control token is configured\./i);
  });

  test('next eclipse and next opposition handle API availability gracefully', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: {
        ...process.env,
        ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1',
        ANTIKYTHERA_API_BASE: 'http://127.0.0.1:65535'
      }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 150));
    term.write('next eclipse\r');
    await new Promise(res => setTimeout(res, 400));
    term.write('next opposition mars\r');
    await new Promise(res => setTimeout(res, 400));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    const hasUnavailable = /✗ API unavailable \(timeout or error\)/i.test(clean);
    if (hasUnavailable) {
      expect(clean).toMatch(/Try: set source local or start server: npm start/i);
    } else {
      // When API is up, we should see normal event output
      expect(clean).toMatch(/NEXT ECLIPSE/i);
      expect(clean).toMatch(/NEXT OPPOSITION/i);
    }
  });

  test.skip('auto source prints fallback message when API unavailable', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 120));
    term.write('set source auto\r');
    await new Promise(res => setTimeout(res, 120));
    term.write('moon\r');
    await new Promise(res => setTimeout(res, 400));
    term.write('exit\r');

    const code = await new Promise(resolve => term.onExit(({ exitCode }) => resolve(exitCode)));
    const clean = stripAnsi(out);
    expect(code).toBe(0);
    expect(clean).toMatch(/API timeout\.\.\. Falling back to local engine/i);
  });
});
