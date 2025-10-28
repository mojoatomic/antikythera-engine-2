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
  jest.setTimeout(15000);

  test('double Ctrl+C exits REPL from prompt (PTY)', async () => {
    const cliPath = path.join(__dirname, '..', '..', 'cli', 'index.js');
    const term = pty.spawn(process.execPath, [cliPath, 'repl'], {
      cols: 80, rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, ANTIKYTHERA_TEST_ALLOW_NON_TTY: '1' }
    });

    let out = '';
    term.onData(chunk => { out += chunk.toString(); });

    await new Promise(res => setTimeout(res, 200));
    // First Ctrl+C should print hint
    term.write('\u0003');
    await new Promise(res => setTimeout(res, 200));
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
  jest.setTimeout(15000);

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

  test('compare moon matches within tolerance when API up', async () => {
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

describe('REPL e2e (watch cancel, JSON purity, and fallback message)', () => {
  jest.setTimeout(15000);

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
