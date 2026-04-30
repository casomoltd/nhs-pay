/**
 * HCAS (High Cost Area Supplement) zone identifiers,
 * supplement calculation, and gross salary.
 *
 * Browser-safe — no node:fs dependency.
 */

import type {TaxYear} from '@casomoltd/paye-calc';
import type {HcasZones} from './scales.js';
import type {AfcRegionId} from './regions.js';
import {resolveRegion} from './regions.js';
import {applyWalesFloor} from './scales.js';

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
  zone: {rate: number; min: number; max: number},
): number {
  const raw = baseSalary * (zone.rate / 100);
  return Math.round(
    Math.min(Math.max(raw, zone.min), zone.max),
  );
}

/** Base salary + Wales floor + HCAS supplement. */
export function grossSalary(
  base: number,
  region: AfcRegionId,
  hcas: HcasZones,
  year: TaxYear,
): number {
  const resolved = resolveRegion(region);
  let salary = base;
  if (resolved.isWales) {
    salary = applyWalesFloor(salary, year);
  }
  if (resolved.hcasProp) {
    salary += calculateHcasSupplement(
      salary, hcas[resolved.hcasProp],
    );
  }
  return salary;
}
