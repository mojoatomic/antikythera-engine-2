const chalk = require('chalk');

async function compare(body, source1, source2, options) {
  console.log(chalk.yellow('Compare command coming soon!'));
  console.log(chalk.gray(`Will compare ${body} from ${source1} vs ${source2}`));
}

module.exports = compare;
