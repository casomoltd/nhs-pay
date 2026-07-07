/**
 * NHS Agenda for Change pay scales by tax year.
 *
 * Pure salary data — no metadata (labels, slugs, role
 * descriptions); presentation copy is a hub-site concern.
 *
 * Sources:
 * - https://www.nhsemployers.org/articles/pay-scales-202526
 * - https://www.nhsemployers.org/articles/pay-scales-202627
 * - https://www.healthcareers.nhs.uk/working-health/working-nhs/nhs-pay-and-benefits/agenda-change-pay-rates
 * - NLW: https://www.gov.uk/national-minimum-wage-rates
 * - Wales floor: https://www.nhs.wales/files/pc-resources/2026-afc-1-2026-living-wage-pdf-pdf/
 * - HCAS: NHS Staff Council Framework Agreement (Annex R)
 * - Scotland 2025-26: PCS(AFC)2026/1 circular
 * - Scotland 2026-27: MSG Scotland AfC pay scales
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, TAX_YEARS} from '@casomoltd/paye-calc';
import {ScaleUnavailable} from './errors.js';

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

// ── Scotland 2025-26 ─────────────────────────────
// Scotland negotiates its own AfC award. Band
// structures differ from England (Band 2 has 2 points,
// Bands 8a–9 have 2 points each).
// Source: PCS(AFC)2026/1 circular (23 Jan 2026).

const AFC_SCALES_2025_26_SCOTLAND: AfcScaleYear = {
  hcas: HCAS_2025_ONWARDS,
  scales: {
    '2': [
      {label: 'Year 1', salary: 25731},
      {label: 'Year 2+', salary: 27941},
    ],
    '3': [
      {label: 'Year 1', salary: 28051},
      {label: 'Year 2+', salary: 30274},
    ],
    '4': [
      {label: 'Year 1', salary: 30397},
      {label: 'Year 3+', salary: 33063},
    ],
    '5': [
      {label: 'Year 1', salary: 33295},
      {label: 'Year 2', salary: 35576},
      {label: 'Year 4+', salary: 41483},
    ],
    '6': [
      {label: 'Year 1', salary: 41668},
      {label: 'Year 2', salary: 43503},
      {label: 'Year 5+', salary: 50775},
    ],
    '7': [
      {label: 'Year 1', salary: 50935},
      {label: 'Year 2', salary: 52880},
      {label: 'Year 5+', salary: 59244},
    ],
    '8a': [
      {label: 'Year 1', salary: 62772},
      {label: 'Year 2+', salary: 67762},
    ],
    '8b': [
      {label: 'Year 1', salary: 74109},
      {label: 'Year 2+', salary: 79278},
    ],
    '8c': [
      {label: 'Year 1', salary: 87526},
      {label: 'Year 2+', salary: 93820},
    ],
    '8d': [
      {label: 'Year 1', salary: 103913},
      {label: 'Year 2+', salary: 108362},
    ],
    '9': [
      {label: 'Year 1', salary: 122912},
      {label: 'Year 2+', salary: 128236},
    ],
  },
};

// ── Scotland 2026-27 ─────────────────────────────
// 3.75% uplift on Scotland 2025-26 base.
// Source: MSG Scotland AfC pay scales 2026-27.

const AFC_SCALES_2026_27_SCOTLAND: AfcScaleYear = {
  hcas: HCAS_2025_ONWARDS,
  scales: {
    '2': [
      {label: 'Year 1', salary: 26696},
      {label: 'Year 2+', salary: 28988},
    ],
    '3': [
      {label: 'Year 1', salary: 29103},
      {label: 'Year 2+', salary: 31409},
    ],
    '4': [
      {label: 'Year 1', salary: 31537},
      {label: 'Year 3+', salary: 34303},
    ],
    '5': [
      {label: 'Year 1', salary: 34544},
      {label: 'Year 2', salary: 36911},
      {label: 'Year 4+', salary: 43039},
    ],
    '6': [
      {label: 'Year 1', salary: 43231},
      {label: 'Year 2', salary: 45135},
      {label: 'Year 5+', salary: 52679},
    ],
    '7': [
      {label: 'Year 1', salary: 52845},
      {label: 'Year 2', salary: 54863},
      {label: 'Year 5+', salary: 61466},
    ],
    '8a': [
      {label: 'Year 1', salary: 65125},
      {label: 'Year 2+', salary: 70303},
    ],
    '8b': [
      {label: 'Year 1', salary: 76888},
      {label: 'Year 2+', salary: 82251},
    ],
    '8c': [
      {label: 'Year 1', salary: 90808},
      {label: 'Year 2+', salary: 97338},
    ],
    '8d': [
      {label: 'Year 1', salary: 107810},
      {label: 'Year 2+', salary: 112426},
    ],
    '9': [
      {label: 'Year 1', salary: 127521},
      {label: 'Year 2+', salary: 133044},
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

/** Standard rUK AfC weekly hours (Scotland differs from 2026-27). */
const RUK_WEEKLY_HOURS = 37.5;

