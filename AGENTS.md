# AI Coding Rules

**Project**: CLI tool
**Domains**: astronomy, cli, repl
**Priority**: astronomy > cli > repl
**Tech Stack**: Node.js >=18.0.0, CLI

---

## Naming
- Style: camelCase
- Booleans: isX/hasX/shouldX/canX
- Async: fetchX/loadX/saveX

## Guidance
- Use @domain/@domains annotations for ambiguous constants
- Prefer constants/terms from active domains

## Domain: astronomy

### Constants
```javascript
const TROPICAL_YEAR_DAYS = 365.25; // Mean tropical year in days
const SYNODIC_MONTH_DAYS = 29.53059; // Lunar synodic month in days
const SIDEREAL_MONTH_DAYS = 27.32166; // Moon sidereal month in days
const EARTH_AXIAL_TILT_DEG = 23.43; // Obliquity of the ecliptic (deg, approx)
```

### Terminology
- longitude
- latitude
- ecliptic
- equinox
- solstice
- aphelion
- perihelion
- ascending
- descending
- node
- orbital
- orbit
- kepler
- ephemeris
- elements


## Architecture Guidelines

## File Organization

**Pattern**: feature-based (group by feature, not type)

**Example Structure**:
```
project/
  bin/
    cli.js              # Entry point (50-100 lines)
  lib/
    commands/           # CLI commands
      init/
        index.js        # Orchestrator
        interactive.js  # User prompts
      learn/
        index.js
        scanner.js
    generators/         # File generators
      eslint-config.js
      agents-md.js
    utils/              # Shared helpers
      file-writer.js
      version.js
  tests/              # Tests (co-located or here)
```

**Avoid (Type-based)**:
```
❌ lib/
    controllers/        # Groups by layer
    services/           # Hard to find features
    models/
    views/
```

## File Length Limits

| File Type | Max Lines | Rationale |
|-----------|-----------|-----------|
| CLI entry | 100 | Routing only |
| Commands  | 150 | Orchestration |
| Utilities | 200 | Single purpose |
| Generators| 250 | Template logic |
| Components| 300 | UI complexity |
| Tests     | ∞ | No limit |
| Default   | 250 | General files |

**Function Limits:**
- Max length: 50 lines
- Max complexity: 10
- Max depth: 4
- Max parameters: 4
- Max statements: 30

**Code Patterns:**
- CLI style: orchestration-shell
- Error handling: explicit
- Async style: async-await


## Code Patterns

### CLI Style
```javascript
// ✅ Good: Orchestration shell
async function main() {
  const args = parseArgs(process.argv);
  const command = commands[args._[0]];
  await command(process.cwd(), args);
}

// ❌ Bad: Business logic in CLI
async function main() {
  // 200 lines of logic here
}
```

### Error Handling
```javascript
// ✅ Explicit
try {
  await riskyOperation();
} catch (err) {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
}

// ❌ Silent
try {
  await riskyOperation();
} catch {} // ❌ No error handling
```

### Async Style
```javascript
// ✅ async/await
async function loadData() {
  const data = await fetchData();
  return process(data);
}

// ❌ Callbacks or raw promises
function loadData(callback) {
  fetchData().then(data => callback(null, data));
}
```

## Import/Export Conventions

**Current**: CommonJS (`require`/`module.exports`)

```javascript
// ✅ Named imports (CommonJS)
const { foo, bar } = require('./utils');

// ✅ Module exports
module.exports = { foo, bar };

// ✅ Single export (entry points)
module.exports = main;
function main() {}

// ✅ Alphabetize imports
const { a, b, c } = require('./foo');
const { x, y, z } = require('./bar');

// ❌ Avoid mixing module systems
const foo = require('./foo');
export const bar = 'bar';  // ❌ Don't mix CommonJS + ES modules
```

**Note**: Planning migration to ES modules (see issue #112)

## Test Conventions

**Location**: Co-locate or `tests/` directory
```
foo.js
foo.test.js  ✅
```

**Naming**:
```javascript
// ✅ Descriptive
test('loads config from .ai-coding-guide.json', () => {});

// ❌ Vague
test('it works', () => {});
```

**Note**: Test files exempt from line/complexity limits

## Documentation

**Required**:
- JSDoc for public functions
- README.md in feature directories
- Examples for complex logic

**Example**:
```javascript
/**
 * Generate ESLint config from domain configuration
 * @param {Object} config - Domain configuration
 * @param {Object} domains - Available domains
 * @returns {string} ESLint config file content
 */
export async function generateEslintConfig(config, domains) {
  // ...
}
```

## Anti-Patterns

**Avoid:**
- ❌ **Monolithic files** (>250 lines) - Split into smaller modules
- ❌ **Long functions** (>50 lines) - Extract helper functions
- ❌ **Deep nesting** (>4 levels) - Early returns or separate functions
- ❌ **Silent errors** - Always log/handle errors explicitly
- ❌ **Global state** - Use parameters and return values
- ❌ **Magic numbers** - Use named constants
- ❌ **Generic names** - Avoid: `data`, `result`, `state`, `list`


## Ambiguity Tactics
- Prefer explicit @domain/@domains on ambiguous constants
- Use name cues (e.g., 'circleAngleDegrees')
- Project-wide mapping via .ai-coding-guide.json → constantResolution

---
*For machine-readable format, see .ai-coding-guide.json*
