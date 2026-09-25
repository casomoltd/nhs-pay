/**
 * Buying additional pension in the 2015 Scheme: how much a member would
 * buy now for a pension they want when they draw it, and what it costs.
 *
 * Additional pension is bought in units of £250 a year, valued at the date
 * the election is made, and priced from GAD's purchase tables
 * (`src/gad/additional-pension-*.ts`): a single lump sum, or monthly
 * instalments over whole years ending before the Normal Pension Age.
 *
 * Once bought it is 2015 Scheme pension, revalued by each year's Order
 * for prices alone (without the 1.5 the main pension adds) until it is
 * paid, and taken early or late on the factors GAD publishes for it,
 * read through `readFactor`.
 *
 * Sources: the workbook (tables 0-703, 0-712 to 0-719, 0-422) and
 * NHSBSA's additional pension factsheet (the limit and the unit) — see
 * docs/source-archive.md.
 */

import {periodInYearsMonths} from './dates.js';
import {
  ADDITIONAL_PENSION_REFUSALS,
  AdditionalPensionUnavailable,
  invariant,
} from './errors.js';
import {FACTOR_APPLIES} from './factor-basis.js';
import {AP_0_703} from './gad/additional-pension-0-703-2023-10-03.js';
import {AP_0_712} from './gad/additional-pension-0-712-2023-10-03.js';
import {AP_0_713} from './gad/additional-pension-0-713-2023-10-03.js';
import {AP_0_714} from './gad/additional-pension-0-714-2023-10-03.js';
import {AP_0_715} from './gad/additional-pension-0-715-2023-10-03.js';
import {AP_0_716} from './gad/additional-pension-0-716-2023-10-03.js';
import {AP_0_717} from './gad/additional-pension-0-717-2023-10-03.js';
import {AP_0_718} from './gad/additional-pension-0-718-2023-10-03.js';
import {AP_0_719} from './gad/additional-pension-0-719-2023-10-03.js';
import type {
  AdditionalPensionCover,
  AdditionalPensionProvenance,
  InstalmentTableData,
} from './gad/additional-pension-table.js';
import {isoDate, isoToDate} from './iso-date.js';
import {normalPensionAge} from './npa.js';
import {inflationFactor, TODAYS_MONEY_CPI} from './pension/prices.js';
import {factor2015} from './sections/section-2015.js';
import {AP_FACTSHEET_2026} from './sources.js';

/** The unit additional pension is bought in, a year, per
 *  `AP_FACTSHEET_2026`. */
export const ADDITIONAL_PENSION_UNIT = 250;

/**
 * The most additional pension a member may buy, a year, between `from`
 * and `until`; it is uprated by Treasury order each April. It is an
 * overall limit, so earlier purchases count against it; this library
 * prices one purchase and cannot see a member's earlier ones.
 *
 * `until` is the first day of the month the next uprating is expected
 * in: the day it takes effect has not been read at source, so an
 * election that month is refused rather than priced on a stale limit.
 */
export const ADDITIONAL_PENSION_LIMIT = {
  annual: 9_053,
  from: isoDate('2026-04-01'),
  until: isoDate('2027-04-01'),
  source: AP_FACTSHEET_2026,
} as const;

/** How a purchase is paid for. */
export const ADDITIONAL_PENSION_PAYMENTS = {
  /** One premium, at the election. */
  lumpSum: 'lump-sum',
  /** Monthly, from pay, for whole years ending before the pension age. */
  instalments: 'instalments',
} as const;

export type AdditionalPensionPayment =
  | {readonly kind: typeof ADDITIONAL_PENSION_PAYMENTS.lumpSum}
  | {
    readonly kind: typeof ADDITIONAL_PENSION_PAYMENTS.instalments;
    readonly years: number;
  };

/** One priced purchase. */
export interface AdditionalPensionPurchase {
  /** The pension bought, a year, at the date of election. */
  readonly annual: number;
  readonly cover: AdditionalPensionCover;
  readonly payment: AdditionalPensionPayment;
  /** The lump sum, or each monthly instalment, in pounds and pence. */
  readonly cost: number;
  /** The table the price was read from. */
  readonly table: AdditionalPensionProvenance;
}

/** Every instalment table. Looked up by the pension age and cover each
 *  carries, so a table can be found only by what it says it is. */
const INSTALMENT_TABLES: readonly InstalmentTableData[] = [
  AP_0_712, AP_0_713, AP_0_714, AP_0_715,
  AP_0_716, AP_0_717, AP_0_718, AP_0_719,
];

/** The first day both the tables and the limit hold for. */
const PRICED_FROM = AP_0_703.provenance.implemented > ADDITIONAL_PENSION_LIMIT.from
  ? AP_0_703.provenance.implemented
  : ADDITIONAL_PENSION_LIMIT.from;

const refuse = (
  code: keyof typeof ADDITIONAL_PENSION_REFUSALS,
  detail: string,
): never => {
  throw new AdditionalPensionUnavailable(ADDITIONAL_PENSION_REFUSALS[code],
    detail);
};

const roundToPenny = (pounds: number) => Math.round(pounds * 100) / 100;

/** The factor at an age and column, or the refusal naming what is
 *  missing. */
