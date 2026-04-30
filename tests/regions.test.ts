import {describe, it, expect} from 'vitest';
import {TAX_REGIONS} from '@casomoltd/paye-calc';
import {
  AFC_REGIONS,
  isAfcRegionId,
  resolveRegion,
  legacyHcasToRegion,
  afcRegionToNation,
  isNation,
} from '../src/regions.js';

describe('regions', () => {
  it('AFC_REGIONS has 7 region codes', () => {
    expect(Object.keys(AFC_REGIONS)).toHaveLength(7);
  });

  it('isAfcRegionId validates known regions', () => {
    expect(isAfcRegionId('eng')).toBe(true);
    expect(isAfcRegionId('sco')).toBe(true);
    expect(isAfcRegionId('xxx')).toBe(false);
  });

  it('resolveRegion returns correct tax region', () => {
    const eng = resolveRegion(AFC_REGIONS.ENG);
    expect(eng.taxRegion).toBe(TAX_REGIONS.rUK);
    expect(eng.hcasProp).toBeNull();

    const sco = resolveRegion(AFC_REGIONS.SCO);
    expect(sco.taxRegion).toBe(
      TAX_REGIONS.scotland,
    );
  });

  it('HCAS regions have hcasProp set', () => {
    const il = resolveRegion(AFC_REGIONS.ENG_IL);
    expect(il.hcasProp).toBe('innerLondon');

    const ol = resolveRegion(AFC_REGIONS.ENG_OL);
    expect(ol.hcasProp).toBe('outerLondon');

    const fr = resolveRegion(AFC_REGIONS.ENG_FR);
    expect(fr.hcasProp).toBe('fringe');
  });

  it('Wales region is flagged', () => {
    const wal = resolveRegion(AFC_REGIONS.WAL);
    expect(wal.isWales).toBe(true);

    const eng = resolveRegion(AFC_REGIONS.ENG);
    expect(eng.isWales).toBe(false);
  });

  it('legacyHcasToRegion maps old values', () => {
    expect(legacyHcasToRegion('inner-london'))
      .toBe(AFC_REGIONS.ENG_IL);
    expect(legacyHcasToRegion('outer-london'))
      .toBe(AFC_REGIONS.ENG_OL);
    expect(legacyHcasToRegion('fringe'))
      .toBe(AFC_REGIONS.ENG_FR);
    expect(legacyHcasToRegion('unknown'))
      .toBeNull();
  });

  it('afcRegionToNation maps correctly', () => {
    expect(afcRegionToNation(AFC_REGIONS.ENG))
      .toBe('england');
    expect(afcRegionToNation(AFC_REGIONS.SCO))
      .toBe('scotland');
    expect(afcRegionToNation(AFC_REGIONS.WAL))
      .toBe('wales');
    expect(afcRegionToNation(AFC_REGIONS.NI))
      .toBe('northern-ireland');
  });

  it('isNation validates nation strings', () => {
    expect(isNation('england')).toBe(true);
    expect(isNation('scotland')).toBe(true);
    expect(isNation('xyz')).toBe(false);
    expect(isNation(null)).toBe(false);
    expect(isNation(undefined)).toBe(false);
  });
});
