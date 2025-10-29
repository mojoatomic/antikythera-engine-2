#!/usr/bin/env node

const { Command } = require('commander');
const { version, description } = require('../package.json');

const program = new Command();

// Import commands
const cmdNow = require('./commands/now');
const cmdPosition = require('./commands/position');
const cmdWatch = require('./commands/watch');
const cmdCompare = require('./commands/compare');
const cmdValidate = require('./commands/validate');
const cmdRepl = require('./commands/repl');

program
  .name('antikythera')
  .description(description)
  .version(version);

// Now command - current astronomical state
program
  .command('now')
  .description('Show current astronomical state')
  .option('--format <type>', 'Output format (table, json, csv)', 'table')
  .option('--debug', 'Show debug information')
  .option('--local', 'Use embedded engine')
  .option('--remote', 'Force API connection')
  .option('--lat <num>', 'Observer latitude')
  .option('--lon <num>', 'Observer longitude')
  .option('--elev <num>', 'Observer elevation (meters)')
  .action(cmdNow);

// Position command - specific body position
program
  .command('position <body>')
  .description('Get position of celestial body (sun, moon, mercury, venus, mars, jupiter, saturn)')
  .option('--date <iso>', 'Date (ISO 8601 format)', new Date().toISOString())
  .option('--format <type>', 'Output format (table, json, csv)', 'table')
  .option('--debug', 'Show calculation steps')
  .option('--verbose', 'Include raw data')
  .option('--profile', 'Show timing information')
  .option('--local', 'Use embedded engine')
  .option('--remote', 'Force API connection')
  .option('--lat <num>', 'Observer latitude')
  .option('--lon <num>', 'Observer longitude')
  .option('--elev <num>', 'Observer elevation (meters)')
  .action(cmdPosition);

// Watch command - live updates
program
  .command('watch [body]')
  .description('Watch live updates of astronomical positions')
  .option('--interval <ms>', 'Update interval in milliseconds', '1000')
  .option('--compare', 'Show comparison with API')
  .option('--format <type>', 'Output format (table, json)', 'table')
  .option('--lat <num>', 'Observer latitude')
  .option('--lon <num>', 'Observer longitude')
  .option('--elev <num>', 'Observer elevation (meters)')
  .action(cmdWatch);

// Compare command - compare sources
program
  .command('compare <body> <source1> <source2>')
  .description('Compare calculations from different sources (cli, api, snapshot)')
  .option('--date <iso>', 'Date to compare', new Date().toISOString())
  .option('--format <type>', 'Output format (table, json)', 'table')
  .option('--lat <num>', 'Observer latitude')
  .option('--lon <num>', 'Observer longitude')
  .option('--elev <num>', 'Observer elevation (meters)')
  .action(cmdCompare);

// Validate command - check for discontinuities
program
  .command('validate')
  .description('Validate calculations over date range')
  .option('--from <iso>', 'Start date')
  .option('--to <iso>', 'End date')
  .option('--suite <name>', 'Test suite to run (dst, leap-year, full)', 'dst')
  .option('--format <type>', 'Output format (table, json)', 'table')
  .action(cmdValidate);

// REPL command - interactive shell
program
  .command('repl')
  .description('Start interactive REPL mode')
  .action(cmdRepl);

program.parse(process.argv);
