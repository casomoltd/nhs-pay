/**
 * Calendar-date arithmetic. Package-private: consumed by
 * pension-projection, deliberately not exported from the package
 * root — consumers get scenario-level APIs, not date plumbing.
 *
 * Two distinct period policies live here ON PURPOSE — do not
 * unify them:
 *  - periodInYearsMonths: complete calendar months on the
 *    day-clamped anniversary convention (the UK
 *    corresponding-date rule, Dodds v Walker [1981]) — what GAD
 *    factor lookups require.
 *  - yearsBetween: fractional 365.25-day years — what continuous
 *    compounding (revaluation, CPI deflation) requires.
 * Feeding one into the other's consumer corrupts results.
 *
 * The platform has no period/duration type; Temporal
 * (PlainDate.until) is the coming standard and is used as a
 * dev-only test oracle (tests/period-oracle.test.ts). Migrate to
 * it when Node ships Temporal unflagged.
 */

import {invariant} from './errors.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 365.25 * MS_PER_DAY;

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

/**
 * Calculate the period between two dates in complete years and
 * months plus remaining days, on the anniversary convention: a
 * month completes on the day-clamped monthly anniversary of
 * `from` (so 31 Jan → 28 Feb is one complete month). Requires
 * `from <= to`; the postcondition invariant guards the contract
 * a calendar period must satisfy — a naive month-diff-and-borrow
 * here once produced negative days for month-end dates, which
 * silently defeated the ERF round-up downstream.
 */
export function periodInYearsMonths(
  from: Date,
  to: Date,
): { years: number; months: number; days: number } {
  let totalMonths =
    (to.getFullYear() - from.getFullYear()) * 12
    + (to.getMonth() - from.getMonth());
  if (addMonthsClamped(from, totalMonths) > to) {
    totalMonths -= 1;
  }
  const anniversary = addMonthsClamped(from, totalMonths);
  // Round absorbs the ±1h a DST boundary shifts local midnight.
  const days = Math.round(
    (to.getTime() - anniversary.getTime()) / MS_PER_DAY,
  );
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  invariant(
    years >= 0 && months >= 0 && months < 12
      && days >= 0 && days <= 31,
    `periodInYearsMonths produced an invalid period `
      + `${years}yr ${months}mo ${days}d for `
      + `${from.toISOString()} → ${to.toISOString()}`,
  );
  return {years, months, days};
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
