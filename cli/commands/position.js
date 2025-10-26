const { getData } = require('../sources');
const { format } = require('../formatters');
const chalk = require('chalk');

const VALID_BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

async function position(body, options) {
  try {
    // Validate body
    if (!VALID_BODIES.includes(body.toLowerCase())) {
      console.error(chalk.red(`Invalid body: ${body}`));
      console.error(chalk.yellow(`Valid bodies: ${VALID_BODIES.join(', ')}`));
      process.exit(1);
    }
    
    const date = new Date(options.date);
    const startTime = Date.now();
    const data = await getData(date, options);
    const endTime = Date.now();
    
    // Extract body data
    const bodyData = body.toLowerCase() === 'sun' || body.toLowerCase() === 'moon' 
      ? data[body.toLowerCase()]
      : data.planets[body.toLowerCase()];
    
    if (!bodyData) {
      console.error(chalk.red(`No data for ${body}`));
      process.exit(1);
    }
    
    // Debug output
    if (options.debug) {
      console.log(chalk.cyan.bold(`=== DEBUG: ${body.toUpperCase()} ===`));
      console.log(chalk.gray(`Date: ${date.toISOString()}`));
      console.log(chalk.gray(`Source: ${options.local ? 'embedded engine' : options.remote ? 'API' : 'auto'}`));
      console.log();
    }
    
    // Verbose output
    if (options.verbose) {
      console.log(chalk.yellow('Raw data:'));
      console.log(format(bodyData, 'json'));
      console.log();
    }
    
    // Profile output
    if (options.profile) {
      console.log(chalk.gray(`Calculation time: ${endTime - startTime}ms`));
      console.log();
    }
    
    // Main output
    console.log(format(bodyData, options.format));
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    if (options.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

module.exports = position;
