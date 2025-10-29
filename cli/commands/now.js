const { getData } = require('../sources');
const { format } = require('../formatters');
const chalk = require('chalk');

async function now(options) {
  try {
    const startTime = Date.now();
    const observer = (isFinite(options.lat) && isFinite(options.lon)) ? {
      latitude: Number(options.lat),
      longitude: Number(options.lon),
      elevation: isFinite(options.elev) ? Number(options.elev) : undefined,
    } : null;
    const data = await getData(new Date(), { ...options, observer });
    const endTime = Date.now();
    
    if (options.debug) {
      console.log(chalk.gray(`Source: ${options.local ? 'embedded engine' : options.remote ? 'API' : 'auto'}`));
      console.log(chalk.gray(`Time: ${endTime - startTime}ms`));
      console.log();
    }
    
    console.log(format(data, options.format));
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

module.exports = now;
