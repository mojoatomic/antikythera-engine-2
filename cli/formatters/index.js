const Table = require('cli-table3');
const chalk = require('chalk');

/**
 * Format data as table
 */
function formatTable(data) {
  const table = new Table({
    head: [chalk.cyan('Property'), chalk.cyan('Value')],
    colWidths: [34, 60]
  });

  // Recursively flatten object to key paths
  function flatten(obj, prefix = '') {
    const rows = [];
    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value instanceof Date) {
        rows.push([fullKey, value.toISOString()]);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        rows.push([fullKey, chalk.gray('(see details)')]);
        rows.push(...flatten(value, fullKey));
      } else {
        rows.push([fullKey, typeof value === 'number' ? value.toFixed(3) : String(value)]);
      }
    });
    return rows;
  }

  const rows = flatten(data);
  rows.forEach(([k, v]) => table.push([k, v]));

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
