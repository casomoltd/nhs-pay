import {describe, it, expect} from 'vitest';
import {TAX_YEARS} from '@casomoltd/paye-calc';
import {
  getPensionTiers,
  pensionTierRate,
  lookupPensionTier,
} from '../src/pension.js';

describe('pension', () => {
  const tiers = getPensionTiers(TAX_YEARS.Y2025_26);

  it('returns 6 tiers for 2025-26', () => {
    expect(tiers).toHaveLength(6);
  });

  it('tier 1 rate is 5.2%', () => {
    expect(pensionTierRate(10000, tiers)).toBe(5.2);
  });

  it('tier boundary: 13259 → 5.2%', () => {
    expect(pensionTierRate(13259, tiers)).toBe(5.2);
  });

  it('tier boundary: 13260 → 6.5%', () => {
    expect(pensionTierRate(13260, tiers)).toBe(6.5);
  });

  it('tier 6 for high earners: 12.5%', () => {
    expect(pensionTierRate(100000, tiers))
      .toBe(12.5);
  });

  it('lookupPensionTier returns tier info', () => {
    const result = lookupPensionTier(31049, tiers);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe(3);
    expect(result!.band.rate).toBe(0.083);
  });

  it('2026-27 has different boundaries', () => {
    const t27 = getPensionTiers(TAX_YEARS.Y2026_27);
    expect(t27[1].max).toBe(28854);
    expect(t27[2].max).toBe(35155);
  });

  it('defaults to 2025-26 for unknown year', () => {
    const t = getPensionTiers(
      '2020-21' as typeof TAX_YEARS.Y2025_26,
    );
    expect(t).toHaveLength(6);
    expect(t[0].rate).toBe(0.052);
  });
});
