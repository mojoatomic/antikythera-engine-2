const Table = require('cli-table3');
const chalk = require('chalk');

/**
 * Format data as table
 */
function formatTable(data) {
  const table = new Table({
    head: [chalk.cyan('Property'), chalk.cyan('Value')],
    colWidths: [30, 50]
  });
  
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      table.push([chalk.bold(key), chalk.gray('(see details)')]);
      Object.entries(value).forEach(([subKey, subValue]) => {
        table.push([
          `  ${subKey}`,
          typeof subValue === 'number' ? subValue.toFixed(3) : String(subValue)
        ]);
      });
    } else {
      table.push([
        chalk.bold(key),
        typeof value === 'number' ? value.toFixed(3) : String(value)
      ]);
    }
  });
  
  return table.toString();
}

/**
 * Format data as JSON
 */
function formatJSON(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Format data as CSV
 */
function formatCSV(data) {
  const rows = [];
  
  function flatten(obj, prefix = '') {
    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flatten(value, fullKey);
      } else {
        rows.push([fullKey, value]);
      }
    });
  }
  
  flatten(data);
  
  // Add header
  const output = ['Property,Value'];
  rows.forEach(([key, value]) => {
    output.push(`${key},${value}`);
  });
  
  return output.join('\n');
}

/**
 * Format based on type
 */
function format(data, type = 'table') {
  switch (type.toLowerCase()) {
    case 'json':
      return formatJSON(data);
    case 'csv':
      return formatCSV(data);
    case 'table':
    default:
      return formatTable(data);
  }
}

module.exports = {
  format,
  formatTable,
  formatJSON,
  formatCSV
};
