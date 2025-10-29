const axios = require('axios');
const chalk = require('chalk');

function baseURL() {
  const host = process.env.ANTIKYTHERA_API_BASE || 'http://localhost:3000';
  return host.replace(/\/$/, '');
}

function authHeader() {
  const token = process.env.CONTROL_TOKEN || process.env.ANTIKYTHERA_CONTROL_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
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

module.exports = async function control(action, value, options) {
  try {
    const act = String(action || '').toLowerCase();
    if (!act) {
      console.log(chalk.cyan('Usage: control time <ISO> | control animate --from <ISO> --to <ISO> [--speed <Nx>] | control scene --preset <name> [--bodies a,b,c] | control stop | control status'));
      return;
    }
    if (act === 'time') {
      const iso = value || options.date || options.iso;
      if (!iso) return console.log(chalk.red('Provide time ISO: control time <ISO>'));
      const out = await post('/api/control/time', { date: iso });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (act === 'animate') {
      const { from, to } = options;
      const speed = options.speed ? Number(options.speed) : undefined;
      if (!from || !to) return console.log(chalk.red('Usage: control animate --from <ISO> --to <ISO> [--speed <Nx>]'));
      const out = await post('/api/control/animate', { from, to, speed });
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    if (act === 'scene') {
      const { preset } = options;
      const bodies = options.bodies || undefined;
      if (!preset) return console.log(chalk.red('Usage: control scene --preset <name> [--bodies a,b,c]'));
      const out = await post('/api/control/scene', { preset, bodies });
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
    console.log(chalk.red('Unknown control action. Use: time | animate | scene | stop | status'));
  } catch (err) {
    const msg = err?.response?.data?.error || err.message;
    console.error(chalk.red('Error:'), msg);
    if (String(msg || '').includes('Control authentication')) {
      console.error(chalk.gray('Set CONTROL_TOKEN env var and pass token via Authorization: Bearer'));
    }
    process.exit(1);
  }
};