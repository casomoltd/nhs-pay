import {describe, it, expect} from 'vitest';
import {TAX_YEARS, TAX_REGIONS} from '@casomoltd/paye-calc';
import {nhsTakeHome} from '../src/take-home.js';

describe('take-home', () => {
  it('Band 5 Y1 2025-26 take-home', () => {
    const thp = nhsTakeHome(
      31049, 0.083, TAX_YEARS.Y2025_26,
    );
    expect(thp.pensionDeduction).toBe(2577);
    expect(Math.round(thp.net)).toBe(23813);
  });

  it('Band 7 Y1 2026-27 take-home', () => {
    const thp = nhsTakeHome(
      49387, 0.098, TAX_YEARS.Y2026_27,
    );
    expect(thp.pensionDeduction).toBe(4840);
    expect(Math.round(thp.net)).toBe(35206);
  });

  it('defaults to current year and rUK', () => {
    const thp = nhsTakeHome(31049, 0.083);
    expect(thp.net).toBeGreaterThan(0);
  });

  it('accepts Scottish tax region', () => {
    const thp = nhsTakeHome(
      31049, 0.083,
      TAX_YEARS.Y2025_26,
      TAX_REGIONS.scotland,
    );
    expect(thp.net).toBeGreaterThan(0);
    // Scottish tax differs from rUK
    const ruk = nhsTakeHome(
      31049, 0.083, TAX_YEARS.Y2025_26,
    );
    expect(thp.incomeTax).not.toBe(ruk.incomeTax);
  });
});
