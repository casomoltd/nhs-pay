/**
 * Where the walk starts, and what it starts from.
 *
 * This is the ENTIRETY of the statement-versus-estimation
 * difference: the two input variants are read exactly once, here,
 * to fill this object, and nothing downstream may ask which
 * produced it.
 */

import {invariant} from '../errors.js';

/** An initial condition, not an abstraction. */
export interface LedgerSeed {
  /** Nominal £/yr already banked at the close of
   * `atSchemeYearEnd`. Zero when there is nothing to start
   * from. */
  readonly opening: number;
  /** The scheme year the opening balance sits AT. The walk
   * starts at the year after this one. */
  readonly atSchemeYearEnd: number;
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
 * The scheme year a date falls in, named by the year it ENDS.
 *
 * The cycle is the scheme's own — 1 April to 31 March — and it
 * is the same one an Annual Benefit Statement closes on: a
 * statement marked *Updated To 31/03/2025* reports scheme year
 * 2025, so its figure seeds that row's close untouched. 1 Apr
 * 2025 and 31 Mar 2026 are both scheme year 2026.
 */
export function schemeYearEndFor(date: Date): number {
  return date.getMonth() >= 3
    ? date.getFullYear() + 1
    : date.getFullYear();
}

/** 31 March of the given scheme year. */
export function schemeYearEndDate(schemeYearEnd: number): Date {
  return new Date(schemeYearEnd, 2, 31);
}

/** 1 April opening the given scheme year. */
export function schemeYearStartDate(schemeYearEnd: number): Date {
  return new Date(schemeYearEnd - 1, 3, 1);
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
export function schemeYearClosedBy(date: Date): number {
  const dayAfter = new Date(
    date.getFullYear(), date.getMonth(), date.getDate() + 1,
  );
  return schemeYearEndFor(dayAfter) - 1;
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
    statementDate.getMonth() === 2 && statementDate.getDate() === 31,
    'statementDate must be a scheme year end (31 March), got '
      + statementDate.toDateString(),
  );
  return {
    opening: accruedPension,
    atSchemeYearEnd: statementDate.getFullYear(),
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
    atSchemeYearEnd: schemeYearEndFor(joinDate) - 1,
    accruingFrom: joinDate,
    basis: 'derived',
  };
}
