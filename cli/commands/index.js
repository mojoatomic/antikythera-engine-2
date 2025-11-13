// Unified command registry (initial scaffold)
// NOTE: This registry is not wired by default. CLI/REPL may opt-in via adapters behind a flag.

// Existing implementation functions
const nowImpl = require('../commands/now');
const compareImpl = require('../commands/compare');
const positionImpl = require('../commands/position');
const watchImpl = require('../commands/watch');
const validateImpl = require('../commands/validate');
const controlImpl = require('../commands/control');

// Helper to normalize options from adapters
function normalizeOptions(opts) {
  return opts || {};
}

const commands = [
  {
    name: 'now',
    description: 'Show current astronomical state',
    arguments: [],
    options: [
      { flag: '--format <type>', description: 'Output format (table|json|csv)', default: 'table' },
      { flag: '--debug', description: 'Show debug information' },
      { flag: '--local', description: 'Use embedded engine' },
      { flag: '--remote', description: 'Force API connection' },
      { flag: '--lat <num>', description: 'Observer latitude' },
      { flag: '--lon <num>', description: 'Observer longitude' },
      { flag: '--elev <num>', description: 'Observer elevation (meters)' }
    ],

    // Core business logic for now()
    async execute(args, _context) {
      // Reuse existing implementation; Commander normally passes only options
      const opts = normalizeOptions(args);
      await nowImpl(opts);
    },

    async handleCLI(args, _context) {
      return this.execute(args, _context);
    },

    async handleREPL(args, _context) {
      // REPL can choose to print result differently if execute returns a value
      return this.execute(args, _context);
    }
  },
  {
    name: 'compare',
    description: 'Compare calculations from different sources (cli|api|engine|local)',
    arguments: [
      { name: 'body', required: true },
      { name: 'source1', required: true },
      { name: 'source2', required: true }
    ],
    options: [
      { flag: '--date <iso>', description: 'Date to compare', default: new Date().toISOString() },
      { flag: '--format <type>', description: 'Output format (table|json)', default: 'table' },
      { flag: '--lat <num>', description: 'Observer latitude' },
      { flag: '--lon <num>', description: 'Observer longitude' },
      { flag: '--elev <num>', description: 'Observer elevation (meters)' }
    ],
    async execute(args, _context) {
      const { body, source1, source2, ...opts } = args;
      await compareImpl(body, source1, source2, opts);
    },
    async handleCLI(args, _context) {
      return this.execute(args, _context);
    },
    async handleREPL(args, _context) {
      return this.execute(args, _context);
    }
  },
  {
    name: 'position',
    description: 'Get position of celestial body (sun, moon, mercury, venus, mars, jupiter, saturn)',
    arguments: [ { name: 'body', required: true } ],
    options: [
      { flag: '--date <iso>', description: 'Date (ISO 8601 format)', default: new Date().toISOString() },
      { flag: '--format <type>', description: 'Output format (table|json|csv)', default: 'table' },
      { flag: '--debug', description: 'Show calculation steps' },
      { flag: '--verbose', description: 'Include raw data' },
      { flag: '--profile', description: 'Show timing information' },
      { flag: '--local', description: 'Use embedded engine' },
      { flag: '--remote', description: 'Force API connection' },
      { flag: '--lat <num>', description: 'Observer latitude' },
      { flag: '--lon <num>', description: 'Observer longitude' },
      { flag: '--elev <num>', description: 'Observer elevation (meters)' }
    ],
    async execute(args, _context) {
      const { body, ...opts } = args;
      await positionImpl(body, opts);
    },
    async handleCLI(args, _context) {
      return this.execute(args, _context);
    },
    async handleREPL(args, _context) {
      return this.execute(args, _context);
    }
  },
  {
    name: 'watch',
    description: 'Watch live updates of astronomical positions',
    arguments: [ { name: 'body', required: false } ],
    options: [
      { flag: '--interval <ms>', description: 'Update interval in milliseconds', default: '1000' },
      { flag: '--compare', description: 'Show comparison with API' },
      { flag: '--format <type>', description: 'Output format (table|json)', default: 'table' },
      { flag: '--lat <num>', description: 'Observer latitude' },
      { flag: '--lon <num>', description: 'Observer longitude' },
      { flag: '--elev <num>', description: 'Observer elevation (meters)' }
    ],
    async execute(args, _context) {
      const { body, ...opts } = args;
      await watchImpl(body, opts);
    },
    async handleCLI(args, _context) {
      return this.execute(args, _context);
    },
    async handleREPL(args, _context) {
      return this.execute(args, _context);
    }
  },
  {
    name: 'validate',
    description: 'Validate calculations over date range',
    arguments: [],
    options: [
      { flag: '--from <iso>', description: 'Start date' },
      { flag: '--to <iso>', description: 'End date' },
      { flag: '--suite <name>', description: 'Test suite to run (dst, leap-year, full)', default: 'dst' },
      { flag: '--format <type>', description: 'Output format (table|json)', default: 'table' }
    ],
    async execute(args, _context) {
      await validateImpl(args);
    },
    async handleCLI(args, _context) { return this.execute(args, _context); },
    async handleREPL(args, _context) { return this.execute(args, _context); }
  },
  {
    name: 'control',
    description: 'Classroom control: time | run | pause | animate | scene | location | stop | status',
    arguments: [
      { name: 'action', required: true },
      { name: 'value', required: false }
    ],
    options: [
      { flag: '--from <iso>', description: 'Animation start ISO' },
      { flag: '--to <iso>', description: 'Animation end ISO' },
      { flag: '--speed <Nx>', description: 'Animation speed multiplier (default 1)' },
      { flag: '--preset <name>', description: 'Scene preset name' },
      { flag: '--bodies <list>', description: 'Comma-separated bodies list for scene' },
      { flag: '--timezone <tz>', description: 'IANA timezone (e.g., Europe/Athens)' },
      { flag: '--elevation <m>', description: 'Elevation (meters) for control location' },
      { flag: '--name <str>', description: 'Friendly location name' },
      { flag: '--date <iso>', description: 'Time ISO (alias for time action)' },
      { flag: '--iso <iso>', description: 'Alias for --date' },
      { flag: '--coords <lat,lon>', description: 'Alias for location coords if value omitted' }
    ],
    async execute(args, context) {
      const { action, value, ...opts } = args;
      const adapter = (context && context.adapter) ? context.adapter : 'cli';
      await controlImpl(action, value, { ...opts, __adapter: adapter });
    },
    async handleCLI(args, context) { return this.execute(args, context); },
    async handleREPL(args, context) { return this.execute(args, context); }
  }
];

module.exports = { commands };
