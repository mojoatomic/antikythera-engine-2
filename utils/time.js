// Time utilities (UTC-safe) for Antikythera Engine 2
// Centralize all date math to avoid DST-related bugs and ensure smooth, fractional values

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Parse an ISO-like string into a Date, with support for extended years
 * including year 0 and negative (BCE) years.
 *
 * Strategy:
 * - First, let the built-in Date parser handle normal CE inputs.
 * - If that fails, fall back to a strict UTC parser that understands
 *   leading sign and 1–4 digit years, e.g. "-490-09-12T06:00:00Z".
 */
function parseISODate(input) {
  const str = String(input).trim();

  // Fast path: native parser for most modern CE dates, offsets, etc.
  const native = new Date(str);
  if (!isNaN(native.getTime())) return native;

  // Extended form with explicit UTC 'Z' and signed year, e.g. -490-09-12T06:00:00Z
  const m = str.match(/^(-?\d{1,4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?Z$/);
  if (!m) {
    throw new Error('Invalid ISO time');
  }

  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10); // 1-12
  const day = parseInt(m[3], 10);
  const hour = parseInt(m[4], 10);
  const minute = parseInt(m[5], 10);
  const second = m[6] ? parseInt(m[6], 10) : 0;
  const ms = m[7] ? Math.round(parseFloat(m[7]) * 1000) : 0;

  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  d.setUTCHours(hour, minute, second, ms);

  if (isNaN(d.getTime())) {
    throw new Error('Invalid ISO time');
  }
  return d;
}

function utcStartOfDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcEndOfDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function utcNoon(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0));
}

function startOfYear(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function endOfYear(date) {
  return new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1));
}

function yearLengthDays(date) {
  return (endOfYear(date) - startOfYear(date)) / MS_PER_DAY; // 365 or 366
}

function fractionalDayOfYear(date) {
  return (date - startOfYear(date)) / MS_PER_DAY + 1; // 1..366 (fractional)
}

function yearProgress360(date) {
  const daysIntoYear = (date - startOfYear(date)) / MS_PER_DAY;
  const length = yearLengthDays(date);
  return (daysIntoYear / length) * 360; // 0..360 (fractional)
}

function sameUtcDate(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

module.exports = {
  MS_PER_DAY,
  parseISODate,
  utcStartOfDay,
  utcEndOfDay,
  utcNoon,
  startOfYear,
  endOfYear,
  yearLengthDays,
  fractionalDayOfYear,
  yearProgress360,
  sameUtcDate,
};
