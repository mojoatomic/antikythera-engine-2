#!/usr/bin/env node
'use strict';

// Thin wrapper to invoke the plugin's ratchet runner so reusable workflow fallback works.
// It forwards all CLI arguments to the plugin implementation.

const path = require('path');
const { spawnSync } = require('child_process');

const ratchetPath = path.join(
  process.cwd(),
  'node_modules',
  'eslint-plugin-ai-code-snifftest',
  'scripts',
  'ratchet.js'
);

const result = spawnSync(process.execPath, [ratchetPath, ...process.argv.slice(2)], {
  stdio: 'inherit'
});
process.exit(result.status || 0);