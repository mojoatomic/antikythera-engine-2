const fs = require('fs');
const path = require('path');
const {
  formatTime,
  parseCSVLine,
  parseHORIZONSCSV,
} = require('../scripts/lib/horizons');

describe('formatTime', () => {
  const sample = new Date('2026-05-11T14:30:45.123Z');

  test('seconds precision (default) produces "YYYY-MM-DD HH:MM:SS"', () => {
    expect(formatTime(sample)).toBe('2026-05-11 14:30:45');
    expect(formatTime(sample, 'seconds')).toBe('2026-05-11 14:30:45');
  });

  test('minutes precision produces "YYYY-MM-DD HH:MM" (no seconds)', () => {
    expect(formatTime(sample, 'minutes')).toBe('2026-05-11 14:30');
  });

  test('seconds and minutes outputs differ by trailing :SS', () => {
    const s = formatTime(sample, 'seconds');
    const m = formatTime(sample, 'minutes');
    expect(s.startsWith(m)).toBe(true);
    expect(s.length - m.length).toBe(3); // ":SS"
  });

  test('seconds output matches the pre-refactor inline pattern', () => {
    // The 3 second-resolution validators used: .toISOString().replace('T',' ').split('.')[0]
    const inline = sample.toISOString().replace('T', ' ').split('.')[0];
    expect(formatTime(sample, 'seconds')).toBe(inline);
  });

  test('minutes output matches the pre-refactor inline pattern', () => {
    // The 2 minute-resolution validators used: .toISOString().slice(0,16).replace('T',' ')
    const inline = sample.toISOString().slice(0, 16).replace('T', ' ');
    expect(formatTime(sample, 'minutes')).toBe(inline);
  });
});

describe('parseCSVLine', () => {
  test('splits on commas and trims whitespace', () => {
    expect(parseCSVLine('a, b ,c')).toEqual(['a', 'b', 'c']);
  });

  test('strips surrounding double quotes', () => {
    expect(parseCSVLine('"a","b","c"')).toEqual(['a', 'b', 'c']);
  });

  test('handles trailing empty fields (HORIZONS shape)', () => {
    expect(parseCSVLine('2026-May-11 00:00:00, , ,  24.0012573, -0.8132110,')).toEqual([
      '2026-May-11 00:00:00', '', '', '24.0012573', '-0.8132110', '',
    ]);
  });

  test('handles well-formed empty quoted fields', () => {
    // The regex /(^"|"$)/g matches a leading or trailing quote at the
    // exact boundary; fields with whitespace BETWEEN the quote and the
    // comma (e.g. `" " ` with a trailing space after the closing quote)
    // do not fully strip — this matches the pre-refactor inline behavior
    // and the actual HORIZONS CSV output, which doesn't emit that pattern.
    expect(parseCSVLine('"","",""')).toEqual(['', '', '']);
  });
});

describe('parseHORIZONSCSV', () => {
  const fixture = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'horizons-observer-q31.txt'),
    'utf8'
  );

  test('returns header and rows from a real OBSERVER+Q31 response', () => {
    const { header, rows } = parseHORIZONSCSV(fixture);
    // Header: Date__(UT)__HR:MN:SS, , , ObsEcLon, ObsEcLat,
    expect(header.length).toBeGreaterThan(2);
    expect(header.some(h => /ObsEcLon/i.test(h))).toBe(true);
    expect(header.some(h => /ObsEcLat/i.test(h))).toBe(true);
    expect(rows.length).toBe(2); // fixture has 2 minutes of data
  });

  test('first row contains parseable ObsEcLon / ObsEcLat values', () => {
    const { header, rows } = parseHORIZONSCSV(fixture);
    const lonIdx = header.findIndex(h => /ObsEcLon/i.test(h));
    const latIdx = header.findIndex(h => /ObsEcLat/i.test(h));
    const lon = parseFloat(rows[0][lonIdx]);
    const lat = parseFloat(rows[0][latIdx]);
    expect(Number.isFinite(lon)).toBe(true);
    expect(Number.isFinite(lat)).toBe(true);
    // Sanity bounds (Mars in 2026 happens to be ~24° ECT lon)
    expect(lon).toBeGreaterThanOrEqual(0);
    expect(lon).toBeLessThan(360);
    expect(Math.abs(lat)).toBeLessThan(90);
  });

  test('rejects input with no $$SOE marker', () => {
    expect(() => parseHORIZONSCSV('header\nno markers here\n')).toThrow(/SOE\/\$\$EOE markers not found/);
  });

  test('rejects input with $$EOE before $$SOE', () => {
    const bad = 'header line\n  ,col\n$$EOE\ndata\n$$SOE\n';
    expect(() => parseHORIZONSCSV(bad)).toThrow(/markers not found or out of order/);
  });

  test('skips blank lines between $$SOE and $$EOE', () => {
    const withBlank = [
      'preamble',
      'header, col1, col2',
      '***',
      '$$SOE',
      'row1, a, b',
      '',
      '   ',
      'row2, c, d',
      '$$EOE',
    ].join('\n');
    const { rows } = parseHORIZONSCSV(withBlank);
    expect(rows).toEqual([
      ['row1', 'a', 'b'],
      ['row2', 'c', 'd'],
    ]);
  });
});

describe('module surface', () => {
  test('exports the documented public functions', () => {
    const mod = require('../scripts/lib/horizons');
    expect(typeof mod.HORIZONS_API_URL).toBe('string');
    expect(typeof mod.formatTime).toBe('function');
    expect(typeof mod.parseCSVLine).toBe('function');
    expect(typeof mod.parseHORIZONSCSV).toBe('function');
    expect(typeof mod.queryObserverEcliptic).toBe('function');
    expect(typeof mod.queryVectorsPosition).toBe('function');
  });

  test('does NOT export buildParams or fetchAndParse (kept module-private)', () => {
    const mod = require('../scripts/lib/horizons');
    expect(mod.buildParams).toBeUndefined();
    expect(mod.fetchAndParse).toBeUndefined();
  });
});
