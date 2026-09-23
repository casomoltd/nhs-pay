/**
 * The final-salary engine the 1995 and 2008 Sections share. What
 * differs between them is statute — the denominator, the pay measure,
 * the lump sum, which factors apply — and each section holds its own
 * rules privately, so no caller can compose a combination the scheme
 * lacks, such as a 60 denominator on best-single-year pay.
 */
import type {FactorOutcome} from '../factor-basis.js';
import type {PayPath} from '../pay-path.js';
import {moneyAt} from '../pension/money.js';
import type {ProjectionMoney} from '../pension/money.js';
import type {Prices} from '../pension/prices.js';
import {schemeYearEndFor} from '../pension/seed.js';

/** A window of service valued on final salary, as dates. */
interface Membership {
  readonly from: Date;
  /** The last day of service in it, inclusive. */
  readonly to: Date;
}

/** How a section measures final pay, named for an award's provenance.
 *  The measuring itself is each section's own `finalPay`. */
export const PAY_MEASURES = {
  bestSingleOf3: 'best-single-of-3',
  meanOf3ConsecutiveIn10: 'mean-of-3-consecutive-in-10',
} as const;

export type PayMeasure = (typeof PAY_MEASURES)[keyof typeof PAY_MEASURES];

/** A factor for a final-salary benefit drawn on `drawn`. */
type FactorFor = (
  dateOfBirth: Date, leaving: Date, drawn: Date,
) => FactorOutcome;

/** One section's statute, private to that section: each rule is the
 *  section's own behaviour, so the engine never branches on which
 *  section it is valuing. */
export interface FinalSalaryRules {
  readonly denominator: 80 | 60;
  readonly payMeasure: PayMeasure;
  /** The age the section's pension is payable unreduced, in whole
   *  years: what its early and late factors are measured from. */
  readonly pensionAge: number;
  /** Whether drawing after `pensionAge` raises the pension. The
   *  section's `pensionFactor` must agree, which
   *  `section-factors.test.ts` asserts. */
  readonly lateUplift: boolean;
  /** Final pay in today's money over the scheme years up to and
   *  including `lastYear`. */
  finalPay(payPath: PayPath, lastYear: number): number;
  readonly pensionFactor: FactorFor;
  /** The automatic lump sum, as a multiple of the unreduced pension,
   *  and the factor it is reduced by; null where the section pays
   *  none. */
  readonly automaticLumpSum: {
    readonly multiple: number;
    readonly factor: FactorFor;
  } | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    const end = new Date(
      to.getFullYear(), to.getMonth(), to.getDate() + 1,
    );
    let years = end.getFullYear() - from.getFullYear();
    const anniversary = (n: number) => new Date(
      from.getFullYear() + n, from.getMonth(), from.getDate(),
    );
    if (anniversary(years) > end) years -= 1;
    const days = Math.round(
      (end.getTime() - anniversary(years).getTime()) / MS_PER_DAY,
    );
    total += years + days / 365;
  }
  return total;
}

/** Each year's pay on the path, in today's money. */
const payIn = (payPath: PayPath, year: number) => payPath.payFor(year).pay;

/** The 1995 Section's measure: the best single year of the last
 *  three. */
export function bestSingleOf3(payPath: PayPath, lastYear: number): number {
  return Math.max(payIn(payPath, lastYear), payIn(payPath, lastYear - 1),
    payIn(payPath, lastYear - 2));
}

/** The 2008 Section's measure: the best average of three consecutive
 *  years in the last ten, each "revalued to current terms", which a
 *  path already in today's money is. */
export function meanOf3ConsecutiveIn10(
  payPath: PayPath, lastYear: number,
): number {
  // Three consecutive years inside the last ten can end in any of the
  // last eight: the eighth-last is the latest window that still starts
  // inside the ten.
  const WINDOWS_IN_TEN = 10 - 3 + 1;
  let best = 0;
  for (let end = lastYear; end > lastYear - WINDOWS_IN_TEN; end--) {
    const mean = (payIn(payPath, end) + payIn(payPath, end - 1)
      + payIn(payPath, end - 2)) / 3;
    best = Math.max(best, mean);
  }
  return best;
}

/**
 * A final-salary pension before any factor, in today's money: the
 * membership, over the denominator, times final pay measured at
 * `lastYear`. The one place the formula is written, so the pension
 * held today and the pension drawn cannot come to disagree.
 */
export function unreducedPension(
  rules: FinalSalaryRules,
  windows: readonly Membership[],
  payPath: PayPath,
  lastYear: number,
): {
  membership: number;
  finalPay: number;
  pension: number;
  automaticLumpSum: number;
} {
  const membership = membershipYears(windows);
  const pay = rules.finalPay(payPath, lastYear);
  const pension = (membership / rules.denominator) * pay;
  return {
    membership,
    finalPay: pay,
    pension,
    automaticLumpSum: (rules.automaticLumpSum?.multiple ?? 0) * pension,
  };
}

/** A final-salary pension and lump sum, before and after factors. */
interface FinalSalaryBenefit {
  readonly beforeFactor: ProjectionMoney;
  readonly pension: ProjectionMoney;
  readonly automaticLumpSum: ProjectionMoney;
  readonly factor: FactorOutcome;
  readonly membership: number;
  readonly finalPay: number;
}

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
  } = unreducedPension(rules, windows, payPath, schemeYearEndFor(leaving));
  const factor = rules.pensionFactor(dateOfBirth, leaving, drawing);
  const lump = rules.automaticLumpSum;
  const lumpSum = lump === null
    ? 0
    : unreducedLump * lump.factor(dateOfBirth, leaving, drawing).factor;
  const money = (real: number): ProjectionMoney =>
    moneyAt({real, nominal: prices.payAt(real, drawing)}, drawing);
  return {
    beforeFactor: money(unreduced),
    pension: money(unreduced * factor.factor),
    automaticLumpSum: money(lumpSum),
    factor,
    membership,
    finalPay: pay,
  };
}
