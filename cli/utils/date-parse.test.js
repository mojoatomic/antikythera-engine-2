const { parseDateInput } = require('../utils/date-parse');

// NOTE: These tests rely on fixed system time to be deterministic

describe('date-parse (ISO and relative)', () => {
  const RealDateNow = Date.now;

  beforeAll(() => {
    jest.useFakeTimers({ now: new Date('2025-01-01T00:00:00Z') });
  });

  afterAll(() => {
    jest.useRealTimers();
    Date.now = RealDateNow;
  });

  test('parses ISO 8601 UTC', () => {
    const { date } = parseDateInput('2025-12-25T00:00:00Z', { tz: 'auto' });
    expect(date.toISOString()).toBe('2025-12-25T00:00:00.000Z');
  });

  test('parses relative +2h', () => {
    const { date } = parseDateInput('+2h', { tz: 'auto' });
    expect(date.toISOString()).toBe('2025-01-01T02:00:00.000Z');
  });

  test('rejects very large relative offsets', () => {
    expect(() => parseDateInput('+1000y', { tz: 'auto' })).toThrow(/too large/i);
  });
});
