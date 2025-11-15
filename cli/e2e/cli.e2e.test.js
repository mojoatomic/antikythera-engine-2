const path = require('path');
const { spawnSync } = require('child_process');

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

function extractJson(stdout) {
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in CLI output');
  }
  const jsonStr = stdout.slice(start, end + 1);
  return JSON.parse(jsonStr);
}

describe('CLI unified registry + adapter', () => {
  test('now --format json returns valid JSON with key fields', () => {
    const { code, stdout, stderr } = runCli(['now', '--format', 'json']);
    expect(code).toBe(0);
    expect(stderr).toBe('');
    const data = extractJson(stdout);
    expect(typeof data).toBe('object');
    expect(data).toHaveProperty('date');
    expect(data).toHaveProperty('sun');
    expect(data).toHaveProperty('moon');
  });

  test('control location accepts negative latitude/longitude without unknown option error', () => {
    const { code, stderr } = runCli(
      [
        'control',
        'location',
        '-4.2333,-38.5000',
        '--timezone',
        'America/Fortaleza',
        '--name',
        'Sobral, Brazil'
      ],
      {
        ANTIKYTHERA_CONTROL_TOKEN: 'dummy-token',
        ANTIKYTHERA_API_BASE: 'http://127.0.0.1:65535'
      }
    );
    // We expect the command to reach our control handler (and likely fail with a network error),
    // but we must not see Commander complaining about an unknown option for the coordinates.
    expect(stderr).not.toMatch(/unknown option '-4\.2333,-38\.5000'/i);
    // When the handler runs, it should emit an Error: message from control.js
    expect(code).not.toBe(0);
    expect(stderr || '').toMatch(/Error:/i);
  });

  test('position moon --format json with explicit date works via adapter', () => {
    const { code, stdout } = runCli(['position', 'moon', '--format', 'json', '--date', '2025-01-01T00:00:00Z']);
    expect(code).toBe(0);
    const data = extractJson(stdout);
    expect(typeof data).toBe('object');
    expect(data).toHaveProperty('longitude');
    expect(data).toHaveProperty('latitude');
  });
});
