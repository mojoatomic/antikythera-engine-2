const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(process.cwd(), '.antikythera', 'control-token');

function getControlToken() {
  const envToken = process.env.ANTIKYTHERA_CONTROL_TOKEN || process.env.CONTROL_TOKEN;
  if (envToken && String(envToken).trim().length > 0) return String(envToken).trim();
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const v = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
      if (v) return v;
    }
  } catch (_) {}
  return null;
}

function requireControlToken() {
  const token = getControlToken();
  if (!token) {
    console.error('✗ Control token not found');
    console.error('  Start the server first: npm start');
    console.error('  Or set: export ANTIKYTHERA_CONTROL_TOKEN=your-token');
    process.exit(1);
  }
  return token;
}

module.exports = { getControlToken, requireControlToken, TOKEN_FILE };