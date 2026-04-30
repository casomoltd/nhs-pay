import {describe, it, expect} from 'vitest';
import {TAX_YEARS} from '@casomoltd/paye-calc';
import {
  AFC_BANDS,
  AFC_BAND_IDS,
  AFC_HOURS_PER_YEAR,
  AFC_TAX_YEARS,
  NLW_HOURLY,
  WALES_LW_FLOOR,
  annualiseHourly,
  applyWalesFloor,
  getScalesForYear,
} from '../src/scales.js';

describe('scales', () => {
  it('AFC_BANDS has 11 bands', () => {
    expect(AFC_BAND_IDS).toHaveLength(11);
  });

  it('AFC_BAND_IDS matches AFC_BANDS values', () => {
    expect(AFC_BAND_IDS).toEqual(
      Object.values(AFC_BANDS),
    );
  });

  it('getScalesForYear returns data for 2025-26', () => {
    const s = getScalesForYear(TAX_YEARS.Y2025_26);
    expect(s.scales['5'][0].salary).toBe(31049);
  });

  it('getScalesForYear returns data for 2026-27', () => {
    const s = getScalesForYear(TAX_YEARS.Y2026_27);
    expect(s.scales['5'][0].salary).toBe(32073);
  });

  it('defaults to 2025-26 for unknown year', () => {
    const s = getScalesForYear(
      '2020-21' as typeof TAX_YEARS.Y2025_26,
    );
    expect(s.scales['5'][0].salary).toBe(31049);
  });

  it('AFC_TAX_YEARS lists available years', () => {
    expect(AFC_TAX_YEARS).toContain(
      TAX_YEARS.Y2025_26,
    );
    expect(AFC_TAX_YEARS).toContain(
      TAX_YEARS.Y2026_27,
    );
  });

  it('annualiseHourly matches AFC standard', () => {
    expect(AFC_HOURS_PER_YEAR).toBe(1950);
    expect(annualiseHourly(12.21)).toBe(23810);
  });

  it('NLW_HOURLY has 2026-27 rate', () => {
    expect(NLW_HOURLY[TAX_YEARS.Y2026_27])
      .toBe(12.21);
  });

  it('applyWalesFloor lifts below floor', () => {
    expect(
      applyWalesFloor(24000, TAX_YEARS.Y2026_27),
    ).toBe(26300);
  });

  it('applyWalesFloor keeps above floor', () => {
    expect(
      applyWalesFloor(30000, TAX_YEARS.Y2026_27),
    ).toBe(30000);
  });

  it('applyWalesFloor no-ops for year without', () => {
    expect(
      applyWalesFloor(24000, TAX_YEARS.Y2025_26),
    ).toBe(24000);
  });

  it('WALES_LW_FLOOR has 2026-27 value', () => {
    expect(WALES_LW_FLOOR[TAX_YEARS.Y2026_27])
      .toBe(26300);
  });

  it('each band has at least one scale point', () => {
    const s = getScalesForYear(TAX_YEARS.Y2025_26);
    for (const id of AFC_BAND_IDS) {
      expect(s.scales[id].length)
        .toBeGreaterThan(0);
    }
  });

  it('HCAS zones have expected shape', () => {
    const s = getScalesForYear(TAX_YEARS.Y2025_26);
    expect(s.hcas.innerLondon.rate).toBe(20);
    expect(s.hcas.outerLondon.rate).toBe(15);
    expect(s.hcas.fringe.rate).toBe(5);
  });
});
