/**
 * The final-salary engine the 1995 and 2008 Sections share. What
 * differs between them is statute — the denominator, the pay measure,
 * the lump sum, which factors apply — and each section holds its own
 * rules privately, so no caller can compose a combination the scheme
 * lacks, such as a 60 denominator on best-single-year pay.
 */
import {dayAfter, daysBetween} from '../dates.js';
import type {Factored, FactorOutcome} from '../factor-basis.js';
import type {PayPath} from '../pay-path.js';
import {moneyAt} from '../pension/money.js';
import type {ProjectionMoney} from '../pension/money.js';
import type {Prices} from '../pension/prices.js';
import {
  schemeYearAfter, schemeYearEnd, schemeYearEndFor, schemeYearStartDate,
} from '../pension/scheme-year.js';

/** The fraction of final pay a year of membership earns: an 80th in the
 *  1995 Section, a 60th in the 2008. */
type Denominator = 80 | 60;

/** One section's statute, private to that section: each rule is the
 *  section's own behaviour, so the engine never branches on which
 *  section it is valuing. */
export interface FinalSalaryRules {
  readonly denominator: Denominator;
  readonly payMeasure: PayMeasure;
  /** The age the section's pension is payable unreduced, in whole
   *  years: what its early and late factors are measured from. */
  readonly pensionAge: number;
  /** Whether drawing after `pensionAge` raises the pension. The
   *  section's `pensionFactor` must agree, which
   *  `section-factors.test.ts` asserts. */
  readonly lateUplift: boolean;
  /** Final pay in today's money, measured back from `leaving`. */
  finalPay(payPath: PayPath, leaving: Date): number;
  readonly pensionFactor: FactorFor;
  /** The automatic lump sum, as a multiple of the unreduced pension,
   *  and the factor it is reduced by; null where the section pays
   *  none. */
  readonly automaticLumpSum: {
    readonly multiple: number;
    readonly factor: FactorFor;
  } | null;
}

/** A factor for a final-salary benefit drawn on `drawn`. */
type FactorFor = (
  dateOfBirth: Date, leaving: Date, drawn: Date,
) => FactorOutcome;

/** A window of service valued on final salary, as dates. */
export interface Membership {
  readonly from: Date;
  /** The last day of service in it, inclusive. */
  readonly to: Date;
}

/** A final-salary pension before any factor, and what it is measured
 *  from, in today's money. */
export interface UnreducedPension {
  readonly membership: number;
  readonly finalPay: number;
  readonly pension: number;
  readonly automaticLumpSum: number;
}

/** A final-salary pension and lump sum, before and after factors. */
interface FinalSalaryBenefit {
  readonly pension: Factored;
  readonly automaticLumpSum: Factored<FactorOutcome | null>;
  readonly membership: number;
  readonly finalPay: number;
}

/** How a section measures final pay, named for an award's provenance.
 *  The measuring itself is each section's own `finalPay`. */
export const PAY_MEASURES = {
  bestSingleOf3: 'best-single-of-3',
  meanOf3ConsecutiveIn10: 'mean-of-3-consecutive-in-10',
} as const;

export type PayMeasure = (typeof PAY_MEASURES)[keyof typeof PAY_MEASURES];

/** The years the 1995 Section's best single year is chosen from: the
 *  last three. */
const BEST_SINGLE_OF_YEARS = 3;
/** The consecutive years the 2008 Section's measure averages. */
const CONSECUTIVE_YEARS = 3;
/** The last years those consecutive years must fall inside. */
const CONSECUTIVE_WITHIN_YEARS = 10;
/** The divisor for membership's odd days: see `membershipYears`. */
const DAYS_PER_MEMBERSHIP_YEAR = 365;

/**
 * Value final-salary membership at a drawing.
 *
 * The pension is measured once, on the pay at leaving — final salary
 * linkage: membership may have frozen years earlier, but the pay
 * measure did not. In today's money that is the figure; in cash it is
 * the same figure carried to the drawing date at the assumption, since
 * pay and a deferred legacy pension both move with prices.
 */
export function finalSalaryBenefit(
  rules: FinalSalaryRules,
  {windows, payPath, dateOfBirth, leaving, drawing, prices}: {
    readonly windows: readonly Membership[];
    readonly payPath: PayPath;
    readonly dateOfBirth: Date;
    readonly leaving: Date;
    readonly drawing: Date;
    readonly prices: Prices;
  },
): FinalSalaryBenefit {
  const {
    membership, finalPay: pay, pension: unreduced,
    automaticLumpSum: unreducedLump,
  } = unreducedPension(rules, windows, payPath, leaving);
  const pensionFactor = rules.pensionFactor(dateOfBirth, leaving, drawing);
  const lump = rules.automaticLumpSum;
  const lumpFactor = lump === null
    ? null
    : lump.factor(dateOfBirth, leaving, drawing);
  const lumpSum = lumpFactor === null ? 0 : unreducedLump * lumpFactor.factor;
  const money = (real: number): ProjectionMoney =>
    moneyAt({real, nominal: prices.payAt(real, drawing)}, drawing);
  return {
    pension: {
      beforeFactor: money(unreduced),
      after: money(unreduced * pensionFactor.factor),
      factor: pensionFactor,
    },
    automaticLumpSum: {
      beforeFactor: money(unreducedLump),
      after: money(lumpSum),
      factor: lumpFactor,
    },
    membership,
    finalPay: pay,
  };
}

