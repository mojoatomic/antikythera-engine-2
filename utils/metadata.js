const { execSync } = require('child_process');
const path = require('path');

function readPackageJson() {
  try {
    // Resolve package.json from project root
    // __dirname is utils/, package.json is one level up
    // Avoid require cache to allow runtime updates if any
    return require(path.join(__dirname, '..', 'package.json'));
  } catch (_e) {
    return { version: '0.0.0', dependencies: {} };
  }
}

function getGitSha() {
  if (process.env.GIT_SHA && String(process.env.GIT_SHA).trim()) {
    return String(process.env.GIT_SHA).trim();
  }
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (_err) {
    return 'unknown';
  }
}

function getEngineVersion(pkg) {
  const dep = pkg.dependencies && pkg.dependencies['astronomy-engine'];
  if (!dep) return 'astronomy-engine vunknown';
  const cleaned = dep.replace(/^[^0-9]*/, '');
  return `astronomy-engine v${cleaned}`;
}

const pkg = readPackageJson();

module.exports = {
  API_VERSION: pkg.version || '0.0.0',
  ENGINE_VERSION: getEngineVersion(pkg),
  GIT_SHA: getGitSha(),
};
