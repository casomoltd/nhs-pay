/**
 * Where the walk starts, and what it starts from.
 *
 * This is the ENTIRETY of the statement-versus-estimation
 * difference: the two input variants are read exactly once, here,
 * to fill this object, and nothing downstream may ask which
 * produced it.
 */

import {invariant} from '../errors.js';

declare const SCHEME_YEAR_END: unique symbol;

/**
 * A scheme year, named by the calendar year its 31 March falls in: 2026
 * means 1 April 2025 to 31 March 2026.
 *
 * Branded because the number has a twin: paye-calc's `TaxYearEnd` names a
 * tax year by the year its 5 April falls in, a bare number of the same
 * size, and passing one for the other moves every date by five days. Each
 * brand makes the other a compile error. A `SchemeYearEnd` comes only from
 * {@link schemeYearEnd} or a function here that returns one; arithmetic on
 * one gives a plain number, which is minted again to be used as one.
 */
export type SchemeYearEnd =
  number & {readonly [SCHEME_YEAR_END]: 'scheme-year-end'};

/** The month a scheme year ends in, as `Date` counts months from nought:
 *  March. */
const MARCH_MONTH_INDEX = 2;
/** The month a scheme year opens in: April. */
const APRIL_MONTH_INDEX = 3;
/** The day of March a scheme year ends on. */
const LAST_DAY_OF_SCHEME_YEAR = 31;
/** The day of April a scheme year opens on. */
const FIRST_DAY_OF_SCHEME_YEAR = 1;
/** The years a mint accepts: four digits, since `Date` reads a year below
 *  100 as one in the 1900s. */
const FIRST_YEAR = 1000;
const LAST_YEAR = 9999;

/** Read `year` as the calendar year a scheme year ends in — the only way
 *  to mint a {@link SchemeYearEnd} from a number. Throws RangeError for a
 *  year that is not a whole four-digit year. */
export function schemeYearEnd(year: number): SchemeYearEnd {
  if (!Number.isInteger(year) || year < FIRST_YEAR || year > LAST_YEAR) {
    throw new RangeError(
      `schemeYearEnd: ${year} is not a whole four-digit year`);
  }
  return year as SchemeYearEnd;
}

/** The scheme year after `year`. */
export function schemeYearAfter(year: SchemeYearEnd): SchemeYearEnd {
  return schemeYearEnd(year + 1);
}

/** The scheme year before `year`. */
export function schemeYearBefore(year: SchemeYearEnd): SchemeYearEnd {
  return schemeYearEnd(year - 1);
}

/** An initial condition, not an abstraction. */
export interface LedgerSeed {
  /** Nominal £/yr already banked at the close of
   * `atSchemeYearEnd`. Zero when there is nothing to start
   * from. */
  readonly opening: number;
  /** The scheme year the opening balance sits AT. The walk
   * starts at the year after this one. */
  readonly atSchemeYearEnd: SchemeYearEnd;
  /** The date service actually begins INSIDE the first walked
   * year, when that year is a part year — null when it is whole.
   * Only the join route can produce a value here: a statement
   * lands on a scheme year end, so the year after it is always
   * whole. The first year's PAY is scaled by this; the 1/54
   * divisor never is. */
  readonly accruingFrom: Date | null;
  /** Whether `opening` is the scheme's own figure or ours. No
   * arithmetic reads this — it exists so a consumer can tell a
   * figure a member could check against paper from one this
   * library produced. */
  readonly basis: 'given' | 'derived';
}

/**
 * The first scheme year a walk from this seed produces.
 *
 * The seed is a balance standing AT a year end, so the walk opens
 * on the year after it. Both the ledger and the illustrative
 * run-up need that year — one to start its loop, the other to
 * decide there is anything to draw — and a rule spelled out twice
 * is a rule that can drift, so it is read from the seed that
 * carries it.
 */
export function firstWalkedYear(seed: LedgerSeed): SchemeYearEnd {
  return schemeYearAfter(seed.atSchemeYearEnd);
}

/**
 * The scheme year a date falls in, named by the year it ENDS.
 *
 * The cycle is the scheme's own — 1 April to 31 March — and it
 * is the same one an Annual Benefit Statement closes on: a
 * statement marked *Updated To 31/03/2025* reports scheme year
 * 2025, so its figure seeds that row's close untouched. 1 Apr
 * 2025 and 31 Mar 2026 are both scheme year 2026.
 */
export function schemeYearEndFor(date: Date): SchemeYearEnd {
  return schemeYearEnd(date.getMonth() >= APRIL_MONTH_INDEX
    ? date.getFullYear() + 1
    : date.getFullYear());
}

/** 31 March of the given scheme year. */
export function schemeYearEndDate(year: SchemeYearEnd): Date {
  return new Date(year, MARCH_MONTH_INDEX, LAST_DAY_OF_SCHEME_YEAR);
}

/** 1 April opening the given scheme year. */
export function schemeYearStartDate(year: SchemeYearEnd): Date {
  return new Date(year - 1, APRIL_MONTH_INDEX, FIRST_DAY_OF_SCHEME_YEAR);
}

/**
 * The scheme year that had already CLOSED by `date` — the year
 * a balance stated on that date belongs to.
 *
 * Taking the day after makes 31 March land on the year it ends
 * rather than the one before it. Shared with the caller that
 * picks the real-terms anchor, which has to know the seed's year
 * BEFORE a `Prices` exists to build the seed with.
 */
export function schemeYearClosedBy(date: Date): SchemeYearEnd {
  const dayAfter = new Date(
    date.getFullYear(), date.getMonth(), date.getDate() + 1,
  );
  return schemeYearBefore(schemeYearEndFor(dayAfter));
}

/**
 * Route 1: the scheme has already told us the balance.
 *
 * Precondition: `statementDate` IS a scheme year end (31 March).
 * A mid-year statement date is a caller error, not a value to
 * round — the accrued figure would not correspond to any closing
 * balance. Throw; never silently snap to a year end.
 *
 * Yields basis 'given', and `accruingFrom` null: the first walked
 * year is the one AFTER the statement's, which is always whole.
 */
export function seedFromStatement(
  accruedPension: number,
  statementDate: Date,
): LedgerSeed {
  invariant(
    statementDate.getMonth() === MARCH_MONTH_INDEX
      && statementDate.getDate() === LAST_DAY_OF_SCHEME_YEAR,
    'statementDate must be a scheme year end (31 March), got '
      + statementDate.toDateString(),
  );
  return {
    opening: accruedPension,
    atSchemeYearEnd: schemeYearEnd(statementDate.getFullYear()),
    accruingFrom: null,
    basis: 'given',
  };
}

/**
 * Route 2: we compute the balance from the beginning.
 *
 * Opening is zero and the walk starts in the join date's own
 * scheme year, which is a PART year whenever the member did not
 * join on 1 April — hence `accruingFrom`, which scales that
 * year's pay.
 */
export function seedFromJoinDate(joinDate: Date): LedgerSeed {
  return {
    opening: 0,
    atSchemeYearEnd: schemeYearBefore(schemeYearEndFor(joinDate)),
    accruingFrom: joinDate,
    basis: 'derived',
  };
}
