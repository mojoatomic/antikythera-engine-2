const chalk = require('chalk');

async function validate(options) {
  console.log(chalk.yellow('Validate command coming soon!'));
  console.log(chalk.gray(`Will run ${options.suite} test suite`));
}

module.exports = validate;
