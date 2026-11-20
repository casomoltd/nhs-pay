/**
 * Region codes collapse a nation and an HCAS zone into one value; the
 * lookups over them read each region's nation and each zone's region, so
 * these pin that every derived view agrees with those two tables.
 */
import {describe, it, expect} from 'vitest';
import {
  AFC_REGIONS,
  HCAS_ZONE_IDS,
  NATION_KEYS,
  ZONE_TO_REGION,
  afcRegionToHcasZone,
  afcRegionOf,
  afcRegionToNation,
  baseAfcRegion,
  resolveRegion,
} from '../src/index.js';

describe('region lookups', () => {
  it('maps every HCAS zone to an England region carrying that zone', () => {
    for (const zone of Object.values(HCAS_ZONE_IDS)) {
      const region = ZONE_TO_REGION[zone];
      expect(afcRegionToHcasZone(region)).toBe(zone);
      expect(afcRegionToNation(region)).toBe('england');
    }
  });

  it('gives a zone only to the three London regions', () => {
    const zoned = Object.values(AFC_REGIONS)
      .filter((id) => resolveRegion(id).zone !== null);
    expect(zoned).toEqual(
      [AFC_REGIONS.ENG_IL, AFC_REGIONS.ENG_OL, AFC_REGIONS.ENG_FR]);
    expect(resolveRegion(AFC_REGIONS.ENG_IL).zone).toBe('inner-london');
  });

  it('taxes Scotland at Scottish rates and the rest of the UK at its own', () => {
    expect(resolveRegion(AFC_REGIONS.SCO).taxRegion).toBe('scotland');
    expect(resolveRegion(AFC_REGIONS.NI).taxRegion).toBe('rUK');
    expect(resolveRegion(AFC_REGIONS.WAL).taxRegion).toBe('rUK');
  });

  it('maps a nation and zone to its region, refusing HCAS outside England', () => {
    expect(baseAfcRegion('wales')).toBe(AFC_REGIONS.WAL);
    expect(afcRegionOf('england', null)).toBe(AFC_REGIONS.ENG);
    expect(afcRegionOf('england', HCAS_ZONE_IDS.FRINGE)).toBe(AFC_REGIONS.ENG_FR);
    expect(() => afcRegionOf('wales', HCAS_ZONE_IDS.FRINGE)).toThrow(/no HCAS zone/);
  });

  it('gives every nation a base region with no zone, in that nation', () => {
    for (const nation of Object.values(NATION_KEYS)) {
      const region = baseAfcRegion(nation);
      expect(afcRegionToNation(region)).toBe(nation);
      expect(afcRegionToHcasZone(region)).toBeNull();
    }
  });
});
