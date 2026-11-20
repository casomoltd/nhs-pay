/**
 * HCAS (High Cost Area Supplement) zone identifiers, England's zones by
 * pay year (HCAS is England's only), supplement calculation, and gross
 * salary.
 *
 * Browser-safe — no node:fs dependency.
 */

import {NATION_KEYS} from '@casomoltd/paye-calc';
import type {PayYear, YearLabel} from '@casomoltd/paye-calc';
import {ScaleUnavailable} from './errors.js';
import {HCAS_ZONES} from './published/hcas-zones.js';
import type {AfcRegionId} from './regions.js';
import {resolveRegion} from './regions.js';

/** One zone: its rate as a percentage of basic pay, and the cash floor
 *  and ceiling it is held between. */
export interface HcasZone {
  readonly rate: number;
  readonly min: number;
  readonly max: number;
}

/** The three London zones. */
export interface HcasZones {
  readonly innerLondon: HcasZone;
  readonly outerLondon: HcasZone;
  readonly fringe: HcasZone;
}

export const HCAS_ZONE_IDS = {
  INNER_LONDON: 'inner-london',
  OUTER_LONDON: 'outer-london',
  FRINGE: 'fringe',
} as const;

export type HcasZoneId =
  (typeof HCAS_ZONE_IDS)[
    keyof typeof HCAS_ZONE_IDS
  ];

const ZONE_ID_LIST: HcasZoneId[] =
  Object.values(HCAS_ZONE_IDS);

/** Type guard — is this string a valid zone ID? */
export function isHcasZoneId(
  value: string,
): value is HcasZoneId {
  return (
    ZONE_ID_LIST as string[]
  ).includes(value);
}

/** A zone's rate is a percentage of basic pay. */
const PER_CENT = 100;

/**
 * Calculate HCAS supplement for a base salary.
 * Applies percentage rate clamped between min/max.
 */
export function calculateHcasSupplement(
  baseSalary: number,
  zone: HcasZone,
): number {
  const raw = baseSalary * (zone.rate / PER_CENT);
  return Math.round(
    Math.min(Math.max(raw, zone.min), zone.max),
  );
}

/**
 * Produce a region's gross from a base salary: the HCAS
 * supplement for England's high-cost zones, and nothing else. The zones
 * are England's for `year`, read here, so a caller cannot pass another
 * year's or another nation's; a region outside them is paid its base.
 *
 * No nation adjustment happens here. Every nation's ladder is
 * held in `scales.ts` and reached through
 * `getAfcScales`, so a caller wanting Welsh pay asks for
 * the Welsh table rather than passing another nation's figure
 * to be adjusted.
 */
export function grossSalary(
  base: number,
  region: AfcRegionId,
  year: PayYear,
): number {
  const {hcasProp} = resolveRegion(region);
  if (!hcasProp) {
    return base;
  }
  return base + calculateHcasSupplement(
    base, englandHcasZones(year)[hcasProp],
  );
}

/**
 * England's HCAS zones for a pay year, from the handbook's table for that
 * year: the zones a London supplement is read from, whatever nation the
 * reader is in. Throws {@link ScaleUnavailable} for a year the table does
 * not hold, rather than lending another year's ceilings.
 */
export function englandHcasZones(year: PayYear): HcasZones {
  const key: YearLabel = year;
  const zones = HCAS_ZONES[key];
  if (zones === undefined) throw new ScaleUnavailable(NATION_KEYS.england, year);
  return zones;
}
