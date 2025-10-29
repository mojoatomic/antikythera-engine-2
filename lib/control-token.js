const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN_FILE = path.join(process.cwd(), '.antikythera', 'control-token');

function getOrCreateControlToken() {
  // Priority 1: Environment variable (for production/shared classrooms)
  const envToken = process.env.ANTIKYTHERA_CONTROL_TOKEN || process.env.CONTROL_TOKEN;
  if (envToken && String(envToken).trim().length > 0) return String(envToken).trim();

  // Priority 2: Local file (for development)
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const v = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
      if (v) return v;
    }
  } catch (_) {}

  // Priority 3: Generate and save
  const token = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
    fs.writeFileSync(TOKEN_FILE, token + '\n', { mode: 0o600 });
    console.log('✓ Generated control token:', TOKEN_FILE);
    console.log('  Token:', token);
  } catch (_err) {
    console.warn('⚠ Could not save token, using memory only');
  }
  return token;
}

module.exports = { getOrCreateControlToken, TOKEN_FILE };