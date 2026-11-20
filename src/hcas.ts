/**
 * HCAS (High Cost Area Supplement) zone identifiers,
 * supplement calculation, and gross salary.
 *
 * Browser-safe — no node:fs dependency.
 */

import type {AfcRegionId} from './regions.js';
import {resolveRegion} from './regions.js';

/** One zone: its rate as a percentage of basic pay, and the cash floor
 *  and ceiling it is held between. */
export interface HcasZone {
  rate: number;
  min: number;
  max: number;
}

/** The three London zones. */
export interface HcasZones {
  innerLondon: HcasZone;
  outerLondon: HcasZone;
  fringe: HcasZone;
}

/** A zone's rate is a percentage of basic pay. */
const PER_CENT = 100;

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
  const raw = baseSalary * (zone.rate / PER_CENT);
  return Math.round(
    Math.min(Math.max(raw, zone.min), zone.max),
  );
}

/**
 * Produce a region's gross from a base salary: the HCAS
 * supplement for England's high-cost zones, and nothing else.
 *
 * No nation adjustment happens here. Every nation's ladder is
 * held in `scales.ts` and reached through
 * `getScalesForYear`, so a caller wanting Welsh pay asks for
 * the Welsh table rather than passing another nation's figure
 * to be adjusted.
 */
export function grossSalary(
  base: number,
  region: AfcRegionId,
  hcas: HcasZones,
): number {
  const {hcasProp} = resolveRegion(region);
  if (!hcasProp) {
    return base;
  }
  return base + calculateHcasSupplement(
    base, hcas[hcasProp],
  );
}
