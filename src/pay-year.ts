/**
 * The first day of a pay year. Its own module, importing nothing but the
 * invariant, so a cited document, the award table and the pay rounds can
 * all date a pay year without a cycle between them.
 */

import type {PayYear} from '@casomoltd/paye-calc';
import {invariant} from './errors.js';

/** The month a pay year opens in: April, as a JavaScript month index. */
const APRIL = 3;
const START_YEAR_DIGITS = 4;

/**
 * The day a pay year starts: 1 April of the year it opens in. Not 6 April:
 * a pay year is not a tax year, and every award's `effectiveFrom` says so.
 * A local date, so a reader's calendar day is the day this names.
 */
export function payYearStartDate(year: PayYear): Date {
  const startYear = Number(year.slice(0, START_YEAR_DIGITS));
  invariant(
    Number.isInteger(startYear),
    `payYearStartDate: '${year}' does not start with a four-digit year`,
  );
  return new Date(startYear, APRIL, 1);
}
