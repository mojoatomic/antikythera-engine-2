#!/usr/bin/env node

const { Command } = require('commander');
const { version, description } = require('../package.json');
const { registerCLICommands } = require('./adapters/cli-adapter');
const { commands } = require('./commands');
const cmdRepl = require('./commands/repl');

const program = new Command();

program
  .name('antikythera')
  .description(description)
  .version(version);

// Register all core CLI commands via unified registry
registerCLICommands(program, commands);

// REPL command - interactive shell (kept as a separate entry)
program
  .command('repl')
  .description('Start interactive REPL mode')
  .action(cmdRepl);

program.parse(process.argv);
