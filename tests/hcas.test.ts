import {describe, it, expect} from 'vitest';
import {
  HCAS_ZONE_IDS,
  isHcasZoneId,
  calculateHcasSupplement,
} from '../src/hcas.js';

describe('hcas', () => {
  it('HCAS_ZONE_IDS has 3 zones', () => {
    expect(
      Object.keys(HCAS_ZONE_IDS),
    ).toHaveLength(3);
  });

  it('isHcasZoneId validates known zones', () => {
    expect(isHcasZoneId('inner-london'))
      .toBe(true);
    expect(isHcasZoneId('outer-london'))
      .toBe(true);
    expect(isHcasZoneId('fringe')).toBe(true);
    expect(isHcasZoneId('north')).toBe(false);
  });

  it('calculateHcasSupplement applies rate', () => {
    // 20% of 30000 = 6000, within min/max
    const result = calculateHcasSupplement(
      30000,
      {rate: 20, min: 5794, max: 8746},
    );
    expect(result).toBe(6000);
  });

  it('clamps to minimum', () => {
    // 20% of 20000 = 4000, below min 5794
    const result = calculateHcasSupplement(
      20000,
      {rate: 20, min: 5794, max: 8746},
    );
    expect(result).toBe(5794);
  });

  it('clamps to maximum', () => {
    // 20% of 50000 = 10000, above max 8746
    const result = calculateHcasSupplement(
      50000,
      {rate: 20, min: 5794, max: 8746},
    );
    expect(result).toBe(8746);
  });

  it('fringe zone calculation', () => {
    // 5% of 31049 = 1552.45, within 1346–2270
    const result = calculateHcasSupplement(
      31049,
      {rate: 5, min: 1346, max: 2270},
    );
    expect(result).toBeCloseTo(1552.45, 0);
  });
});
