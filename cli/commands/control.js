const axios = require('axios');
const chalk = require('chalk');

function baseURL() {
  const host = process.env.ANTIKYTHERA_API_BASE || 'http://localhost:3000';
  return host.replace(/\/$/, '');
}

const { requireControlToken } = require('../lib/control-token');
function authHeader() {
  const token = requireControlToken();
  return { Authorization: `Bearer ${token}` };
}

async function post(path, body) {
  const url = `${baseURL()}${path}`;
  const res = await axios.post(url, body, { headers: { ...authHeader(), 'Content-Type': 'application/json' }, timeout: 5000 });
  return res.data;
}
async function get(path) {
  const url = `${baseURL()}${path}`;
  const res = await axios.get(url, { headers: { ...authHeader() }, timeout: 5000 });
  return res.data;
}

module.exports = async function control(action, value, options = {}) {
  const adapter = options.__adapter || 'cli';
  const safeOpts = { ...options };
  delete safeOpts.__adapter;
  try {
    const act = String(action || '').toLowerCase();
    if (!act) {
      console.log(chalk.cyan('Usage: control time <ISO> | control run [--speed N] | control pause | control animate --from <ISO> --to <ISO> [--speed <N>] | control scene --preset <name> [--bodies a,b,c] | control location <lat,lon> --timezone <tz> [--name <str>] [--elevation <m>] | control stop | control status'));
      return;
    }
    if (act === 'time') {
      const iso = value || options.date || options.iso;
      if (!iso) return console.log(chalk.red('Provide time ISO: control time <ISO>'));
      const out = await post('/api/control/time', { date: iso });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (act === 'run') {
      // Accept speed from --speed or bare numeric value; coerce negatives to positive per docs (speed > 0)
      let speed;
      if (options.speed !== undefined) {
        const n = Number(options.speed);
        speed = Number.isFinite(n) ? Math.abs(n) : undefined;
      } else if (value && /^-?\d+(\.\d+)?$/.test(String(value))) {
        const n = Number(value);
        speed = Number.isFinite(n) ? Math.abs(n) : undefined;
      }
      const out = await post('/api/control/run', { speed });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (act === 'pause') {
      const out = await post('/api/control/pause', {});
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (act === 'animate') {
      const { from, to } = safeOpts;
      let speed;
      if (safeOpts.speed !== undefined) {
        const n = Number(safeOpts.speed);
        speed = Number.isFinite(n) ? Math.abs(n) : undefined;
      }
      if (!from || !to) return console.log(chalk.red('Usage: control animate --from <ISO> --to <ISO> [--speed <Nx>]'));
      const out = await post('/api/control/animate', { from, to, speed });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (act === 'scene') {
      const { preset } = safeOpts;
      const bodies = safeOpts.bodies || undefined;
      if (!preset) return console.log(chalk.red('Usage: control scene --preset <name> [--bodies a,b,c]'));
      const out = await post('/api/control/scene', { preset, bodies });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (act === 'location') {
      const coords = value || safeOpts.coords;
      if (!coords || !coords.includes(',')) return console.log(chalk.red('Usage: control location <lat,lon> --timezone <tz> [--name <str>] [--elevation <m>]'));
      const [latStr, lonStr] = coords.split(',');
      const lat = parseFloat(String(latStr).trim());
      const lon = parseFloat(String(lonStr).trim());
      const tz = safeOpts.timezone || safeOpts.tz;
      const name = safeOpts.name || undefined;
      const elevation = safeOpts.elevation !== undefined ? Number(safeOpts.elevation) : undefined;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return console.log(chalk.red('Invalid coordinates. Example: 37.98,23.73'));
      if (!tz) return console.log(chalk.red('Timezone required. Example: --timezone "Europe/Athens"'));
      const out = await post('/api/control/location', { latitude: lat, longitude: lon, elevation, timezone: tz, name });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (act === 'stop') {
      const out = await post('/api/control/stop', {});
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (act === 'status') {
      const out = await get('/api/control/status');
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    console.log(chalk.red('Unknown control action. Use: time | run | pause | animate | scene | location | stop | status'));
  } catch (err) {
    const status = err?.response?.status;
    const raw = err?.response?.data;
    let msg = err?.response?.data?.error || err.message || String(raw || '');
    if (!msg || msg === 'Error') {
      msg = `Control request failed${status ? ` (status ${status})` : ''}.`;
    }
    console.error(chalk.red('Error:'), msg);
    const msgStr = String(msg || '');
    if (msgStr.toLowerCase().includes('timezone')) {
      console.error(chalk.gray('Hint: use a valid IANA timezone like Europe/Athens. In the REPL, quotes are supported: --timezone "Europe/Athens"'));
    } else if (msgStr.toLowerCase().includes('latitude') || msgStr.toLowerCase().includes('longitude')) {
      console.error(chalk.gray('Hint: latitude must be between -90 and 90, longitude between -180 and 180. Example: 37.98,23.73'));
    }
    if (msgStr.includes('Control authentication') || status === 401 || status === 403) {
      console.error(chalk.gray('Set CONTROL_TOKEN env var and ensure the control API is running and reachable.'));
    }
    if (adapter === 'cli') {
      process.exit(1);
    }
    // In REPL, do not exit the whole process; just return control to the prompt
  }
};
