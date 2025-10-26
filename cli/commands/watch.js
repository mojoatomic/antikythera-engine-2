const chalk = require('chalk');

async function watch(body, options) {
  console.log(chalk.yellow('Watch command coming soon!'));
  console.log(chalk.gray(`Will watch ${body || 'all'} with ${options.interval}ms interval`));
}

module.exports = watch;
