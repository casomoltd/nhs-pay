/**
 * HCAS (High Cost Area Supplement): England's zones by pay year (HCAS is
 * England's only), the supplement, and gross salary. The zone ids and
 * types are in `hcas-zone.ts`.
 *
 * Browser-safe — no node:fs dependency.
 */

import {NATION_KEYS} from '@casomoltd/paye-calc';
import type {PayYear, YearLabel} from '@casomoltd/paye-calc';
import {ScaleUnavailable} from './errors.js';
import {HCAS_ZONES} from './published/hcas-zones.js';
import type {AfcRegionId} from './regions.js';
import {afcRegionToHcasZone} from './regions.js';
import type {HcasZone, HcasZones} from './hcas-zone.js';
import type {SalaryRange} from './values.js';
import {PER_CENT} from './values.js';

/**
 * Calculate HCAS supplement for a base salary.
 * Applies percentage rate clamped between min/max.
 */
export function calculateHcasSupplement(
  baseSalary: number,
  zone: HcasZone,
): number {
  const raw = baseSalary * rateOf(zone);
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
  const zone = afcRegionToHcasZone(region);
  if (zone === null) {
    return base;
  }
  return base + calculateHcasSupplement(base, englandHcasZones(year)[zone]);
}

/**
 * The basic salaries between which a zone pays its percentage: below
 * `min` its cash floor applies, above `max` its cash cap. Exact, not
 * rounded: a consumer rounds as it prints.
 */
export function hcasRateBand(zone: HcasZone): SalaryRange {
  const rate = rateOf(zone);
  return {min: zone.min / rate, max: zone.max / rate};
}

/** A zone's rate as a fraction of basic pay. */
function rateOf(zone: HcasZone): number {
  return zone.rate / PER_CENT;
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
