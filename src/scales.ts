/**
 * NHS Agenda for Change pay scales by tax year.
 *
 * Pure salary data — no metadata (labels, slugs, role
 * descriptions). Static band info lives in bands.ts.
 *
 * Sources:
 * - https://www.nhsemployers.org/articles/pay-scales-202526
 * - https://www.nhsemployers.org/articles/pay-scales-202627
 * - https://www.healthcareers.nhs.uk/working-health/working-nhs/nhs-pay-and-benefits/agenda-change-pay-rates
 * - NLW: https://www.gov.uk/national-minimum-wage-rates
 * - Wales floor: AfC(W) 01/2026 pay letter (6 Jan 2026)
 * - HCAS: NHS Staff Council Framework Agreement (Annex R)
 */

import type {TaxYear} from '@casomoltd/paye-calc';
import {TAX_YEARS} from '@casomoltd/paye-calc';

export const AFC_BANDS = {
  B2: '2',
  B3: '3',
  B4: '4',
  B5: '5',
  B6: '6',
  B7: '7',
  B8a: '8a',
  B8b: '8b',
  B8c: '8c',
  B8d: '8d',
  B9: '9',
} as const;

export type AfcBandId =
  (typeof AFC_BANDS)[keyof typeof AFC_BANDS];

/** Ordered band IDs — use for iteration. */
export const AFC_BAND_IDS: AfcBandId[] =
  Object.values(AFC_BANDS);

export interface ScalePoint {
  label: string;
  salary: number;
}

export interface HcasZone {
  rate: number;
  min: number;
  max: number;
}

export interface HcasZones {
  innerLondon: HcasZone;
  outerLondon: HcasZone;
  fringe: HcasZone;
}

interface AfcScaleYear {
  hcas: HcasZones;
  scales: Record<AfcBandId, ScalePoint[]>;
}

// ── Shared HCAS zone rates ──────────────────────
// Unchanged between 2025-26 and 2026-27.

const HCAS_2025_ONWARDS: HcasZones = {
  innerLondon: {
    rate: 20, min: 5794, max: 8746,
  },
  outerLondon: {
    rate: 15, min: 4870, max: 6137,
  },
  fringe: {
    rate: 5, min: 1346, max: 2270,
  },
};

// ── 2025-26 ─────────────────────────────────────

const AFC_SCALES_2025_26: AfcScaleYear = {
  hcas: HCAS_2025_ONWARDS,
  scales: {
    '2': [{label: 'Entry', salary: 24465}],
    '3': [
      {label: 'Year 1', salary: 24937},
      {label: 'Year 2+', salary: 26598},
    ],
    '4': [
      {label: 'Year 1', salary: 27485},
      {label: 'Year 3+', salary: 30162},
    ],
    '5': [
      {label: 'Year 1', salary: 31049},
      {label: 'Year 2', salary: 33487},
      {label: 'Year 4+', salary: 37796},
    ],
    '6': [
      {label: 'Year 1', salary: 38682},
      {label: 'Year 2', salary: 40823},
      {label: 'Year 5+', salary: 46580},
    ],
    '7': [
      {label: 'Year 1', salary: 47810},
      {label: 'Year 2', salary: 50273},
      {label: 'Year 5+', salary: 54710},
    ],
    '8a': [
      {label: 'Year 1', salary: 55690},
      {label: 'Year 2', salary: 58487},
      {label: 'Year 5+', salary: 62682},
    ],
    '8b': [
      {label: 'Year 1', salary: 64455},
      {label: 'Year 2', salary: 68631},
      {label: 'Year 5+', salary: 74896},
    ],
    '8c': [
      {label: 'Year 1', salary: 76965},
      {label: 'Year 2', salary: 81652},
      {label: 'Year 5+', salary: 88682},
    ],
    '8d': [
      {label: 'Year 1', salary: 91342},
      {label: 'Year 2', salary: 96941},
      {label: 'Year 5+', salary: 105337},
    ],
    '9': [
      {label: 'Year 1', salary: 109179},
      {label: 'Year 2', salary: 115763},
      {label: 'Year 5+', salary: 125637},
    ],
  },
};

// ── 2026-27 ─────────────────────────────────────

