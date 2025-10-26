const { getFromEngine, getFromAPI } = require('../sources');
const chalk = require('chalk');
const Table = require('cli-table3');

const VALID_BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

async function compare(body, source1, source2, options) {
  try {
    // Validate body
    if (!VALID_BODIES.includes(body.toLowerCase())) {
      console.error(chalk.red(`Invalid body: ${body}`));
      console.error(chalk.yellow(`Valid bodies: ${VALID_BODIES.join(', ')}`));
      process.exit(1);
    }

    // Validate sources
    const validSources = ['cli', 'api', 'engine', 'local'];
    if (!validSources.includes(source1) || !validSources.includes(source2)) {
      console.error(chalk.red('Invalid sources'));
      console.error(chalk.yellow(`Valid sources: ${validSources.join(', ')}`));
      process.exit(1);
    }

    const date = new Date(options.date);
    
    console.log(chalk.cyan.bold(`\n=== COMPARE ${body.toUpperCase()} ===`));
    console.log(chalk.gray(`Date: ${date.toISOString()}\n`));

    // Get data from both sources
    const data1 = await getDataFromSource(source1, date);
    const data2 = await getDataFromSource(source2, date);

    // Extract body data
    const body1 = extractBodyData(data1, body);
    const body2 = extractBodyData(data2, body);

    if (!body1 || !body2) {
      console.error(chalk.red('Could not get data from one or both sources'));
      process.exit(1);
    }

    // Compare and display
    if (options.format === 'json') {
      console.log(JSON.stringify({ [source1]: body1, [source2]: body2, diff: calculateDiff(body1, body2) }, null, 2));
    } else {
      displayComparison(body, source1, source2, body1, body2);
    }

  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

async function getDataFromSource(source, date) {
  if (source === 'cli' || source === 'engine' || source === 'local') {
    return await getFromEngine(date);
  } else if (source === 'api') {
    return await getFromAPI(date);
  }
  throw new Error(`Unknown source: ${source}`);
}

function extractBodyData(data, body) {
  const bodyLower = body.toLowerCase();
  if (bodyLower === 'sun' || bodyLower === 'moon') {
    return data[bodyLower];
  }
  return data.planets?.[bodyLower];
}

function calculateDiff(data1, data2) {
  const diff = {};
  for (const key of Object.keys(data1)) {
    if (typeof data1[key] === 'number' && typeof data2[key] === 'number') {
      diff[key] = data2[key] - data1[key];
    }
  }
  return diff;
}

function displayComparison(body, source1, source2, data1, data2) {
  const table = new Table({
    head: [chalk.cyan('Property'), chalk.yellow(source1.toUpperCase()), chalk.green(source2.toUpperCase()), chalk.magenta('Δ Difference')],
    colWidths: [20, 20, 20, 20]
  });

  const diff = calculateDiff(data1, data2);

  for (const key of Object.keys(data1)) {
    if (typeof data1[key] === 'number' && typeof data2[key] === 'number') {
      const delta = diff[key];
      const deltaStr = delta > 0 ? chalk.red(`+${delta.toFixed(6)}`) : 
                       delta < 0 ? chalk.green(`${delta.toFixed(6)}`) : 
                       chalk.gray('0.000000');
      
      const match = Math.abs(delta) < 0.001;
      const status = match ? chalk.green('✓') : chalk.red('✗');
      
      table.push([
        key,
        data1[key].toFixed(6),
        data2[key].toFixed(6),
        `${deltaStr} ${status}`
      ]);
    }
  }

  console.log(table.toString());
  
  // Summary
  const allMatch = Object.values(diff).every(d => Math.abs(d) < 0.001);
  console.log();
  if (allMatch) {
    console.log(chalk.green.bold('✓ Sources match (within 0.001° tolerance)'));
  } else {
    console.log(chalk.red.bold('✗ Sources differ!'));
    const maxDiff = Math.max(...Object.values(diff).map(Math.abs));
    console.log(chalk.yellow(`  Maximum difference: ${maxDiff.toFixed(6)}°`));
  }
}

module.exports = compare;
