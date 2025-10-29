const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN_FILE = path.join(process.cwd(), '.antikythera', 'control-token');

function getOrCreateControlToken() {
  // Priority 1: Environment variable (for production/override)
  const envToken = process.env.ANTIKYTHERA_CONTROL_TOKEN || process.env.CONTROL_TOKEN;
  if (envToken && String(envToken).trim().length > 0) {
    return String(envToken).trim();
  }

  // Priority 2: Existing local file (REUSE across restarts)
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const v = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
      if (v) {
        console.log('✓ Using control token from:', TOKEN_FILE);
        return v;
      }
    }
  } catch (err) {
    console.warn('⚠ Could not read token file:', err && err.message ? err.message : String(err));
  }

  // Priority 3: Generate NEW token ONLY if file doesn't exist
  const token = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
    fs.writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
    console.log('✓ Generated NEW control token:', TOKEN_FILE);
    console.log('  Token will persist across restarts');
  } catch (_err) {
    console.warn('⚠ Could not save token, using in-memory only');
    console.warn('  Set ANTIKYTHERA_CONTROL_TOKEN env var for persistence');
  }
  return token;
}

module.exports = { getOrCreateControlToken, TOKEN_FILE };