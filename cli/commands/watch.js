const { getData } = require('../sources');
const chalk = require('chalk');

const VALID_BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

let previousData = null;

async function watch(body, options) {
  try {
    // Validate body if specified
    if (body && !VALID_BODIES.includes(body.toLowerCase())) {
      console.error(chalk.red(`Invalid body: ${body}`));
      console.error(chalk.yellow(`Valid bodies: ${VALID_BODIES.join(', ')}`));
      process.exit(1);
    }

    const interval = parseInt(options.interval, 10);
    
    console.log(chalk.cyan.bold(`\n=== WATCHING ${body ? body.toUpperCase() : 'ALL'} ===`));
    console.log(chalk.gray(`Update interval: ${interval}ms`));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));

    // Initial display
    await displayUpdate(body, options);

    // Set up interval
    setInterval(async () => {
      await displayUpdate(body, options);
    }, interval);

  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

async function displayUpdate(body, options) {
  try {
    const observer = (isFinite(options.lat) && isFinite(options.lon)) ? {
      latitude: Number(options.lat),
      longitude: Number(options.lon),
      elevation: isFinite(options.elev) ? Number(options.elev) : undefined,
    } : null;
    const data = await getData(new Date(), { ...options, observer });
    
    if (body) {
      // Watch specific body
      const bodyData = body.toLowerCase() === 'sun' || body.toLowerCase() === 'moon'
        ? data[body.toLowerCase()]
        : data.planets[body.toLowerCase()];
      
      if (!bodyData) return;
      
      const longitude = bodyData.longitude;
      const timestamp = new Date().toISOString();
      
      // Calculate delta if we have previous data
      let deltaStr = '';
      if (previousData && previousData.longitude !== undefined) {
        const delta = longitude - previousData.longitude;
        const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
        const color = Math.abs(delta) > 0.001 ? chalk.yellow : chalk.gray;
        deltaStr = color(` ${arrow} ${delta.toFixed(6)}°`);
      }
      
      console.log(`${chalk.gray(timestamp)} ${chalk.cyan(body.toUpperCase())}: ${chalk.bold(longitude.toFixed(6))}°${deltaStr}`);
      
      previousData = bodyData;
    } else {
      // Watch all - compact display
      const timestamp = new Date().toISOString();
      const sun = data.sun.longitude.toFixed(3);
      const moon = data.moon.longitude.toFixed(3);
      const mars = data.planets.mars.longitude.toFixed(3);
      
      console.log(`${chalk.gray(timestamp)} ${chalk.yellow('SUN')}: ${sun}° ${chalk.white('MOON')}: ${moon}° ${chalk.red('MARS')}: ${mars}°`);
    }
    
  } catch (error) {
    console.error(chalk.red('Update failed:'), error.message);
  }
}

module.exports = watch;
