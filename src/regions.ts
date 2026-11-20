/**
 * AFC region codes: one value that collapses a nation and,
 * in England, an HCAS zone.
 *
 * HCAS is England-only and mutually exclusive with
 * non-England nations, so one code covers both. This
 * module owns the mapping both ways: a region's nation and
 * zone, and the region for a nation and zone.
 *
 * UI-specific concerns (cookies, URL params, selector
 * options, zone labels) stay in the consumer.
 */

import {
  NATION_KEYS,
  nationToTaxRegion,
} from '@casomoltd/paye-calc';
import type {
  TaxRegion,
  Nation,
} from '@casomoltd/paye-calc';
import {HCAS_ZONE_IDS} from './hcas-zone.js';
import type {HcasZoneId} from './hcas-zone.js';
import {invariant} from './errors.js';

// ── Types ───────────────────────────────────────

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

export interface ResolvedRegion {
  id: AfcRegionId;
  taxRegion: TaxRegion;
  /** The region's HCAS zone, if it has one: England's London regions only. */
  zone: HcasZoneId | null;
}

// ── Tables ──────────────────────────────────────

/** Each HCAS zone's region code. Total over the zones by its type, so a
 *  zone with no region fails to compile; a region's own zone is read back
 *  from it ({@link afcRegionToHcasZone}), so the pairing is stated once. */
export const ZONE_TO_REGION: Readonly<Record<HcasZoneId, AfcRegionId>> = {
  [HCAS_ZONE_IDS.INNER_LONDON]: AFC_REGIONS.ENG_IL,
  [HCAS_ZONE_IDS.OUTER_LONDON]: AFC_REGIONS.ENG_OL,
  [HCAS_ZONE_IDS.FRINGE]: AFC_REGIONS.ENG_FR,
};

const AFC_REGION_ID_LIST: AfcRegionId[] =
  Object.values(AFC_REGIONS);

/** Each region code's nation. */
const REGION_NATION: Record<AfcRegionId, Nation> = {
  [AFC_REGIONS.ENG]: NATION_KEYS.england,
  [AFC_REGIONS.ENG_IL]: NATION_KEYS.england,
  [AFC_REGIONS.ENG_OL]: NATION_KEYS.england,
  [AFC_REGIONS.ENG_FR]: NATION_KEYS.england,
  [AFC_REGIONS.WAL]: NATION_KEYS.wales,
  [AFC_REGIONS.SCO]: NATION_KEYS.scotland,
  [AFC_REGIONS.NI]: NATION_KEYS.northernIreland,
};

/** Each nation's base region: the one with no HCAS zone. */
const BASE_REGION: Record<Nation, AfcRegionId> = {
  [NATION_KEYS.england]: AFC_REGIONS.ENG,
  [NATION_KEYS.wales]: AFC_REGIONS.WAL,
  [NATION_KEYS.scotland]: AFC_REGIONS.SCO,
  [NATION_KEYS.northernIreland]: AFC_REGIONS.NI,
};

// ── Functions ───────────────────────────────────

/** Type guard for region codes. */
export function isAfcRegionId(
  raw: string,
): raw is AfcRegionId {
  return (
    AFC_REGION_ID_LIST as string[]
  ).includes(raw);
}

/** Resolve a region code to its tax region and HCAS zone. */
export function resolveRegion(
  id: AfcRegionId,
): ResolvedRegion {
  return {
    id,
    taxRegion: nationToTaxRegion(REGION_NATION[id]),
    zone: afcRegionToHcasZone(id),
  };
}

/** Map an AfC region code to a paye-calc Nation. */
export function afcRegionToNation(
  id: AfcRegionId,
): Nation {
  return REGION_NATION[id];
}

/** Map an AfC region code to its HCAS zone,
 *  or null for non-HCAS regions. */
export function afcRegionToHcasZone(
  id: AfcRegionId,
): HcasZoneId | null {
  const zones = Object.keys(ZONE_TO_REGION) as HcasZoneId[];
  return zones.find((zone) => ZONE_TO_REGION[zone] === id) ?? null;
}

/** A nation's base AfC region: the one with no HCAS supplement, so its
 *  scale is the one the nation publishes. */
export function baseAfcRegion(nation: Nation): AfcRegionId {
  return BASE_REGION[nation];
}

/**
 * The AfC region for a nation and, in England, an HCAS zone. Throws for a
 * zone outside England: HCAS is England's only, so Wales with a fringe
 * zone is a state the caller should not hold, not one to quietly read as
 * England's fringe.
 */
export function afcRegionOf(
  nation: Nation,
  zone: HcasZoneId | null,
): AfcRegionId {
  if (zone === null) return BASE_REGION[nation];
  invariant(nation === NATION_KEYS.england,
    `afcRegionOf: ${nation} has no HCAS zone (${zone})`);
  return ZONE_TO_REGION[zone];
}
