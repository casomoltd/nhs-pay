import {describe, expect, it} from 'vitest';
import {
  fmtPct,
  formatPct,
  formatPctPrecise,
} from '../src/format.js';

describe('formatPctPrecise', () => {
  it('renders the employer admin levy honestly — the'
    + ' 1dp formatters round 0.08% up to 0.1%', () => {
    expect(fmtPct(0.08)).toBe('0.1%');
    expect(formatPct(0.08)).toBe('0.1%');
    expect(formatPctPrecise(0.08)).toBe('0.08%');
  });

  it('trims trailing zeros on ordinary rates', () => {
    expect(formatPctPrecise(23.7)).toBe('23.7%');
    expect(formatPctPrecise(9.8)).toBe('9.8%');
    expect(formatPctPrecise(12.5)).toBe('12.5%');
  });
});