/**
 * Standard AfC working hours per year (37.5 × 52).
 * @deprecated Use `hoursPerYear(config)` from
 * paye-calc for region-aware hours. This constant
 * assumes rUK 37.5h weeks and is wrong for Scotland
 * from 2026-27.
 */
export const AFC_HOURS_PER_YEAR = RUK_WEEKLY_HOURS * 52;

/**
 * Annualise an hourly rate at given weekly hours.
 * Defaults to 37.5 (rUK standard) for backward
 * compatibility. Pass config.standardWeeklyHours
 * for region-aware conversion.
 */
export function annualiseHourly(
  hourly: number,
  weeklyHours: number = RUK_WEEKLY_HOURS,
): number {
  return Math.round(hourly * weeklyHours * 52);
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

const AFC_SCALES_SCOTLAND: Partial<
  Record<TaxYear, AfcScaleYear>
> = {
  [TAX_YEARS.Y2025_26]:
    AFC_SCALES_2025_26_SCOTLAND,
  [TAX_YEARS.Y2026_27]:
    AFC_SCALES_2026_27_SCOTLAND,
};

/** Tax years that have AFC scale data. */
export const AFC_TAX_YEARS: TaxYear[] =
  Object.keys(AFC_SCALES) as TaxYear[];

/** Apply the Wales living-wage floor to every point in a
 *  scale year (a no-op where no floor applies for the year). */
function floorScaleYear(
  scaleYear: AfcScaleYear,
  year: TaxYear,
): AfcScaleYear {
  const scales = Object.fromEntries(
    AFC_BAND_IDS.map((band) => [
      band,
      scaleYear.scales[band].map((pt) => {
        const salary = applyWalesFloor(pt.salary, year);
        return salary !== pt.salary ? {...pt, salary} : pt;
      }),
    ]),
  ) as Record<AfcBandId, ScalePoint[]>;
  return {hcas: scaleYear.hcas, scales};
}

/** Resolve the published, nation-adjusted scale table for a
 *  year — the single place a nation modifies the base scale:
 *  Scotland swaps to its own family, Wales floors the
 *  England/NI base, England/NI use the base as-is. Throws
 *  {@link ScaleUnavailable} for an unpublished year rather
 *  than silently substituting another year's figures. */
export function getScalesForYear(
  year: TaxYear,
  nation: Nation = NATION_KEYS.england,
): AfcScaleYear {
  const family =
    nation === NATION_KEYS.scotland
      ? AFC_SCALES_SCOTLAND
      : AFC_SCALES;
  const base = family[year];
  if (!base) {
    throw new ScaleUnavailable(nation, year);
  }
  return nation === NATION_KEYS.wales
    ? floorScaleYear(base, year)
    : base;
}
