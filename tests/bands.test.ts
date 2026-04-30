import {describe, it, expect} from 'vitest';
import {TAX_YEARS} from '@casomoltd/paye-calc';
import {
  AFC_BAND_INFO,
  AFC_CURRENT_YEAR,
  AFC_PREVIOUS_YEAR,
  AFC_SOURCE_URL,
  getAfcScales,
} from '../src/bands.js';

describe('bands', () => {
  it('AFC_CURRENT_YEAR is 2026-27', () => {
    expect(AFC_CURRENT_YEAR)
      .toBe(TAX_YEARS.Y2026_27);
  });

  it('AFC_PREVIOUS_YEAR is 2025-26', () => {
    expect(AFC_PREVIOUS_YEAR)
      .toBe(TAX_YEARS.Y2025_26);
  });

  it('AFC_SOURCE_URL is a valid URL', () => {
    expect(AFC_SOURCE_URL).toContain(
      'healthcareers.nhs.uk',
    );
  });

  it('AFC_BAND_INFO has all 11 bands', () => {
    expect(
      Object.keys(AFC_BAND_INFO),
    ).toHaveLength(11);
  });

  it('getAfcScales returns merged data', () => {
    const data = getAfcScales(TAX_YEARS.Y2025_26);
    expect(data.bands).toHaveLength(11);
    expect(data.pensionTiers).toHaveLength(6);
    expect(data.hcas.innerLondon.rate).toBe(20);
  });

  it('band metadata includes slug and roles', () => {
    const data = getAfcScales();
    const b5 = data.bands.find(
      (b) => b.band === '5',
    );
    expect(b5).toBeDefined();
    expect(b5!.slug).toBe('nhs-band-5-pay');
    expect(b5!.roles).toContain('nurses');
  });

  it('salaryMin/salaryMax are computed', () => {
    const data = getAfcScales(TAX_YEARS.Y2025_26);
    const b5 = data.bands.find(
      (b) => b.band === '5',
    )!;
    expect(b5.salaryMin).toBe(31049);
    expect(b5.salaryMax).toBe(37796);
  });
});
