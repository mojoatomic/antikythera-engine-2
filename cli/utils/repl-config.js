const fs = require('fs');
const os = require('os');
const path = require('path');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function getBaseDir() {
  const xdg = process.env.XDG_CONFIG_HOME;
  const appdata = process.env.APPDATA;
  const home = os.homedir();
  if (xdg) return path.join(xdg, 'antikythera');
  if (appdata) return path.join(appdata, 'antikythera');
  return path.join(home, '.config', 'antikythera');
}

function getHistoryPath() {
  return path.join(getBaseDir(), 'history');
}

function getContextPath() {
  return path.join(getBaseDir(), 'repl.json');
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return null;
  }
}

function writeJsonAtomic(p, obj) {
  const dir = path.dirname(p);
  ensureDir(dir);
  const tmp = p + '.tmp';
  const data = JSON.stringify(obj, null, 2);
  try {
    fs.writeFileSync(tmp, data, 'utf8');
    fs.renameSync(tmp, p);
  } finally {
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
  }
}

function loadContext() {
  const p = getContextPath();
  const json = readJsonSafe(p) || {};
  const ctx = {
    version: 1,
    format: 'table',
    source: 'auto',
    tz: 'auto',
    lastBody: 'moon',
    lastDate: new Date().toISOString(),
    ...json
  };
  return ctx;
}

function saveContext(ctx) {
  writeJsonAtomic(getContextPath(), ctx);
}

function loadHistory() {
  try {
    const raw = fs.readFileSync(getHistoryPath(), 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    // Cap to 1000 on load
    return lines.slice(-1000);
  } catch (_) {
    return [];
  }
}

function saveHistory(rl) {
  try {
    const lines = Array.isArray(rl.history) ? rl.history.slice().reverse() : [];
    const capped = lines.slice(-1000);
    ensureDir(getBaseDir());
    fs.writeFileSync(getHistoryPath(), capped.join(os.EOL) + os.EOL, 'utf8');
  } catch (_) {}
}

module.exports = {
  getHistoryPath,
  loadContext,
  saveContext,
  loadHistory,
  saveHistory
};