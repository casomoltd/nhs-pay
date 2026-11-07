/**
 * Where the walk starts, and what it starts from.
 *
 * This is the ENTIRETY of the statement-versus-estimation
 * difference: every route to a seed — a statement, a balance stated
 * on any day, or the join date — is read exactly once, here, to fill
 * this object, and nothing downstream may ask which produced it. The
 * one thing a reader may ask is `answersBefore`, a capability rather
 * than a route: whether a date before the seed has an answer at all,
 * which is the ledger's to know before it reads one.
 */
import {dayAfter, monthsCountingPart} from '../dates.js';
import {invariant} from '../errors.js';
import type {Prices} from './prices.js';
import {pointsToDecimal} from './prices.js';
import {
  schemeYearAfter, schemeYearBefore, schemeYearClosedBy, schemeYearEndDate,
  schemeYearEndFor, schemeYearStartDate,
} from './scheme-year.js';
import type {SchemeYearEnd} from './scheme-year.js';
import {openingUpliftFor} from './uplift.js';

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
  /** Whether the walk can answer for a date before the close of
   * `atSchemeYearEnd`. A walk that opens the membership held
   * nothing then, so it can; a statement gives a balance at its 31
   * March and nothing of the dates before it, so a read there is
   * refused rather than answered with the statement's balance.
   * `seedFromBalanceAt` answers, for `projectPension`'s figure
   * stated on any day: see there. */
  readonly answersBefore: boolean;
  /** Whether `opening` is the scheme's own figure or ours. No
   * arithmetic reads this — it exists so a consumer can tell a
   * figure a member could check against paper from one this
   * library produced. */
  readonly basis: SeedBasis;
}

/** A balance a member was told, and the date it was stated on. */
interface StatedBalance {
  readonly balance: number;
  readonly asOf: Date;
}

/** Whose figure a seed's opening balance is: the scheme's, read off a
 *  statement or stated by the member, or this library's own. */
export const SEED_BASES = {
  given: 'given',
  derived: 'derived',
} as const;

export type SeedBasis = (typeof SEED_BASES)[keyof typeof SEED_BASES];

/**
 * Route 1: the scheme has already told us the balance, at the close
 * of `yearEnd`. A statement is as at 31 March, so its year is all it
 * needs: a mid-year date cannot be expressed.
 *
 * Yields basis 'given', and `accruingFrom` null: the first walked
 * year is the one AFTER the statement's, which is always whole.
 * Nothing before the statement is answered.
 */
export function seedFromStatement(
  accruedPension: number,
  yearEnd: SchemeYearEnd,
): LedgerSeed {
  return givenSeed(accruedPension, yearEnd, false);
}

/**
 * A member's stated balance, on whatever date it is stated —
 * the day they read it, or the day their statement prints. That
 * is a position mid-scheme-year, and a seed is a year-end
 * closing balance, so it has to be carried back to one.
 *
 * In November the April uplift has already been applied to the
 * figure being read, so dividing it out lands on the last
 * year-end closing balance and the walk re-applies it — no
 * double count, and no year of accrual thrown away. On a date
 * before that April the figure already IS the year-end balance
 * and nothing is divided, which is why a statement printed on
 * 31 March passes through untouched.
 *
 * ONE route for both the dated and the undated case, because
 * there is only one question: what was the closing balance at
 * the year end before this date? `seedFromStatement` takes a
 * year end and nothing else; this is what finds one.
 * A balance is read on arbitrary days — a statement printed on
 * 7 November is a real one — though it is valued as at 31 March,
 * so the strict form alone could not serve a figure read today.
 */
export function seedFromBalanceAt(
  {balance, asOf}: StatedBalance,
  exitDate: Date,
  retirementDate: Date,
  prices: Prices,
): LedgerSeed {
  const lastYearEnd = schemeYearClosedBy(asOf);
  /* A figure read after leaving, before the leaving year has closed,
     already holds that year's part slice and its leaver adjustment,
     and the walk would re-walk that year and add both again. Refused
     rather than guessed at. With no month served there is neither,
     and once the year has closed the seed is its closing and the walk
     starts after it: both round-trip. */
  const exitYear = schemeYearEndFor(exitDate);
  const monthsServedBeforeLeaving = monthsCountingPart(
    schemeYearStartDate(exitYear), dayAfter(exitDate),
  );
  const leavingYearStillOpen = lastYearEnd < exitYear;
  const readAfterServingPartOfLeavingYear = asOf > exitDate
    && leavingYearStillOpen
    && monthsServedBeforeLeaving > 0;
  invariant(
    !readAfterServingPartOfLeavingYear,
    `a balance stated on ${asOf.toDateString()}, after leaving on `
      + `${exitDate.toDateString()} in the same scheme year`,
  );
  /* The uplift undone here is the one OPENING year
     `lastYearEnd + 1`, and it is the very object `buildLedger`
     re-applies to that year: inverting the walk exactly is this
     function's only job, so both sides ask `openingUpliftFor`
     rather than each naming the phase, the year and the CPI
     series for themselves. */
  const applied = openingUpliftFor(
    lastYearEnd, exitDate, retirementDate, prices,
  );
  const already = applied.appliedOn <= asOf;
  return seedFromStatedBalance(
    already ? balance / (1 + pointsToDecimal(applied.percent)) : balance,
    lastYearEnd,
  );
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
    answersBefore: true,
    basis: SEED_BASES.derived,
  };
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

/** The first date a walk from `seed` answers on: its close, where it does
 *  not answer before itself (a statement); null where it answers every
 *  date. The one producer the ledger refuses by and the member reports. */
export function answersFrom(seed: LedgerSeed): Date | null {
  return seed.answersBefore ? null : schemeYearEndDate(seed.atSchemeYearEnd);
}

/**
 * A balance a member gave on any day, already carried back to the
 * close of `yearEnd` (see `seedFromBalanceAt`). `projectPension`
 * reads its leaving and today against it, and a leaving can fall
 * before the year end the figure is carried back to, so a date
 * before the seed is answered with the seed's balance. The 31 March
 * rule that refuses such a read binds `memberBenefits`' statement,
 * which never comes through here.
 */
function seedFromStatedBalance(
  balance: number,
  yearEnd: SchemeYearEnd,
): LedgerSeed {
  return givenSeed(balance, yearEnd, true);
}

/** A balance the scheme or the member gave, at the close of `yearEnd`. */
function givenSeed(
  opening: number, yearEnd: SchemeYearEnd, answersBefore: boolean,
): LedgerSeed {
  return {
    opening,
    atSchemeYearEnd: yearEnd,
    accruingFrom: null,
    answersBefore,
    basis: SEED_BASES.given,
  };
}
