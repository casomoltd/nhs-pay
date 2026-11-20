/**
 * Region codes collapse a nation and an HCAS zone into one value; the
 * lookups over them read one table, so these pin that each derived view
 * agrees with it.
 */
import {describe, it, expect} from 'vitest';
import {
  AFC_REGIONS,
  HCAS_ZONE_IDS,
  ZONE_TO_REGION,
  afcRegionToHcasZone,
  afcRegionToNation,
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

  it('gives a zone key only to a region with a zone', () => {
    for (const id of Object.values(AFC_REGIONS)) {
      const hasZone = afcRegionToHcasZone(id) !== null;
      expect(resolveRegion(id).hcasProp !== null).toBe(hasZone);
    }
    expect(resolveRegion(AFC_REGIONS.ENG_IL).hcasProp).toBe('innerLondon');
  });

  it('taxes Scotland at Scottish rates and marks only Wales as Wales', () => {
    expect(resolveRegion(AFC_REGIONS.SCO).taxRegion).toBe('scotland');
    expect(resolveRegion(AFC_REGIONS.NI).taxRegion).toBe('rUK');
    expect(Object.values(AFC_REGIONS).filter((id) => resolveRegion(id).isWales))
      .toEqual([AFC_REGIONS.WAL]);
  });
});
