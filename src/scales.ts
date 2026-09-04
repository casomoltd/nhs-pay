/**
 * NHS Agenda for Change pay scales by tax year.
 *
 * Pure salary data — no metadata (labels, slugs, role
 * descriptions); presentation copy is a consumer concern.
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
 *
 * POINT LABELS — one convention, all four nations. A point's label is
 * the year of service in which a member first reaches it: increment 1
 * is `Year 1`, and the top point takes a `+` because service continues
 * past it.
 *
 * No publisher prints a "Year N" label. Every label here is our
 * rendering of an interval the publisher does print — England, Wales
 * and Northern Ireland head that column "Years until eligible for pay
 * progression", and Scotland's Annex C heads it "Yearly Increment" —
 * which is why the convention has to be stated once, for all of them,
 * rather than beside any one nation. England, Wales and NI publish
 * identical intervals and so read identically; Scotland's bands 8a to 9
 * differ because its publisher differs there.
 *
 * Labels are lookup keys for `afcResolver.fromScalePoint`, so changing
 * one is an API change, and the fixtures assert them.
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {
  NATION_KEYS,
  TAX_YEARS,
  CURRENT_TAX_YEAR,
} from '@casomoltd/paye-calc';
import {ScaleUnavailable, invariant} from './errors.js';
import type {DocumentSource} from './document-source.js';
import {
  AFC_ENGLAND_SCALES_2025,
  AFC_ENGLAND_SCALES_2026,
  AFC_NI_2025,
  AFC_SCOTLAND,
  AFC_W_02_2025,
  AFC_W_02_2026,
} from './sources.js';
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

// ── HCAS zone rates, per year ───────────────────
//
// The PERCENTAGES hold from year to year; the cash floor and
// ceiling do not — NHS Employers uprates them with each pay
// award and prints one table per year. Sharing a single table
// across years therefore pays the current year's ceiling on
// last year's salary, which is why these are separate.
//
// Source: NHS TCS Handbook (amendment 62, 1 June 2026), Annex 9
// "High cost area supplements", Table 1 (from 1 April 2026) and
// Table 2 (from 1 April 2025).

const HCAS_2025_26: HcasZones = {
  innerLondon: {
    rate: 20, min: 5609, max: 8466,
  },
  outerLondon: {
    rate: 15, min: 4714, max: 5941,
  },
  fringe: {
    rate: 5, min: 1303, max: 2198,
  },
};

const HCAS_2026_27: HcasZones = {
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
  hcas: HCAS_2025_26,
  scales: {
    // Two points, both 24465. The publisher prints Band 2 with an
    // entry point, a 2-year progression interval and a top point,
    // and the wage floor has compressed the two to the same cash
    // figure — so the structure is published and the equality is
    // the fact, not a reason to collapse it. Wales's Band 2 is the
    // same shape and was already modelled this way.
    '2': [
      {label: 'Year 1', salary: 24465},
      {label: 'Year 3+', salary: 24465},
    ],
    '3': [
      {label: 'Year 1', salary: 24937},
      {label: 'Year 3+', salary: 26598},
    ],
    '4': [
      {label: 'Year 1', salary: 27485},
      {label: 'Year 4+', salary: 30162},
    ],
    '5': [
      {label: 'Year 1', salary: 31049},
      {label: 'Year 3', salary: 33487},
      {label: 'Year 5+', salary: 37796},
    ],
    '6': [
      {label: 'Year 1', salary: 38682},
      {label: 'Year 3', salary: 40823},
      {label: 'Year 6+', salary: 46580},
    ],
    '7': [
      {label: 'Year 1', salary: 47810},
      {label: 'Year 3', salary: 50273},
      {label: 'Year 6+', salary: 54710},
    ],
    '8a': [
      {label: 'Year 1', salary: 55690},
      {label: 'Year 3', salary: 58487},
      {label: 'Year 6+', salary: 62682},
    ],
    '8b': [
      {label: 'Year 1', salary: 64455},
      {label: 'Year 3', salary: 68631},
      {label: 'Year 6+', salary: 74896},
    ],
    '8c': [
      {label: 'Year 1', salary: 76965},
      {label: 'Year 3', salary: 81652},
      {label: 'Year 6+', salary: 88682},
    ],
    '8d': [
      {label: 'Year 1', salary: 91342},
      {label: 'Year 3', salary: 96941},
      {label: 'Year 6+', salary: 105337},
    ],
    '9': [
      {label: 'Year 1', salary: 109179},
      {label: 'Year 3', salary: 115763},
      {label: 'Year 6+', salary: 125637},
    ],
  },
};

// ── 2026-27 ─────────────────────────────────────

const AFC_SCALES_2026_27: AfcScaleYear = {
  hcas: HCAS_2026_27,
  scales: {
    // Two points, both 25272. The publisher prints Band 2 with an
    // entry point, a 2-year progression interval and a top point,
    // and the wage floor has compressed the two to the same cash
    // figure — so the structure is published and the equality is
    // the fact, not a reason to collapse it. Wales's Band 2 is the
    // same shape and was already modelled this way.
    '2': [
      {label: 'Year 1', salary: 25272},
      {label: 'Year 3+', salary: 25272},
    ],
    '3': [
      {label: 'Year 1', salary: 25760},
      {label: 'Year 3+', salary: 27476},
    ],
    '4': [
      {label: 'Year 1', salary: 28392},
      {label: 'Year 4+', salary: 31157},
    ],
    '5': [
      {label: 'Year 1', salary: 32073},
      {label: 'Year 3', salary: 34592},
      {label: 'Year 5+', salary: 39043},
    ],
    '6': [
      {label: 'Year 1', salary: 39959},
      {label: 'Year 3', salary: 42170},
      {label: 'Year 6+', salary: 48117},
    ],
    '7': [
      {label: 'Year 1', salary: 49387},
      {label: 'Year 3', salary: 51932},
      {label: 'Year 6+', salary: 56515},
    ],
    '8a': [
      {label: 'Year 1', salary: 57528},
      {label: 'Year 3', salary: 60417},
      {label: 'Year 6+', salary: 64750},
    ],
    '8b': [
      {label: 'Year 1', salary: 66582},
      {label: 'Year 3', salary: 70896},
      {label: 'Year 6+', salary: 77368},
    ],
    '8c': [
      {label: 'Year 1', salary: 79504},
      {label: 'Year 3', salary: 84346},
      {label: 'Year 6+', salary: 91609},
    ],
    '8d': [
      {label: 'Year 1', salary: 94356},
      {label: 'Year 3', salary: 100140},
      {label: 'Year 6+', salary: 108814},
    ],
    '9': [
      {label: 'Year 1', salary: 112782},
      {label: 'Year 3', salary: 119583},
      {label: 'Year 6+', salary: 129783},
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
  hcas: HCAS_2025_26,
  scales: {
    '2': [
      {label: 'Year 1', salary: 25731},
      {label: 'Year 3+', salary: 27941},
    ],
    '3': [
      {label: 'Year 1', salary: 28051},
      {label: 'Year 3+', salary: 30274},
    ],
    '4': [
      {label: 'Year 1', salary: 30397},
      {label: 'Year 4+', salary: 33063},
    ],
    '5': [
      {label: 'Year 1', salary: 33295},
      {label: 'Year 3', salary: 35576},
      {label: 'Year 5+', salary: 41483},
    ],
    '6': [
      {label: 'Year 1', salary: 41668},
      {label: 'Year 3', salary: 43503},
      {label: 'Year 6+', salary: 50775},
    ],
    '7': [
      {label: 'Year 1', salary: 50935},
      {label: 'Year 3', salary: 52880},
      {label: 'Year 6+', salary: 59244},
    ],
    '8a': [
      {label: 'Year 1', salary: 62772},
      {label: 'Year 6+', salary: 67762},
    ],
    '8b': [
      {label: 'Year 1', salary: 74109},
      {label: 'Year 6+', salary: 79278},
    ],
    '8c': [
      {label: 'Year 1', salary: 87526},
      {label: 'Year 6+', salary: 93820},
    ],
    '8d': [
      {label: 'Year 1', salary: 103913},
      {label: 'Year 6+', salary: 108362},
    ],
    '9': [
      {label: 'Year 1', salary: 122912},
      {label: 'Year 6+', salary: 128236},
    ],
  },
};

// ── Scotland 2026-27 ─────────────────────────────
// 3.75% on the REVISED 2025-26 base, so the inflation
// guarantee reaches this year too.
// Source: "Scotland, PCS(AFC)2026/1" (#sa-13), Annex B,
// effective 1 April 2026.

const AFC_SCALES_2026_27_SCOTLAND: AfcScaleYear = {
  hcas: HCAS_2026_27,
  scales: {
    '2': [
      {label: 'Year 1', salary: 26696},
      {label: 'Year 3+', salary: 28988},
    ],
    '3': [
      {label: 'Year 1', salary: 29103},
      {label: 'Year 3+', salary: 31409},
    ],
    '4': [
      {label: 'Year 1', salary: 31537},
      {label: 'Year 4+', salary: 34303},
    ],
    '5': [
      {label: 'Year 1', salary: 34544},
      {label: 'Year 3', salary: 36911},
      {label: 'Year 5+', salary: 43039},
    ],
    '6': [
      {label: 'Year 1', salary: 43231},
      {label: 'Year 3', salary: 45135},
      {label: 'Year 6+', salary: 52679},
    ],
    '7': [
      {label: 'Year 1', salary: 52845},
      {label: 'Year 3', salary: 54863},
      {label: 'Year 6+', salary: 61466},
    ],
    '8a': [
      {label: 'Year 1', salary: 65125},
      {label: 'Year 6+', salary: 70303},
    ],
    '8b': [
      {label: 'Year 1', salary: 76888},
      {label: 'Year 6+', salary: 82251},
    ],
    '8c': [
      {label: 'Year 1', salary: 90808},
      {label: 'Year 6+', salary: 97338},
    ],
    '8d': [
      {label: 'Year 1', salary: 107810},
      {label: 'Year 6+', salary: 112426},
    ],
    '9': [
      {label: 'Year 1', salary: 127521},
      {label: 'Year 6+', salary: 133044},
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
// GAP: Band 1 is published in both years (£24,833, then
// £26,300) and is closed to new entrants. It is absent
// here only because AFC_BANDS starts at B2 — the same gap
// Scotland has, not a Wales-specific omission.
//
// Sources: "Wales, AfC(W) 02/2025" (#sa-44) and "Wales,
// AfC(W) 02/2026" (#sa-45), Annex 1 of each.

const AFC_SCALES_2025_26_WALES: AfcScaleYear = {
  hcas: HCAS_2025_26,
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
  hcas: HCAS_2026_27,
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
 * Standard AfC working hours per year (37.5 × 365/7 ≈ 1,955.4).
 *
 * The week-year is 365/7, not 52, matching every publisher that prints
 * an hourly rate beside an annual salary, and matching NHS Employers'
 * own ~1,955.4-hour year. A 52-week year gives 1,950, which no
 * publisher prints.
 *
 * @deprecated Use `hoursPerYear(config)` from
 * paye-calc for region-aware hours. This constant
 * assumes rUK 37.5h weeks and is wrong for Scotland
 * from 2026-27.
 */
