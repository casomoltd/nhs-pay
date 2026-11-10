/**
 * A member's pension input, tax year by tax year, set against the standard
 * Annual Allowance. Each year's arrangements are valued by
 * `MemberBenefits.pensionInputPeriod`, paye-calc works their defined
 * benefit input (`definedBenefitInput`, HMRC PTM053301), and money purchase
 * contributions are added as paid.
 *
 * An estimate, not a model of the allowance: carry forward, the taper, the
 * charge and Scheme Pays are out of scope. It says only whether a year's
 * input runs over the allowance, reading each tax year from today's to the
 * one the member leaves in, less one opening before the member's statement
 * (`firstYearOver`). Both are in today's money: each year is valued at no
 * future inflation and set against the standard allowance the caller
 * passes. That is a stated simplifying assumption, not the law: the
 * allowance is a fixed sum of cash (Finance Act 2004 s.228), so as prices
 * rise its real value falls, and in later years the real limit is lower
 * than the one read here.
 *
 * The same assumption reads a 2015 Section leaving year low: with no
 * inflation the part-year leaver revaluation is the revaluation bonus
 * alone, where at a positive CPI it is CPI plus that bonus, and the input's
 * nil floor stops the next year making up for it. So a member over only in
 * the year they leave can pass here. Modelling the allowance in full
 * (carry forward, the taper and a nominal path) settles this.
 */
import {
  definedBenefitInput, taxYearEnd, taxYearEndFor,
} from '@casomoltd/paye-calc';
import type {PensionInputPeriod, TaxYearEnd} from '@casomoltd/paye-calc';
import {BeforeStatement, invariant, STATEMENT_READS} from '../errors.js';
import {isoDateOf} from '../iso-date.js';
import {TODAYS_MONEY_CPI} from '../pension/prices.js';
import type {MemberBenefits, RemedyBasis} from './types.js';

export interface AllowanceReading {
  readonly input: number;
  readonly allowance: number;
  readonly status: AllowanceStatus;
}

/** One tax year's reading, on one McCloud option. */
export interface AllowanceYear {
  /** The calendar year the tax year ends in: 2028 for 2027-28. */
  readonly taxYearEnd: TaxYearEnd;
  readonly basis: RemedyBasis;
  readonly reading: AllowanceReading;
}

/** What the years are read from: the member's benefits, which name the
 *  options compared (`elections`), and the years they serve. */
export interface AllowanceInput {
  /** The member's benefits as the caller built them, on the caller's
   *  reading of the past years. Whatever CPI they were built at, each year
   *  is read at no future inflation: `pensionInputPeriod` takes its CPI per
   *  call. */
  readonly benefits: MemberBenefits;
  readonly today: Date;
  /** The last day of service. */
  readonly leaving: Date;
  /** Paid into money purchase pots each year, in today's money: the same
   *  sum every year, with no uplift. */
  readonly contributions: number;
  /** The standard allowance: the taper is out of scope, so a caller never
   *  passes a tapered figure. */
  readonly allowance: number;
}

export const ALLOWANCE_STATUS = {
  over: 'over',
  clear: 'clear',
} as const;
export type AllowanceStatus =
  (typeof ALLOWANCE_STATUS)[keyof typeof ALLOWANCE_STATUS];

/**
 * A year's estimated pension input against `allowance`: the defined benefit
 * input of `period` plus `contributions`, paid into money purchase pots in
 * the year (a SIPP, an AVC). Only an input over the allowance is charged,
 * so one at the allowance itself is clear.
 */
export function allowanceReading(
  period: PensionInputPeriod,
  contributions: number,
  allowance: number,
): AllowanceReading {
  const input = definedBenefitInput(period) + contributions;
  const status = input > allowance
    ? ALLOWANCE_STATUS.over : ALLOWANCE_STATUS.clear;
  return {input, allowance, status};
}

/** The first tax year whose input runs over the allowance on any option
 *  compared, or null where none does. The years read are each tax year from
 *  the one `today` falls in to the one the member leaves in, that last one
 *  a leaver's part year closing on the leaving date; the first is skipped
 *  where it opens before the member's statement (`periodRead`). */
export function firstYearOver(input: AllowanceInput): AllowanceYear | null {
  const {contributions, allowance, benefits: {elections}} = input;
  // With no option to read, every year would come back clear.
  invariant(elections.length > 0, 'firstYearOver: no option to read');
  // The leaving year is valued as a leaver's part year, closing on the
  // leaving date, rather than a whole year in service.
  const leaving = isoDateOf(input.leaving);
  const last = taxYearEndFor(input.leaving);
  const first = taxYearEndFor(input.today);
  for (
    let year = first;
    year <= last;
    year = taxYearEnd(year + 1)
  ) {
    for (const basis of elections) {
      const period = periodRead(
        input.benefits, {year, first}, {leaving, remedy: {kind: basis}},
      );
      if (period === null) continue;
      const reading = allowanceReading(period, contributions, allowance);
      if (reading.status === ALLOWANCE_STATUS.over) {
        return {taxYearEnd: year, basis, reading};
      }
    }
  }
  return null;
}

/** A tax year's pension input, or null for the first year read where it
 *  opens before the member's statement: a statement gives no balance before
 *  its 31 March, so the library refuses that year. Read from today on, that
 *  can only be the tax year today falls in, asked between the statement's
 *  31 March and 5 April; a refusal of any other year is thrown on. */
function periodRead(
  benefits: MemberBenefits,
  {year, first}: {readonly year: TaxYearEnd; readonly first: TaxYearEnd},
  choices: Parameters<MemberBenefits['pensionInputPeriod']>[1],
): PensionInputPeriod | null {
  try {
    return benefits.pensionInputPeriod(year, choices, TODAYS_MONEY_CPI);
  } catch (error) {
    const yearOpensBeforeStatement = error instanceof BeforeStatement
      && error.read === STATEMENT_READS.balance && year === first;
    if (yearOpensBeforeStatement) return null;
    throw error;
  }
}
