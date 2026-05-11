const { wrapLonDiffDeg, quantile, arcsecDiffLon } = require('../scripts/lib/stats');

describe('wrapLonDiffDeg', () => {
  test('zero difference', () => {
    expect(wrapLonDiffDeg(100, 100)).toBe(0);
  });

  test('small positive difference', () => {
    expect(wrapLonDiffDeg(100.5, 100)).toBeCloseTo(0.5, 9);
  });

  test('order-independent (absolute value)', () => {
    expect(wrapLonDiffDeg(100, 110)).toBeCloseTo(10, 9);
    expect(wrapLonDiffDeg(110, 100)).toBeCloseTo(10, 9);
  });

  test('wraparound near 0/360 produces the small-angle answer', () => {
    expect(wrapLonDiffDeg(359.5, 0.5)).toBeCloseTo(1, 9);
    expect(wrapLonDiffDeg(0.5, 359.5)).toBeCloseTo(1, 9);
  });

  test('antipodal points (180° apart)', () => {
    expect(wrapLonDiffDeg(0, 180)).toBeCloseTo(180, 9);
    expect(wrapLonDiffDeg(90, 270)).toBeCloseTo(180, 9);
  });

  test('matches the inline implementation in validate-extended.js for varied inputs', () => {
    // The inline pattern is `(a - b + 540) % 360 - 180`, take abs.
    const inline = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
    for (const [a, b] of [
      [0, 0], [10, 5], [350, 10], [180.5, 0.5], [359.9, 0.1], [123.456, 234.567],
    ]) {
      expect(wrapLonDiffDeg(a, b)).toBeCloseTo(inline(a, b), 12);
    }
  });
});

describe('quantile', () => {
  test('empty array returns null', () => {
    expect(quantile([], 0.5)).toBeNull();
  });

  test('single-element array', () => {
    expect(quantile([42], 0)).toBe(42);
    expect(quantile([42], 0.5)).toBe(42);
    expect(quantile([42], 1)).toBe(42);
  });

  test('p=0 returns the minimum', () => {
    expect(quantile([1, 2, 3, 4, 5], 0)).toBe(1);
  });

  test('p=1 returns the maximum', () => {
    expect(quantile([1, 2, 3, 4, 5], 1)).toBe(5);
  });

  test('p=0.5 returns the median on an odd-length array', () => {
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
  });

  test('p=0.5 linearly interpolates on an even-length array', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 9);
  });

  test('p=0.95 on 20 elements interpolates between indices 18 and 19', () => {
    // idx = (20 - 1) * 0.95 = 18.05; lo = 18, hi = 19, h = 0.05.
    const arr = Array.from({ length: 20 }, (_, i) => i + 1);
    // Expected: arr[18] * 0.95 + arr[19] * 0.05 = 19 * 0.95 + 20 * 0.05 = 19.05
    expect(quantile(arr, 0.95)).toBeCloseTo(19.05, 9);
  });

  test('matches the inline implementation in validate-extended.js bit-for-bit', () => {
    const inline = (sorted, p) => {
      if (sorted.length === 0) return null;
      const idx = (sorted.length - 1) * p;
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      if (lo === hi) return sorted[lo];
      const h = idx - lo;
      return sorted[lo] * (1 - h) + sorted[hi] * h;
    };
    const arr = [0.52, 0.91, 0.96, 1.13, 2.59, 3.98, 4.11, 5.51, 6.04, 8.62];
    for (const p of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 1]) {
      const a = quantile(arr, p);
      const b = inline(arr, p);
      if (a === null || b === null) {
        expect(a).toBe(b);
      } else {
        expect(a).toBe(b); // strict equality — same algorithm, same ordering
      }
    }
  });
});

describe('arcsecDiffLon', () => {
  test('zero difference', () => {
    expect(arcsecDiffLon(100, 100)).toBe(0);
  });

  test('1° difference = 3600″', () => {
    expect(arcsecDiffLon(100, 101)).toBeCloseTo(3600, 6);
  });

  test('wraparound', () => {
    expect(arcsecDiffLon(359.9, 0.1)).toBeCloseTo(720, 6); // 0.2° = 720″
  });
});

describe('module surface', () => {
  test('exports the documented public functions only', () => {
    const mod = require('../scripts/lib/stats');
    expect(typeof mod.wrapLonDiffDeg).toBe('function');
    expect(typeof mod.quantile).toBe('function');
    expect(typeof mod.arcsecDiffLon).toBe('function');
    expect(Object.keys(mod).sort()).toEqual(['arcsecDiffLon', 'quantile', 'wrapLonDiffDeg']);
  });
});