export const AFC_HOURS_PER_YEAR = (RUK_WEEKLY_HOURS * 365) / 7;

/**
 * Annualise an hourly rate at given weekly hours.
 *
 * `weeklyHours` is required: the standard week is the
 * axis that varies by nation (Scotland's AfC week is 37
 * hours to 2025-26 and 36 from 2026-27, rUK's 37.5), so
 * defaulting it would silently return an rUK answer for a
 * Scottish rate. Pass `config.standardWeeklyHours`.
 *
 * The week-year is 365/7, the same basis `hoursPerYear`
 * uses — the two are inverses of one another and a
 * divisor that disagreed would round-trip a salary to a
 * different number.
 */
export function annualiseHourly(
  hourly: number,
  weeklyHours: number,
): number {
  return Math.round((hourly * weeklyHours * 365) / 7);
}

// ── Wales living wage floor ─────────────────────
//
// The Welsh Government applies a Living Wage
// Foundation floor as an advance uplift. Low spine
// points below it (Band 2, Band 3 entry) are lifted to
// it.
// Source: AfC(W) 01/2026 pay letter (#sa-14), 6 Jan 2026 —
// the hourly in its Action paragraph, the annual in its own
// spine-point table.
//
// Both figures below are published by that letter, and
// neither derives from the other: it states the annual
// floor as a set value, not as hourly × hours. Read the
// one you mean — `hourly` to name a rate, `annual` to
// apply the floor.
//
// They do reconcile on the publisher's own week-year:
// £26,300 ÷ (37.5 × 365/7) = £13.4502, the printed
// £13.45. That agreement is a useful check on the
// divisor and NOT a licence to derive one figure from
// the other, because only the publisher's rounding
// makes it land.
//
// One record, not two maps: they are a single published
// pair, and separate maps let a year land in one and not
// the other, or pair a revised floor with a stale rate.

