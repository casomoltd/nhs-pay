/**
 * Calendar-date arithmetic. Package-private: consumed by the
 * projection, the ledger and the uplift rule, deliberately not
 * exported from the package root — consumers get scenario-level
 * APIs, not date plumbing.
 *
 * Three distinct period policies live here ON PURPOSE — do not
 * unify them:
 *  - periodInYearsMonths: complete calendar months on the
 *    day-clamped anniversary convention (the UK
 *    corresponding-date rule, Dodds v Walker [1981]) — what GAD
 *    factor lookups require.
 *  - yearsBetween: fractional 365.25-day years — what continuous
 *    compounding (revaluation, CPI deflation) requires.
 *  - monthsCountingPart: complete months with a part month of 16
 *    days or more counting as one — the scheme's count for a
 *    leaver's final year and the Treasury's for a first increase.
 * Feeding one into the other's consumer corrupts results.
 *
 * The platform has no period/duration type; Temporal
 * (PlainDate.until) is the coming standard and is used as a
 * dev-only test oracle (tests/period-oracle.test.ts). Migrate to
 * it when Node ships Temporal unflagged.
 */

import {invariant} from './errors.js';

/** Months in a year, and in a scheme year. */
export const MONTHS_PER_YEAR = 12;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 365.25 * MS_PER_DAY;

/**
 * Days a part month must reach to count as a whole one: SI 2015/94
 * Sch 9 para 3(3) counts "an incomplete month that consists of at
 * least 16 days" as complete, and HM Treasury's Pensions Increase
 * tables band a pension's first increase the same way.
 */
const PART_MONTH_COUNTS_AT_DAYS = 16;

/**
 * Calculate the period between two dates in complete years and
 * months plus remaining days, on the anniversary convention: a
 * month completes on the day-clamped monthly anniversary of
 * `from` (so 31 Jan → 28 Feb is one complete month). Requires
 * two valid Dates and `from <= to`; the postcondition invariant
 * guards the contract a calendar period must satisfy, because a
 * period with negative days for a month-end date would silently
 * defeat the ERF round-up downstream.
 */
export function periodInYearsMonths(
  from: Date,
  to: Date,
): { years: number; months: number; days: number } {
  /* Checked before any arithmetic, and neither date is named by
     VALUE. An invalid Date makes every figure below NaN, so the
     closing invariant fires — and its message is built before
     `invariant` judges the condition, interpolating
     `toISOString()`, which throws RangeError on an invalid Date.
     The input that most needs a diagnostic is the one that would
     lose it. Guarding here is also what makes that interpolation
     total: toISOString throws only on a NaN time value, and
     nothing below can mint one. */
  invariant(
    !Number.isNaN(from.getTime()),
    'periodInYearsMonths: invalid from',
  );
  invariant(
    !Number.isNaN(to.getTime()),
    'periodInYearsMonths: invalid to',
  );
  let totalMonths =
    (to.getFullYear() - from.getFullYear()) * MONTHS_PER_YEAR
    + (to.getMonth() - from.getMonth());
  if (addMonthsClamped(from, totalMonths) > to) {
    totalMonths -= 1;
  }
  const anniversary = addMonthsClamped(from, totalMonths);
  // Round absorbs the ±1h a DST boundary shifts local midnight.
  const days = Math.round(
    (to.getTime() - anniversary.getTime()) / MS_PER_DAY,
  );
  const years = Math.floor(totalMonths / MONTHS_PER_YEAR);
  const months = totalMonths % MONTHS_PER_YEAR;

  invariant(
    years >= 0 && months >= 0 && months < MONTHS_PER_YEAR
      && days >= 0 && days <= 31,
    `periodInYearsMonths produced an invalid period `
      + `${years}yr ${months}mo ${days}d for `
      + `${from.toISOString()} → ${to.toISOString()}`,
  );
  return {years, months, days};
}

/**
 * Months from `from` to `to`, a part month of at least 16 days
 * counting as one: the scheme's count for a leaver's final year and
 * the Treasury's for a pension's first increase.
 */
export function monthsCountingPart(from: Date, to: Date): number {
  if (to <= from) return 0;
  const {years, months, days} = periodInYearsMonths(from, to);
  const partCounts = days >= PART_MONTH_COUNTS_AT_DAYS;
  return years * MONTHS_PER_YEAR + months + (partCounts ? 1 : 0);
}

/** The day after `date`: the end of a last day, as a period's end. */
export function dayAfter(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

/** Fractional years between two dates, in 365.25-day years —
 * for compounding, never for factor-table lookups (see the
 * module header). */
export function yearsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_YEAR;
}

/**
 * NPA date = date of birth + NPA years. A 29 Feb birth date in
 * a non-leap target year rolls over to 1 Mar via the Date
 * constructor — DELIBERATE: that is the E&W age-attainment
 * convention (a person born 29 Feb attains an age on 1 Mar in a
 * common year), so do not "fix" this with day-clamping, which
 * would move NPA a day earlier to 28 Feb.
 */
export function npaDate(
  dateOfBirth: Date,
  npa: number,
): Date {
  return new Date(
    dateOfBirth.getFullYear() + npa,
    dateOfBirth.getMonth(),
    dateOfBirth.getDate(),
  );
}

/** The earliest of some dates. */
export function earliest(...dates: readonly Date[]): Date {
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}

/** `date` plus `n` months, day-of-month clamped to the target
 * month's length (31 Jan + 1mo = 28 Feb). */
function addMonthsClamped(date: Date, n: number): Date {
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + n + 1,
    0,
  ).getDate();
  return new Date(
    date.getFullYear(),
    date.getMonth() + n,
    Math.min(date.getDate(), lastDay),
  );
}