function priceAt<T>(
  rows: readonly T[],
  firstAge: number,
  age: number,
  read: (row: T) => number | undefined,
  what: string,
): number {
  const row = rows[age - firstAge];
  const value = row === undefined ? undefined : read(row);
  return value ?? refuse('outsideTable', `${what} prints no price at age ${age}`);
}

/**
 * The price of buying `annual` a year of additional pension, as a lump
 * sum or monthly instalments, read from GAD's tables at the member's age
 * last birthday on the date of election ("age when notice of election is
 * given"). The instalment table is the one for the member's own Normal
 * Pension Age, from their date of birth.
 *
 * Refused, by code: an amount off the £250 unit or over the limit, an
 * election outside the dates the tables and the limit hold for, or an
 * age or period the table does not print.
 */
export function additionalPensionCost(input: {
  readonly annual: number;
  readonly dateOfBirth: Date;
  readonly election: Date;
  readonly cover: AdditionalPensionCover;
  readonly payment: AdditionalPensionPayment;
}): AdditionalPensionPurchase {
  const {annual, cover, payment, election, dateOfBirth} = input;
  const wholeUnits = annual > 0 && annual % ADDITIONAL_PENSION_UNIT === 0;
  if (!wholeUnits) {
    refuse('offUnit', `additional pension is bought in £`
      + `${ADDITIONAL_PENSION_UNIT} units, not £${annual}`);
  }
  if (annual > ADDITIONAL_PENSION_LIMIT.annual) {
    refuse('overLimit', `£${annual} a year is over the `
      + `£${ADDITIONAL_PENSION_LIMIT.annual} limit`);
  }
  const outsidePricedDates = election < isoToDate(PRICED_FROM)
    || election >= isoToDate(ADDITIONAL_PENSION_LIMIT.until);
  if (outsidePricedDates) {
    refuse('outsideDates', `no tables and limit for an election on `
      + election.toDateString());
  }
  const units = annual / ADDITIONAL_PENSION_UNIT;
  const age = periodInYearsMonths(dateOfBirth, election).years;
  if (payment.kind === ADDITIONAL_PENSION_PAYMENTS.lumpSum) {
    const factor = priceAt(AP_0_703.rows, AP_0_703.firstAge, age,
      (row) => row[cover], 'Table 0-703');
    return {annual, cover, payment, cost: roundToPenny(units * factor),
      table: AP_0_703.provenance};
  }
  invariant(Number.isInteger(payment.years) && payment.years >= 1,
    `instalments run for whole years, not ${payment.years}`);
  const npa = normalPensionAge(dateOfBirth);
  const table = INSTALMENT_TABLES.find(
    (t) => t.npa === npa && t.cover === cover);
  invariant(table !== undefined,
    `no instalment table for a Normal Pension Age of ${npa}`);
  const factor = priceAt(table.rows, table.firstAge, age,
    (row) => row[payment.years - 1],
    `Table ${table.provenance.tableRef} over ${payment.years} years`);
  return {annual, cover, payment, cost: roundToPenny(units * factor),
    table: table.provenance};
}

/**
 * How much additional pension to buy now, a year, for `wanted` a year
 * when it is drawn, in today's money, for a member paying in until they
 * leave on the day they draw.
 *
 * Additional pension keeps pace with prices and no more: each Order's
 * price change, with no 1.5 added, while in service (the "AP index
 * adjustment", SI 2015/94 Sch 9 para 1) and in the leaving year (para
 * 4). So in today's money it does not grow between the election and
 * the drawing, where the rest of the 2015 pension gains 1.5% a year.
 * Then the early or late factor for additional pension at the drawing.
 * Rounded UP to whole £250 units: the smallest purchase that reaches
 * the amount wanted.
 *
 * Refused: a member who leaves before drawing (deferred growth is not
 * modelled), or a purchase over the limit.
 */
export function additionalPensionToBuy(input: {
  readonly wanted: number;
  readonly dateOfBirth: Date;
  readonly election: Date;
  readonly leaving: Date;
  readonly drawing: Date;
}): number {
  const {wanted, dateOfBirth, election, leaving, drawing} = input;
  invariant(wanted > 0, `wanted must be positive, not ${wanted}`);
  invariant(drawing > election, 'the pension is drawn after it is bought');
  const leavesBeforeDrawing = leaving.getTime() !== drawing.getTime();
  if (leavesBeforeDrawing) {
    refuse('leftBeforeDrawing', 'growth for a member who leaves before '
      + 'drawing is not modelled');
  }
  const growth = inflationFactor(drawing, election, TODAYS_MONEY_CPI);
  const {factor} = factor2015(dateOfBirth, drawing,
    FACTOR_APPLIES.additionalPension);
  const now = wanted / (growth * factor);
  const annual = Math.ceil(now / ADDITIONAL_PENSION_UNIT)
    * ADDITIONAL_PENSION_UNIT;
  if (annual > ADDITIONAL_PENSION_LIMIT.annual) {
    refuse('overLimit', `£${annual} a year would be needed, over the `
      + `£${ADDITIONAL_PENSION_LIMIT.annual} limit`);
  }
  return annual;
}
