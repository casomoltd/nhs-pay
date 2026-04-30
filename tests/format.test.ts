import {describe, it, expect} from 'vitest';
import {TAX_YEARS} from '@casomoltd/paye-calc';
import {
  fmtSalary,
  fmtMoney,
  fmtPct,
  formatGBP,
  formatGBPPrecise,
  formatPct,
  yearLabel,
} from '../src/format.js';

describe('format', () => {
  it('fmtSalary formats with £ and commas', () => {
    expect(fmtSalary(31049)).toBe('\u00A331,049');
  });

  it('fmtMoney rounds and formats', () => {
    expect(fmtMoney(31049.6)).toBe('\u00A331,050');
  });

  it('fmtPct formats percentage', () => {
    expect(fmtPct(5.2)).toBe('5.2%');
    expect(fmtPct(12.5)).toBe('12.5%');
  });

  it('formatGBP uses Intl (no decimals)', () => {
    expect(formatGBP(35000)).toBe('£35,000');
  });

  it('formatGBPPrecise includes pence', () => {
    expect(formatGBPPrecise(35000))
      .toBe('£35,000.00');
  });

  it('formatPct uses Intl', () => {
    expect(formatPct(8.3)).toBe('8.3%');
  });

  it('yearLabel converts dash to slash', () => {
    expect(yearLabel(TAX_YEARS.Y2025_26))
      .toBe('2025/26');
  });
});
