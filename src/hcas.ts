/**
 * HCAS (High Cost Area Supplement) zone identifiers,
 * supplement calculation, and gross salary.
 *
 * Browser-safe — no node:fs dependency.
 */

import type {TaxYear} from '@casomoltd/paye-calc';
import type {HcasZone, HcasZones} from './scales.js';
import {applyWalesFloor} from './scales.js';
import type {AfcRegionId} from './regions.js';
import {resolveRegion} from './regions.js';

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

/**
 * Calculate HCAS supplement for a base salary.
 * Applies percentage rate clamped between min/max.
 */
export function calculateHcasSupplement(
  baseSalary: number,
  zone: HcasZone,
): number {
  const raw = baseSalary * (zone.rate / 100);
  return Math.round(
    Math.min(Math.max(raw, zone.min), zone.max),
  );
}

/**
 * Produce a region's gross from a base salary: apply the Wales
 * living-wage floor for Welsh regions, then the HCAS supplement
 * for England high-cost zones.
 *
 * The floor is applied here — not only when building the Welsh
 * scale table (`getScalesForYear`) — because callers regionalise
 * an *England* base (e.g. the band pages, which render England
 * scales for every region) and must still floor Welsh low bands.
 * `applyWalesFloor` is idempotent, so a base already read from
 * the floored Welsh table is unaffected. Do NOT drop the floor
 * here: the table alone does not cover the regionalise path, and
 * removing it silently underpays Welsh low bands (see the
 * grossSalary↔table equivalence test).
 */
export function grossSalary(
  base: number,
  region: AfcRegionId,
  hcas: HcasZones,
  year: TaxYear,
): number {
  const {hcasProp, isWales} = resolveRegion(region);
  const floored = isWales
    ? applyWalesFloor(base, year)
    : base;
  if (!hcasProp) {
    return floored;
  }
  return floored + calculateHcasSupplement(
    floored, hcas[hcasProp],
  );
}