const AFC_SCALES_2026_27: AfcScaleYear = {
  hcas: HCAS_2025_ONWARDS,
  scales: {
    '2': [{label: 'Entry', salary: 25272}],
    '3': [
      {label: 'Year 1', salary: 25760},
      {label: 'Year 2+', salary: 27476},
    ],
    '4': [
      {label: 'Year 1', salary: 28392},
      {label: 'Year 3+', salary: 31157},
    ],
    '5': [
      {label: 'Year 1', salary: 32073},
      {label: 'Year 2', salary: 34592},
      {label: 'Year 4+', salary: 39043},
    ],
    '6': [
      {label: 'Year 1', salary: 39959},
      {label: 'Year 2', salary: 42170},
      {label: 'Year 5+', salary: 48117},
    ],
    '7': [
      {label: 'Year 1', salary: 49387},
      {label: 'Year 2', salary: 51932},
      {label: 'Year 5+', salary: 56515},
    ],
    '8a': [
      {label: 'Year 1', salary: 57528},
      {label: 'Year 2', salary: 60417},
      {label: 'Year 5+', salary: 64750},
    ],
    '8b': [
      {label: 'Year 1', salary: 66582},
      {label: 'Year 2', salary: 70896},
      {label: 'Year 5+', salary: 77368},
    ],
    '8c': [
      {label: 'Year 1', salary: 79504},
      {label: 'Year 2', salary: 84346},
      {label: 'Year 5+', salary: 91609},
    ],
    '8d': [
      {label: 'Year 1', salary: 94356},
      {label: 'Year 2', salary: 100140},
      {label: 'Year 5+', salary: 108814},
    ],
    '9': [
      {label: 'Year 1', salary: 112782},
      {label: 'Year 2', salary: 119583},
      {label: 'Year 5+', salary: 129783},
    ],
  },
};

// ── National Living Wage (statutory, 21+) ────────
//
// Hourly rate set by the Low Pay Commission.
// Source: gov.uk/national-minimum-wage-rates

export const NLW_HOURLY: Partial<
  Record<TaxYear, number>
> = {
  [TAX_YEARS.Y2026_27]: 12.21,
};

/** Standard AfC working hours per year (37.5 × 52). */
export const AFC_HOURS_PER_YEAR = 37.5 * 52;

/** Annualise an hourly rate at AfC standard hours. */
export function annualiseHourly(
  hourly: number,
): number {
  return Math.round(hourly * AFC_HOURS_PER_YEAR);
}

// ── Scotland uplift ─────────────────────────────
//
// Scotland's 2026/27 award is 3.75% applied to the
// previous year's AfC base (not the England figure).
// Source: Scottish Government pay letter (2026).

export const SCOTLAND_UPLIFT: Partial<
  Record<TaxYear, number>
> = {
  [TAX_YEARS.Y2026_27]: 1.0375,
};

/** Derive Scotland salary from prior-year base.
 *  Returns the original salary if no uplift exists
 *  for the given tax year. */
export function applyScotlandUplift(
  prevYearSalary: number,
  year: TaxYear,
): number {
  const multiplier = SCOTLAND_UPLIFT[year];
  return multiplier
    ? Math.round(prevYearSalary * multiplier)
    : prevYearSalary;
}

// ── Wales living wage floor ─────────────────────
//
// The Welsh Government applies a Living Wage
// Foundation floor as an advance uplift. Affected
// spine points are lifted to this annual salary.
// Source: AfC(W) 01/2026 pay letter (6 Jan 2026).

export const WALES_LW_FLOOR: Partial<
  Record<TaxYear, number>
> = {
  [TAX_YEARS.Y2026_27]: 26300,
};

/** Apply the Wales living wage floor to a salary.
 *  Returns the original salary if no floor exists
 *  for the given tax year. */
export function applyWalesFloor(
  salary: number,
  year: TaxYear,
): number {
  const floor = WALES_LW_FLOOR[year];
  return floor ? Math.max(salary, floor) : salary;
}

// ── Lookup by tax year ──────────────────────────

const AFC_SCALES: Partial<
  Record<TaxYear, AfcScaleYear>
> = {
  [TAX_YEARS.Y2025_26]: AFC_SCALES_2025_26,
  [TAX_YEARS.Y2026_27]: AFC_SCALES_2026_27,
};

/** Tax years that have AFC scale data. */
export const AFC_TAX_YEARS: TaxYear[] =
  Object.keys(AFC_SCALES) as TaxYear[];

/** Get scales for a tax year (defaults to 2025-26). */
export function getScalesForYear(
  year: TaxYear = TAX_YEARS.Y2025_26,
): AfcScaleYear {
  return AFC_SCALES[year] ?? AFC_SCALES_2025_26;
}