/** The Welsh living-wage floor for a year, as its pay
 *  letter states it. */
export interface WalesLivingWage {
  /** The floor applied to low spine points. */
  readonly annual: number;
  /** The Living Wage Foundation rate the floor is set
   *  against — quotable, never a divisor. */
  readonly hourly: number;
}

export const WALES_LIVING_WAGE: Partial<
  Record<TaxYear, WalesLivingWage>
> = {
  [TAX_YEARS.Y2026_27]: {annual: 26300, hourly: 13.45},
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

/** Every nation's published scale family — each nation its own, even
 *  where the figures coincide. Total over Nation, so adding a nation
 *  is a compile error here rather than a silent fall-through to
 *  England's. */
/**
 * Northern Ireland's ladder: England's salaries, and NOT England's
 * shape at Band 2.
 *
 * HSC (AfC) 06/2025 prints Bands 1 and 2 in its Basic Pay block as
 * single flat figures; its entry/interval/top table starts at Band 3.
 * England's publisher prints Band 2 with an entry point, a two-year
 * interval and a top point. Same cash, different published structure —
 * so NI cannot simply alias England's table, which is the whole reason
 * the two nations' SOURCES are held apart.
 *
 * Every other band is England's, transcribed from a document that
 * prints the same figures.
 */
/**
 * Northern Ireland's ladder, from HSC (AfC) 06/2025 (3 December 2025,
 * effective 1 April 2025).
 *
 * ONE year. NI has issued no 2026-27 AfC pay circular: the Health
 * Minister stated a desire to proceed with 3.3% on 12 February 2026
 * "subject to my budgetary position", and as at the most recent
 * Assembly answer (AQW 49635/22-27, 15 July 2026) he "cannot" pay it
 * "until I have clarity on my Department's budget". HSC staff are
 * still on these rates. The 3.3% is still recorded in `award.ts` —
 * announced and published are different things.
 *
 * The figures are England's for every band, because NI's circular
 * prints the same numbers; they are AUTHORED here rather than derived
 * from `AFC_SCALES` so that NI can diverge without a code change, and
 * so that Band 2 does not depend on an unasserted property of
 * England's table. NI's Basic Pay block prints Bands 1 and 2 as single
 * flat figures and starts its entry/interval/top table at Band 3, so
 * Band 2 is ONE point where England's is two.
 *
 * All 29 values are pinned against the circular in
 * `tests/fixtures/pay-scales.csv`.
 */
const AFC_SCALES_NI: Partial<Record<TaxYear, AfcScaleYear>> = {
  [TAX_YEARS.Y2025_26]: {
    hcas: AFC_SCALES_2025_26.hcas,
    scales: {
      ...AFC_SCALES_2025_26.scales,
      [AFC_BANDS.B2]: [{label: 'Year 1', salary: 24465}],
    },
  },
};


const SCALE_FAMILIES: Record<
  Nation, Partial<Record<TaxYear, AfcScaleYear>>
> = {
  [NATION_KEYS.england]: AFC_SCALES,
  [NATION_KEYS.northernIreland]: AFC_SCALES_NI,
  [NATION_KEYS.scotland]: AFC_SCALES_SCOTLAND,
  [NATION_KEYS.wales]: AFC_SCALES_WALES,
};

/**
 * The document that PUBLISHES each nation's AfC scales for a year.
 *
 * Held per (nation, year), not per nation: a year-blind citation puts
 * the 2026/27 pay-scales page beneath a 2025-26 table, which reads as
 * a claim the reader cannot check.
 *
 * England and Northern Ireland share a salary TABLE and do not share a
 * SOURCE. NI publishes its own circular, with its own issuer, reference
 * and date, and its figures matching England's is a fact about the two
 * publishers rather than a licence to cite one for the other.
 *
 * Northern Ireland has one row, not two: it has published no 2026-27
 * scales, so there is no 2026-27 table to cite.
 */
const AFC_SCALE_SOURCES: Record<
  Nation, Partial<Record<TaxYear, DocumentSource>>
> = {
  [NATION_KEYS.england]: {
    [TAX_YEARS.Y2025_26]: AFC_ENGLAND_SCALES_2025,
    [TAX_YEARS.Y2026_27]: AFC_ENGLAND_SCALES_2026,
  },
  [NATION_KEYS.northernIreland]: {
    // One year, matching the scales. There is no 2026-27 entry because
    // there are no 2026-27 NI scales to cite — a source for a table
    // that does not exist would be the false claim this map exists to
    // prevent.
    [TAX_YEARS.Y2025_26]: AFC_NI_2025,
  },
  [NATION_KEYS.scotland]: {
    // One circular restates both years: PCS(AFC)2026/1 revised the
    // 2025-26 figure when the inflation guarantee triggered and
    // restates 2026-27, so it is current for each.
    [TAX_YEARS.Y2025_26]: AFC_SCOTLAND,
    [TAX_YEARS.Y2026_27]: AFC_SCOTLAND,
  },
  [NATION_KEYS.wales]: {
    [TAX_YEARS.Y2025_26]: AFC_W_02_2025,
    [TAX_YEARS.Y2026_27]: AFC_W_02_2026,
  },
};

/** The circular or page that publishes a nation's AfC scales for a
 *  year. Throws for a combination that has no published scale, in step
 *  with {@link getScalesForYear} — a scale we cannot cite is a scale we
 *  should not be serving. */
export function afcScaleSource(
  year: TaxYear,
  nation: Nation,
): DocumentSource {
  const source = AFC_SCALE_SOURCES[nation][year];
  if (!source) {
    throw new ScaleUnavailable(nation, year);
  }
  return source;
}

/** Tax years a given nation publishes AfC scales for, oldest
 *  first. Nations do not move in lockstep — a year one has
 *  published may be outstanding for another — so a caller
 *  resolving figures for a nation must ask for that nation's
 *  years rather than assuming England's. */
export function afcTaxYears(nation: Nation): TaxYear[] {
  // Sorted, not authoring order: the "oldest first" above is a
  // guarantee callers rely on (`resolver.ts` reverses it to find the
  // latest year), and object-literal order would silently break it if
  // a new year were authored above an old one. Tax-year labels sort
  // lexicographically because they are zero-padded ISO-style.
  return (
    Object.keys(SCALE_FAMILIES[nation]) as TaxYear[]
  ).sort();
}

/**
 * The most recent year a nation has actually published AfC scales for.
 *
 * Nations do not move together. Northern Ireland has issued no 2026-27
 * pay circular — its 3.3% is announced, unfunded and undated — so its
 * latest published year is 2025-26 while the other three are on
 * 2026-27. A consumer that asks for a site-wide "current year" gets
 * `ScaleUnavailable` there, which is correct but is not an answer; this
 * is the answer.
 *
 * Lives here rather than in a consumer because it is a fact about what
 * this library holds. A consumer deriving it would be re-computing,
 * from the outside, something only these tables know.
 */
/**
 * How far a nation's newest published pay scales sit from the tax year
 * in force. Positive means the pay scales are BEHIND.
 *
 * ## The domain rule this exists to state
 *
 * A person's salary comes from an Agenda for Change round; the tax, NI
 * and pension tiers applied to it come from the tax year they are
 * being paid IN. Those are different facts, and they normally name the
 * same year — which is why one value was long used for both, and why
 * the day they diverge nothing complains.
 *
 * They diverge in exactly one way. An AfC round is agreed and
 * implemented by each nation separately, and a nation whose award is
 * not yet funded keeps paying last year's scales into this tax year.
 * Northern Ireland is doing that now. Tax never waits: the thresholds
 * change on 6 April whatever the employer has settled.
 *
 * So the legitimate values are:
 *
 * | lag | meaning |
 * |---|---|
 * | `0` | the award is implemented; pay year and tax year agree |
 * | `1` | the award for this year is not yet in payment |
 * | `-1` | next year's circular is out but its tax year has not begun |
 *
 * Anything else is a defect in THIS library's data, not a fact about
 * the world: a lag of 2 means a whole round was never transcribed.
 * {@link assertPayYearLagIsSane} is where that is enforced.
 *
 * The one thing this CANNOT catch is the mistake it was written after:
 * passing a pay year where a tax year was wanted. Both are `TaxYear`,
 * so both type-check, and the values here would look perfectly legal.
 * Only distinct types would stop that.
 */
export function payYearLag(nation: Nation): number {
  const order = Object.values(TAX_YEARS);
  const pay = order.indexOf(latestAfcYear(nation));
  const tax = order.indexOf(CURRENT_TAX_YEAR);
  invariant(
    pay >= 0 && tax >= 0,
    `payYearLag: ${nation} resolves a year outside TAX_YEARS`,
  );
  return tax - pay;
}

/**
 * True while a nation is still paying an older round than the tax year
 * in force — its award is announced or awaited, but not in payment.
 *
 * The domain question ("is this nation behind?") rather than a
 * comparison against some particular year, so a consumer cannot get
 * the comparison subtly wrong: testing against a fixed year answers
 * "is it exactly 2025-26" and quietly says no for a nation two rounds
 * behind, which is the case that most needs saying yes.
 */
export function isAwaitingPayAward(nation: Nation): boolean {
  return payYearLag(nation) > 0;
}

/**
 * Fail loudly if any nation's pay scales have drifted further from the
 * tax year than the domain allows. See {@link payYearLag}.
 *
 * A function rather than a module-scope check: this library is
 * published, and a throw at import time would take down every consumer
 * over a data problem they cannot fix. It runs in this repo's tests,
 * which is where a transcription gap should surface.
 */
export function assertPayYearLagIsSane(): void {
  for (const nation of Object.keys(SCALE_FAMILIES) as Nation[]) {
    const lag = payYearLag(nation);
    invariant(
      lag >= -1 && lag <= 1,
      `${nation} is ${lag} years from the tax year in force `
      + `(${CURRENT_TAX_YEAR}): its newest published scale is `
      + `${latestAfcYear(nation)}. A gap beyond one year means a pay `
      + 'round was never transcribed, not that a nation skipped one.',
    );
  }
}

export function latestAfcYear(nation: Nation): TaxYear {
  const years = afcTaxYears(nation);
  const latest = years[years.length - 1];
  if (!latest) {
    // A plain Error, not ScaleUnavailable: that type's `year` is a
    // TaxYear, and there is no year to name here. Casting a filler
    // string into the union would make `error.year` lie to any caller
    // that reads it.
    throw new Error(
      `latestAfcYear: ${nation} publishes no AfC scale in any year`,
    );
  }
  return latest;
}

/** Resolve a nation's published scale table for a year.
 *  Every figure returned is transcribed from that nation's
 *  own instrument. Where two nations' circulars print the
 *  same numbers the tables share an object literal for
 *  brevity, and each nation's fixture rows pin its values
 *  against its OWN document, so a divergence fails rather
 *  than propagating. Throws {@link ScaleUnavailable} for a
 *  year that nation has not published, rather than silently
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
