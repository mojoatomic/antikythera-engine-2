const TimeUtils = require('./time');

const { parseISODate } = require('./time');

describe('TimeUtils', () => {
  describe('UTC date functions', () => {
    test('utcStartOfDay returns midnight UTC', () => {
      const date = new Date('2025-03-15T14:30:00Z');
      const result = TimeUtils.utcStartOfDay(date);
      expect(result.toISOString()).toBe('2025-03-15T00:00:00.000Z');
    });

    test('utcEndOfDay returns 23:59:59.999 UTC', () => {
      const date = new Date('2025-03-15T14:30:00Z');
      const result = TimeUtils.utcEndOfDay(date);
      expect(result.toISOString()).toBe('2025-03-15T23:59:59.999Z');
    });

    test('utcNoon returns noon UTC', () => {
      const date = new Date('2025-03-15T14:30:00Z');
      const result = TimeUtils.utcNoon(date);
      expect(result.toISOString()).toBe('2025-03-15T12:00:00.000Z');
    });
  });

  describe('Year functions', () => {
    test('startOfYear returns Jan 1 midnight UTC', () => {
      const date = new Date('2025-06-15T14:30:00Z');
      const result = TimeUtils.startOfYear(date);
      expect(result.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });

    test('endOfYear returns next Jan 1 midnight UTC', () => {
      const date = new Date('2025-06-15T14:30:00Z');
      const result = TimeUtils.endOfYear(date);
      expect(result.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });

    test('yearLengthDays returns 365 for non-leap year', () => {
      const date = new Date('2025-06-15T00:00:00Z');
      expect(TimeUtils.yearLengthDays(date)).toBe(365);
    });

    test('yearLengthDays returns 366 for leap year', () => {
      const date = new Date('2024-06-15T00:00:00Z');
      expect(TimeUtils.yearLengthDays(date)).toBe(366);
    });
  });

  describe('Fractional calculations', () => {
    test('fractionalDayOfYear returns correct value for Jan 1', () => {
      const date = new Date('2025-01-01T00:00:00Z');
      expect(TimeUtils.fractionalDayOfYear(date)).toBe(1);
    });

    test('fractionalDayOfYear includes fractional part', () => {
      const date = new Date('2025-01-01T12:00:00Z');
      const result = TimeUtils.fractionalDayOfYear(date);
      expect(result).toBeGreaterThan(1);
      expect(result).toBeLessThan(2);
    });

    test('yearProgress360 maps year to 0-360 range', () => {
      const jan1 = new Date('2025-01-01T00:00:00Z');
      const dec31 = new Date('2025-12-31T23:59:59Z');
      
      expect(TimeUtils.yearProgress360(jan1)).toBeCloseTo(0, 1);
      expect(TimeUtils.yearProgress360(dec31)).toBeCloseTo(360, 0);
    });

    test('yearProgress360 handles leap years', () => {
      const date = new Date('2024-12-31T23:59:59Z');
      expect(TimeUtils.yearProgress360(date)).toBeCloseTo(360, 0);
    });
  });

  describe('ISO parsing with BCE support', () => {
    test('parses normal ISO strings via native Date', () => {
      const d = parseISODate('2025-01-02T03:04:05Z');
      expect(d.toISOString()).toBe('2025-01-02T03:04:05.000Z');
    });

    test('parses extended negative-year ISO for ancient dates', () => {
      const d = parseISODate('-490-09-12T06:00:00Z');
      expect(d.toISOString()).toBe('-000490-09-12T06:00:00.000Z');
    });

    test('throws on invalid ISO input', () => {
      expect(() => parseISODate('not-a-date')).toThrow(/Invalid ISO time/);
    });
  });

  describe('Date comparison', () => {
    test('sameUtcDate returns true for same date different times', () => {
      const date1 = new Date('2025-03-15T08:00:00Z');
      const date2 = new Date('2025-03-15T20:00:00Z');
      expect(TimeUtils.sameUtcDate(date1, date2)).toBe(true);
    });

    test('sameUtcDate returns false for different dates', () => {
      const date1 = new Date('2025-03-15T20:00:00Z');
      const date2 = new Date('2025-03-16T08:00:00Z');
      expect(TimeUtils.sameUtcDate(date1, date2)).toBe(false);
    });
  });

  describe('DST resilience', () => {
    test('calculations are not affected by DST transitions', () => {
      // US spring forward 2025: March 9, 2:00 AM -> 3:00 AM
      const beforeDST = new Date('2025-03-09T01:00:00Z');
      const afterDST = new Date('2025-03-09T03:00:00Z');
      
      const dayBefore = TimeUtils.fractionalDayOfYear(beforeDST);
      const dayAfter = TimeUtils.fractionalDayOfYear(afterDST);
      
      // Should be same day, just different hours
      expect(Math.floor(dayBefore)).toBe(Math.floor(dayAfter));
    });
  });
});
