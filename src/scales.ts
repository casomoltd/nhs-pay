/**
 * NHS Agenda for Change pay scales by tax year.
 *
 * Pure salary data — no metadata (labels, slugs, role
 * descriptions); presentation copy is a hub-site concern.
 *
 * Sources, by the names they carry in docs/source-archive.md,
 * which holds every publisher URL and archived copy:
 * - "NHS Employers — AfC pay scales 2025/26"
 * - "NHS Employers — AfC pay scales 2026/27" (note its hourly
 *   table has printing errors; this file reads the ANNUAL
 *   column, so they cannot reach us — see the manifest)
 * - "NHS Employers, 2026 AfC pay scales poster" — the same award
 *   rendered a second time by the same publisher, which is what
 *   confirms the annual column above is untouched by those errors
 * - "Health Careers — AfC pay rates"
 * - NLW: "GOV.UK — national minimum wage rates"
 * - Wales floor: "Wales, AFC(W) 01/2026 living wage"
 * - HCAS rates: "NHS Terms and Conditions of Service
 *   Handbook, amendment 62" (#sa-41), Annex 9
 * - Scotland (both years): "Scotland, PCS(AFC)2026/1"
 *   (#sa-13), Annex B. Read the circular, not the MSG
 *   consolidated table: MSG prints the original 4.25%
 *   rates for 2025-26 and a 2026-27 table raised on that
 *   superseded base, so both of its years read low
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, TAX_YEARS} from '@casomoltd/paye-calc';
import {ScaleUnavailable} from './errors.js';
import type {ScalePoint} from './scale-point.js';

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
// Scotland negotiates its own AfC award. The 2025-26
// settlement was 4.25%, but carried an inflation
// guarantee: at least one percentage point above average
// CPI for the calendar year of the uplift. 2025 CPI
// confirmed at 3.4%, so the guarantee bit and the rate
// became 4.4%, backdated to 1 April 2025 with arrears.
// Band structures differ from England (Band 2 has 2
// points, Bands 8a–9 have 2 points each).
// Source: "Scotland, PCS(AFC)2026/1" (#sa-13), Annex B,
// the revised 4.4% column.

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
// 3.75% on the REVISED 2025-26 base, so the inflation
// guarantee reaches this year too.
// Source: "Scotland, PCS(AFC)2026/1" (#sa-13), Annex B,
// effective 1 April 2026.

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

// ── Wales ────────────────────────────────────────
//
// Wales runs its OWN pay ladder, transcribed here rather
// than derived from the England table. Both years are read
// from the Welsh circular's Annex 1: the ladders differ at
// every band from 4 upward, so England's figures plus a
// living-wage floor reproduce neither year. The floor lifts
// the bottom of a ladder and cannot raise its top.
//
// Structure differs from England too: Band 2 carries two
// points where England's has one.
//
// Point LABELS are read from the circular's own "years
// until eligible for pay progression" column, so Wales's
// labels are stated by its source rather than borrowed.
// They will not always match England's for the same band.
//
// GAP: Band 1 is published in both years (£24,833, then
// £26,300) and is closed to new entrants. It is absent
// here only because AFC_BANDS starts at B2 — the same gap
// Scotland has, not a Wales-specific omission.
//
// Sources: "Wales, AfC(W) 02/2025" and "Wales, AfC(W)
// 02/2026", Annex 1 of each — see docs/source-archive.md.

const AFC_SCALES_2025_26_WALES: AfcScaleYear = {
  hcas: HCAS_2025_ONWARDS,
  scales: {
    '2': [
      {label: 'Year 1', salary: 24833},
      {label: 'Year 3+', salary: 24833},
    ],
    '3': [
      {label: 'Year 1', salary: 25313},
      {label: 'Year 3+', salary: 26999},
    ],
    '4': [
      {label: 'Year 1', salary: 27898},
      {label: 'Year 4+', salary: 30615},
    ],
    '5': [
      {label: 'Year 1', salary: 31516},
      {label: 'Year 3', salary: 33992},
      {label: 'Year 5+', salary: 38364},
    ],
    '6': [
      {label: 'Year 1', salary: 39263},
      {label: 'Year 3', salary: 41437},
      {label: 'Year 6+', salary: 47280},
    ],
    '7': [
      {label: 'Year 1', salary: 48527},
      {label: 'Year 3', salary: 51028},
      {label: 'Year 6+', salary: 55532},
    ],
    '8a': [
      {label: 'Year 1', salary: 56514},
      {label: 'Year 3', salary: 59358},
      {label: 'Year 6+', salary: 63623},
    ],
    '8b': [
      {label: 'Year 1', salary: 65424},
      {label: 'Year 3', salary: 69653},
      {label: 'Year 6+', salary: 76021},
    ],
    '8c': [
      {label: 'Year 1', salary: 78120},
      {label: 'Year 3', salary: 82876},
      {label: 'Year 6+', salary: 90013},
    ],
    '8d': [
      {label: 'Year 1', salary: 92713},
      {label: 'Year 3', salary: 98395},
      {label: 'Year 6+', salary: 106919},
    ],
    '9': [
      {label: 'Year 1', salary: 110818},
      {label: 'Year 3', salary: 117499},
      {label: 'Year 6+', salary: 127523},
    ],
  },
};

const AFC_SCALES_2026_27_WALES: AfcScaleYear = {
  hcas: HCAS_2025_ONWARDS,
  scales: {
    '2': [
      {label: 'Year 1', salary: 26300},
      {label: 'Year 3+', salary: 26300},
    ],
    '3': [
      {label: 'Year 1', salary: 26300},
      {label: 'Year 3+', salary: 27890},
    ],
    '4': [
      {label: 'Year 1', salary: 28819},
      {label: 'Year 4+', salary: 31626},
    ],
    '5': [
      {label: 'Year 1', salary: 32557},
      {label: 'Year 3', salary: 35114},
      {label: 'Year 5+', salary: 39631},
    ],
    '6': [
      {label: 'Year 1', salary: 40559},
      {label: 'Year 3', salary: 42805},
      {label: 'Year 6+', salary: 48841},
    ],
    '7': [
      {label: 'Year 1', salary: 50129},
      {label: 'Year 3', salary: 52712},
      {label: 'Year 6+', salary: 57365},
    ],
    '8a': [
      {label: 'Year 1', salary: 58379},
      {label: 'Year 3', salary: 61317},
      {label: 'Year 6+', salary: 65723},
    ],
    '8b': [
      {label: 'Year 1', salary: 67583},
      {label: 'Year 3', salary: 71952},
      {label: 'Year 6+', salary: 78530},
    ],
    '8c': [
      {label: 'Year 1', salary: 80698},
      {label: 'Year 3', salary: 85611},
      {label: 'Year 6+', salary: 92984},
    ],
    '8d': [
      {label: 'Year 1', salary: 95773},
      {label: 'Year 3', salary: 101643},
      {label: 'Year 6+', salary: 110448},
    ],
    '9': [
      {label: 'Year 1', salary: 114475},
      {label: 'Year 3', salary: 121377},
      {label: 'Year 6+', salary: 131732},
    ],
  },
};

const AFC_SCALES_WALES: Partial<
  Record<TaxYear, AfcScaleYear>
> = {
  [TAX_YEARS.Y2025_26]: AFC_SCALES_2025_26_WALES,
  [TAX_YEARS.Y2026_27]: AFC_SCALES_2026_27_WALES,
};

// ── National Living Wage (statutory, 21+) ────────
//
// Hourly rate set by the Low Pay Commission, keyed by the
// TAX year the rate runs in — the NLW changes on 1 April,
// so a tax year carries exactly one rate and the two line
// up. Rates move every April, so a year's entry is the
// rate announced FOR that April, never the one in force
// when the entry was written.
// Source: "GOV.UK — national minimum wage rates" (#sa-30).

export const NLW_HOURLY: Partial<
  Record<TaxYear, number>
> = {
  [TAX_YEARS.Y2025_26]: 12.21,
  [TAX_YEARS.Y2026_27]: 12.71,
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
// Foundation floor (£13.45/hr) as an advance uplift,
// stated as an annual figure of £26,300 (a set annual
// value, not hourly × hours). Low spine points below it
// (Band 2, Band 3 entry) are lifted to it.
// Source: AfC(W) 01/2026 pay letter (6 Jan 2026).

export const WALES_LW_FLOOR: Partial<
  Record<TaxYear, number>
> = {
  [TAX_YEARS.Y2026_27]: 26300,
};


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

/** Every nation's published scale family. England and
 *  Northern Ireland share one because NI adopts the England
 *  scales; Scotland and Wales each publish their own ladder.
 *  Total over Nation, so adding a nation is a compile error
 *  here rather than a silent fall-through to England's. */
const SCALE_FAMILIES: Record<
  Nation, Partial<Record<TaxYear, AfcScaleYear>>
> = {
  [NATION_KEYS.england]: AFC_SCALES,
  [NATION_KEYS.northernIreland]: AFC_SCALES,
  [NATION_KEYS.scotland]: AFC_SCALES_SCOTLAND,
  [NATION_KEYS.wales]: AFC_SCALES_WALES,
};

/** Resolve a nation's published scale table for a year.
 *  Every figure returned is transcribed from that nation's
 *  own instrument — no nation's ladder is computed from
 *  another's. Throws {@link ScaleUnavailable} for a year
 *  that nation has not published, rather than silently
 *  substituting another year's or nation's figures. */
export function getScalesForYear(
  year: TaxYear,
  nation: Nation,
): AfcScaleYear {
  const base = SCALE_FAMILIES[nation][year];
  if (!base) {
    throw new ScaleUnavailable(nation, year);
  }
  return base;
}
