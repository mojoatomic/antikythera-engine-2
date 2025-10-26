// Time utilities (UTC-safe) for Antikythera Engine 2
// Centralize all date math to avoid DST-related bugs and ensure smooth, fractional values

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