/**
 * A final-salary pension before any factor, in today's money: the
 * membership, over the denominator, times final pay measured back from
 * `leaving`. The one place the formula is written, so the pension
 * held today and the pension drawn cannot come to disagree.
 */
export function unreducedPension(
  rules: FinalSalaryRules,
  windows: readonly Membership[],
  payPath: PayPath,
  leaving: Date,
): UnreducedPension {
  const membership = membershipYears(windows);
  const pay = rules.finalPay(payPath, leaving);
  const pension = (membership / rules.denominator) * pay;
  return {
    membership,
    finalPay: pay,
    pension,
    automaticLumpSum: (rules.automaticLumpSum?.multiple ?? 0) * pension,
  };
}

/**
 * The 1995 Section's measure: the best single year of the last three,
 * each year the 12 months ending on a leaving anniversary. SI 1995/300
 * reg C1(6): "final year's pensionable pay" is "pensionable pay in
 * respect of the member's last year of pensionable employment, ending on
 * the date the member ceases to be in such employment", unless "pensionable
 * pay was greater in either or both of the 2 consecutive years immediately
 * preceding the last year".
 */
export function bestSingleOf3(payPath: PayPath, leaving: Date): number {
  return Math.max(...yearsTo(payPath, leaving, BEST_SINGLE_OF_YEARS));
}

/**
 * The 2008 Section's measure: the best average of three consecutive
 * years in the last ten, measured back from leaving, each "revalued to
 * current terms", which a path already in today's money is. SI 2008/653
 * reg 2.A.10(5)(b) compares "the period of 1095 days immediately
 * preceding the relevant day (Period 1)", then "the period of 1095 days
 * which overlaps Period 1 by 730 days (Period 2)", "and so on", and
 * 2.A.10(6) takes the one that begins "within the period of 10 years
 * ending with the relevant day" with the highest pay; for a leaver,
 * 2.A.10(5)(a)(i) makes the relevant day "the day on which the member's
 * active membership ceases". The short-service rule of 2.A.10(7), for
 * under 1095 days' service in the ten years, is not modelled: it moves
 * only a member with less than three years' service before leaving.
 */
export function meanOf3ConsecutiveIn10(
  payPath: PayPath, leaving: Date,
): number {
  // Three consecutive years starting inside the last ten can begin at any
  // of the eight latest offsets back from leaving.
  const windowsInside = CONSECUTIVE_WITHIN_YEARS - CONSECUTIVE_YEARS + 1;
  const years = yearsTo(payPath, leaving, CONSECUTIVE_WITHIN_YEARS);
  let best = 0;
  for (let back = 0; back < windowsInside; back++) {
    const sum = years.slice(back, back + CONSECUTIVE_YEARS)
      .reduce((a, b) => a + b, 0);
    best = Math.max(best, sum / CONSECUTIVE_YEARS);
  }
  return best;
}

/**
 * Membership in years: whole years from the first day, then the days
 * left over as a fraction of 365. The legacy sections count
 * membership in years and days, so a window from 1 April to the
 * 31 March eleven years on is exactly 11. The 365-day divisor for the
 * odd days is this library's reading; the regulation's own rule for a
 * part year has not been read at source, and it moves nothing on a
 * window of whole scheme years:
 * https://github.com/casomoltd/nhs-pay/issues/23
 */
function membershipYears(windows: readonly Membership[]): number {
  let total = 0;
  for (const {from, to} of windows) {
    const end = dayAfter(to);
    let years = end.getFullYear() - from.getFullYear();
    const anniversary = (n: number) => new Date(
      from.getFullYear() + n, from.getMonth(), from.getDate(),
    );
    if (anniversary(years) > end) years -= 1;
    const days = daysBetween(anniversary(years), end);
    total += years + days / DAYS_PER_MEMBERSHIP_YEAR;
  }
  return total;
}

/**
 * The pay of the `count` years of 12 months ending on `leaving`, then on
 * each anniversary before it, latest first, in today's money. Both
 * regulations measure from the leaving date, while the path holds pay by
 * scheme year (1 April to 31 March), so each measured year takes the
 * share of the scheme year it ends in that has run by the leaving date
 * and the rest from the scheme year before, pay being even across a
 * year. The share counts the scheme year's own days, 365 or 366, so a
 * leaving on 31 March takes that scheme year whole and the year before
 * is not read at all. Two parts are this library's reading, each at most
 * a day in a year: anniversary years where 2.A.10 counts 1095-day
 * periods, and one share, from the leaving year, for every year back.
 */
function yearsTo(payPath: PayPath, leaving: Date, count: number): number[] {
  const last = schemeYearEndFor(leaving);
  const opened = schemeYearStartDate(last);
  const daysIn = daysBetween(opened, schemeYearStartDate(schemeYearAfter(last)));
  const share = (daysBetween(opened, leaving) + 1) / daysIn;
  const pay = (year: number) => payPath.payFor(schemeYearEnd(year)).pay;
  const leftOnYearEnd = share === 1;
  return Array.from({length: count}, (_, back) => (leftOnYearEnd
    ? pay(last - back)
    : share * pay(last - back) + (1 - share) * pay(last - back - 1)));
}

