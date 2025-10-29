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
    
    // Derive local times for sunrise/sunset if timezone provided
    try {
      const tz = data?.observer?.timezone;
      const sv = data?.sunVisibility;
      if (tz && sv) {
        const fmt = (iso) => new Date(iso).toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
        if (sv.sunrise?.time) sv.sunrise.local = fmt(sv.sunrise.time);
        if (sv.sunset?.time) sv.sunset.local = fmt(sv.sunset.time);
      }
    } catch (_) {}

    console.log(format(data, options.format));
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

module.exports = now;
