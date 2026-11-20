/**
 * AFC region codes — collapse nation + HCAS into
 * a single query parameter.
 *
 * HCAS is England-only and mutually exclusive with
 * non-England nations, so one param covers both.
 *
 * UI-specific concerns (cookies, URL params, selector
 * options, zone labels) stay in the consumer.
 */

import {
  NATION_KEYS,
  NATIONS,
  nationToTaxRegion,
} from '@casomoltd/paye-calc';
import type {
  TaxRegion,
  Nation,
} from '@casomoltd/paye-calc';
import type {HcasZoneId, HcasZones} from './hcas.js';
import {invariant} from './errors.js';

// ── Region codes ────────────────────────────────

export const AFC_REGIONS = {
  ENG: 'eng',
  ENG_IL: 'eng-il',
  ENG_OL: 'eng-ol',
  ENG_FR: 'eng-fr',
  WAL: 'wal',
  SCO: 'sco',
  NI: 'ni',
} as const;

export type AfcRegionId =
  (typeof AFC_REGIONS)[keyof typeof AFC_REGIONS];

const AFC_REGION_ID_LIST: AfcRegionId[] =
  Object.values(AFC_REGIONS);

/** Type guard for region codes. */
export function isAfcRegionId(
  raw: string,
): raw is AfcRegionId {
  return (
    AFC_REGION_ID_LIST as string[]
  ).includes(raw);
}

// ── Resolved region info ────────────────────────

export interface ResolvedRegion {
  id: AfcRegionId;
  taxRegion: TaxRegion;
  /** The region's HCAS zone, if it has one: England's London regions only. */
  hcasProp: keyof HcasZones | null;
  isWales: boolean;
}

/** What a region code collapses: its nation and, for England's London
 *  regions, its HCAS zone. The one table every lookup below reads, so a
 *  region's nation and zone are each stated once. */
const REGIONS: Record<
  AfcRegionId,
  {readonly nation: Nation; readonly zone: HcasZoneId | null}
> = {
  [AFC_REGIONS.ENG]: {nation: NATION_KEYS.england, zone: null},
  [AFC_REGIONS.ENG_IL]: {nation: NATION_KEYS.england, zone: 'inner-london'},
  [AFC_REGIONS.ENG_OL]: {nation: NATION_KEYS.england, zone: 'outer-london'},
  [AFC_REGIONS.ENG_FR]: {nation: NATION_KEYS.england, zone: 'fringe'},
  [AFC_REGIONS.WAL]: {nation: NATION_KEYS.wales, zone: null},
  [AFC_REGIONS.SCO]: {nation: NATION_KEYS.scotland, zone: null},
  [AFC_REGIONS.NI]: {nation: NATION_KEYS.northernIreland, zone: null},
};

/** Each zone's key in an {@link HcasZones} record. */
const ZONE_PROP: Record<HcasZoneId, keyof HcasZones> = {
  'inner-london': 'innerLondon',
  'outer-london': 'outerLondon',
  fringe: 'fringe',
};

/** Resolve a region code to its tax region, HCAS zone key and whether it
 *  is Wales. */
export function resolveRegion(
  id: AfcRegionId,
): ResolvedRegion {
  const {nation, zone} = REGIONS[id];
  return {
    id,
    taxRegion: nationToTaxRegion(nation),
    hcasProp: zone === null ? null : ZONE_PROP[zone],
    isWales: nation === NATION_KEYS.wales,
  };
}

/** Map an AfC region code to a paye-calc Nation. */
export function afcRegionToNation(
  id: AfcRegionId,
): Nation {
  return REGIONS[id].nation;
}

/** Each HCAS zone's region code: the inverse of the zones above, checked
 *  total at load so a zone no region carries fails on import rather than
 *  reading as `undefined`. */
export const ZONE_TO_REGION: Record<HcasZoneId, AfcRegionId> = zoneToRegion();

/** Map an AfC region code to its HCAS zone,
 *  or null for non-HCAS regions. */
export function afcRegionToHcasZone(
  id: AfcRegionId,
): HcasZoneId | null {
  return REGIONS[id].zone;
}

// ── Nation type guard ──────────────────────

const NATION_SET: ReadonlySet<string> =
  new Set(Object.keys(NATIONS));

/** Type guard for paye-calc Nation strings. */
export function isNation(
  raw: string | null | undefined,
): raw is Nation {
  return typeof raw === 'string'
    && NATION_SET.has(raw);
}

/** Invert {@link REGIONS} over the zones, refusing a zone with no region. */
function zoneToRegion(): Record<HcasZoneId, AfcRegionId> {
  // Over ZONE_PROP's keys, which the compiler holds total over the zones;
  // `hcas.ts` imports this module, so its zone list is not read here.
  const entries = (Object.keys(ZONE_PROP) as HcasZoneId[]).map((zone) => {
    const region = AFC_REGION_ID_LIST.find((id) => REGIONS[id].zone === zone);
    invariant(region !== undefined, `regions: no region carries HCAS zone ${zone}`);
    return [zone, region] as const;
  });
  return Object.fromEntries(entries) as Record<HcasZoneId, AfcRegionId>;
}
