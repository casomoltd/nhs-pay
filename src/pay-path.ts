/**
 * A member's pensionable pay in every scheme year of their career,
 * in today's money, and why each year's figure is what it is.
 *
 * Every section reads pay: the 2015 Section banks a slice of each
 * year's, and a final-salary section measures its last window. So pay
 * is built once per member and cash series, every section in a run
 * reads that path, which is what makes final pay identical under
 * both remedy elections by construction rather than by care.
 *
 * A member rarely declares more than today's pay, so the rest is
 * worked out, the same way for everybody, and each year says which
 * of four things it is:
 *
 * - **declared** — a figure given to the path, by the member or a
 *   scenario: their current pay, and any year a figure was given for.
 * - **contractual** — owed under their pay scale: the steps still to
 *   come on an Agenda for Change band, which progression pays on
 *   service rather than on promotion.
 * - **projected** — after the last contractual step, on GAD's
 *   promotional curve from the pay at that step.
 * - **reconstructed** — before today, on the same curve run
 *   backwards from today's pay.
 *
 * One curve in both directions, because reconstructing an unknown
 * past and projecting an unknown future are the same problem and the
 * same published research answers both.
 *
 * A salary sacrifice comes off here, in the one path, so the 2015
 * Section's ledger and a final-salary window read the same reduced
 * pay: see {@link Sacrifice}.
 */
import {PROMOTIONAL_SCALE_2020} from './gad/promotional-scale-2020.js';
import {monthNumber, monthsOf, MONTHS_PER_YEAR} from './dates.js';
import {invariant, PayPathUnavailable} from './errors.js';
import type {IsoDate, IsoMonth} from './iso-date.js';
import {isoMonthOf, isoToDate, monthToDate} from './iso-date.js';
import type {Prices} from './pension/prices.js';
import {
  schemeYearEnd, schemeYearEndDate, schemeYearEndFor, schemeYearStartDate,
} from './pension/scheme-year.js';
import type {SchemeYearEnd} from './pension/scheme-year.js';
import type {PayLadder} from './scale-point.js';

/**
 * A year's pensionable pay the member gave us, in today's money, which
 * the field's name says so a caller cannot pass a payslip's cash
 * figure by mistake: every other year of the path is in today's money,
 * and one cash figure among them would be silently low. Bringing an
 * old figure forward is deferred:
 * https://github.com/casomoltd/nhs-pay/issues/22
 */
export interface DeclaredPay {
  readonly schemeYearEnd: SchemeYearEnd;
  readonly todaysMoney: number;
}

/**
 * A salary sacrifice: pay a member gives up each month for a benefit,
 * such as a lease car. The whole amount comes off pensionable pay, so
 * the 2015 Section builds up less in the years it runs and a
 * final-salary window overlapping them is lower. Sources: "NHSBSA,
 * What is salary sacrifice? (KA-04372)" (#sa-71), which says pension
 * contributions are paid on the pay remaining after the sacrifice,
 * and "NHSBSA 2015 Members' Guide V13" (#sa-38), which names lease
 * cars: see docs/source-archive.md. The rule, and what it assumes, is
 * in docs/how-it-works.md, "A salary sacrifice comes off pensionable
 * pay".
 *
 * Dated by the MONTH, the first and last a deduction was taken in,
 * both included. No national rule says how payroll prorates a
 * sacrifice that starts or ends inside a month, so the caller says
 * which months carried a deduction and the library never guesses.
 *
 * `Post`'s `salarySacrifice` is the same rule for one year's
 * take-home pay; this is its dated form for a career.
 */
export interface Sacrifice {
  /** The deduction on each monthly payslip, in the CASH of the month
   *  it is taken in, which the name says so a caller cannot pass
   *  today's money: a lease fixes it in cash for its term, so it is
   *  worth less in today's money each later year. */
  readonly monthlyCash: number;
  readonly from: IsoMonth;
  readonly to: IsoMonth;
}

/** What a member told us about their pay. */
export interface MemberPay {
  /** A declared year's pay is pensionable pay as the scheme recorded
   *  it, so already after any sacrifice: none is taken off it. */
  readonly declared: readonly DeclaredPay[];
  /** Pensionable pay now, before any sacrifice in `sacrifices`, in
   *  today's money. The anchor every worked-out year scales from, so
   *  it is the one figure the path cannot do without. */
  readonly current: {readonly todaysMoney: number; readonly asAt: IsoDate};
  /** The member's pay scale and where on it they are, while steps
   *  remain. Null off a stepped scale, or at its top. */
  readonly ladder: PayLadder | null;
  /** Whether `declared` and `current` are actual pay for fewer than
   *  full-time hours. The 2015 Section accrues on actual pay, so it prices
   *  them as given; the final-salary sections need whole-time pay and
   *  pro-rated membership, which are not modelled, so `memberBenefits`
   *  refuses a part-time member who holds them. Required, so no caller can
   *  forget it and have part-time pay priced as whole time. */
  readonly partTime: boolean;
  /** Every salary sacrifice the member has had or has agreed to, taken
   *  off `current` and every worked-out year. Required, so a member
   *  with one cannot be priced on unreduced pay by a caller that left
   *  it out; empty for a member with none. */
  readonly sacrifices: readonly Sacrifice[];
  /** Years whose pay the caller sets BEFORE any sacrifice, as a scenario
   *  that scales pay does: fewer hours change the pay and leave the
   *  deductions in the months they fall in. A `declared` year cannot say
   *  this, being already after them. Empty for a member with no such
   *  scenario; a year may not be in both. */
  readonly statedBeforeSacrifice: readonly DeclaredPay[];
}

export interface YearPay {
  /** The year's pensionable pay, after any salary sacrifice. */
  readonly pay: number;
  readonly basis: PayBasis;
  /** The salary sacrifice already taken off `pay`; nought in a year
   *  with none, and in a year in `MemberPay.declared`, whose figure is
   *  already after it. */
  readonly sacrificed: number;
}

/** A run of calendar months a member is paid for: `count` of them,
 *  starting with `from`. */
export interface PaidMonths {
  readonly from: IsoMonth;
  readonly count: number;
}

/**
 * A scheme year's pay for a member paid for only some of its months,
 * as a part year's two parts, which do not scale alike: pay held as a
 * yearly figure is paid month by month, while a sacrifice is taken
 * only in the months it runs.
 */
export interface PartYearPay {
  /** The whole year's pay before any salary sacrifice; for a declared
   *  year the figure as given, which is already after it. */
  readonly beforeSacrifice: number;
  /** The salary sacrifice still to take in the months paid: none in a
   *  declared year. */
  readonly sacrificed: number;
  readonly basis: PayBasis;
}

/** A member's pensionable pay, every scheme year, in today's money. */
export interface PayPath {
  /** A whole scheme year's pay. */
  payFor(schemeYearEnd: SchemeYearEnd): YearPay;
  /** A scheme year's pay for the months of it a member is paid for. */
  payForMonths(schemeYearEnd: SchemeYearEnd, paid: PaidMonths): PartYearPay;
  /** A whole scheme year's pay before any salary sacrifice: a declared
   *  year's figure with that year's listed deductions added back. */
  payBeforeSacrifice(schemeYearEnd: SchemeYearEnd): number;
  /** The salary sacrifice listed for a run of months, which may cross
   *  scheme years, as a final-salary year measured from a leaving date
   *  does. Read against `payBeforeSacrifice`, so a declared year counts
   *  its deductions on both sides. */
  sacrificedOver(paid: PaidMonths): number;
}

/** What a year's pay rests on: see the module header. */
export const PAY_BASES = {
  declared: 'declared',
  contractual: 'contractual',
  projected: 'projected',
  reconstructed: 'reconstructed',
} as const;

export type PayBasis = (typeof PAY_BASES)[keyof typeof PAY_BASES];

/** The columns the index averages: GAD's non-manual male and female. */
const NON_MANUAL_COLUMNS = 2;

/**
 * Build a member's pay path. Every gap in pay is filled, the same way
 * for everybody, and labelled as filled. Throws PayPathUnavailable with
 * no current pay, and RangeError for a declaration that cannot be
 * true: a year declared twice or given both ways, or a sacrifice that
 * is not an amount or ends before it starts; and, when that year is
 * read, for a sacrifice larger than the pay it comes off. On a published-history
 * series, reading a deduction from before the first Revaluation Order
 * throws, since no Order prices that year's cash.
 *
 * `cashPrices` is the run's cash series. A sacrifice is fixed in cash
 * and the path is in today's money, so each year's deductions are
 * brought into today's money at that year's end, by the inverse of
 * the conversion that puts the year's pay into its cash. A walk in
 * that series therefore takes off exactly the cash deducted, so a walk
 * in another cash series needs a path built on it.
 */
export function buildPayPath(
  dateOfBirth: IsoDate,
  pay: MemberPay,
  cashPrices: Prices,
): PayPath {
  refuseNoCurrentPay(pay.current);
  const declared = declaredByYear(pay.declared);
  refuseYearGivenBothWays(pay.statedBeforeSacrifice, declared);
  const worked = workedPay(dateOfBirth, pay);
  const sacrificedOver = sacrificeReader(
    checkedSacrifices(pay.sacrifices), cashPrices,
  );

  /** Every read of a worked year's pay comes through here, so each refuses
   *  a sacrifice larger than the pay of the months it reads. A declared
   *  figure is returned as given, already after its deductions. */
  const payForMonths = (
    schemeYearEnd: SchemeYearEnd, paid: PaidMonths,
  ): PartYearPay => {
    const given = declared.get(schemeYearEnd);
    if (given !== undefined) {
      return {beforeSacrifice: given, sacrificed: 0, basis: PAY_BASES.declared};
    }
    const {pay: before, basis} = worked(schemeYearEnd);
    const sacrificed = sacrificedOver(paid);
    refuseSacrificeOverPay(
      schemeYearEnd, sacrificed, before * paid.count / MONTHS_PER_YEAR,
    );
    return {beforeSacrifice: before, sacrificed, basis};
  };

  return {
    payFor(schemeYearEnd: SchemeYearEnd): YearPay {
      const whole = payForMonths(schemeYearEnd, wholeYear(schemeYearEnd));
      return {
        pay: whole.beforeSacrifice - whole.sacrificed,
        basis: whole.basis,
        sacrificed: whole.sacrificed,
      };
    },
    payForMonths,
    payBeforeSacrifice(schemeYearEnd: SchemeYearEnd): number {
      const months = wholeYear(schemeYearEnd);
      const {beforeSacrifice} = payForMonths(schemeYearEnd, months);
      // A declared figure is already after its deductions.
      return declared.has(schemeYearEnd)
        ? beforeSacrifice + sacrificedOver(months)
        : beforeSacrifice;
    },
    sacrificedOver,
  };
}

/**
 * GAD's promotional pay index at an age: growth from promotion and
 * progression over and above general pay awards, 100 at age 25,
 * linear between the published five-year rows and flat beyond their
 * ends.
 *
 * **The two non-manual columns, averaged.** GAD splits the index by
 * sex and we do not ask a member's sex, nor infer it: averaging is
 * the only version that encodes no guess about the member. It
 * overstates progression for women and understates it for men, which a
 * caller showing its figures should disclose. Non-manual is not a second
 * assumption — every Agenda for Change band is non-manual in GAD's
 * terms.
 */
export function promotionalIndex(age: number): number {
  invariant(Number.isFinite(age), `promotionalIndex: age ${age}`);
  const {ages, nonManual} = PROMOTIONAL_SCALE_2020;
  const blend = (i: number) =>
    (nonManual.male[i] + nonManual.female[i]) / NON_MANUAL_COLUMNS;
  const last = ages.length - 1;
  if (age <= ages[0]) return blend(0);
  if (age >= ages[last]) return blend(last);
  const hi = ages.findIndex((a) => a > age);
  const lo = hi - 1;
  const through = (age - ages[lo]) / (ages[hi] - ages[lo]);
  return blend(lo) + (blend(hi) - blend(lo)) * through;
}

/**
 * Whether `figure` is a pay figure: finite and not negative. Nought is one,
 * now or in a past year: a member paid nothing, as on unpaid leave, accrues
 * nothing for it, and a stated balance still revalues. A year of nought is
 * not a break in service. The one test both refusals below apply.
 */
function isPayFigure(figure: number): boolean {
  return Number.isFinite(figure) && figure >= 0;
}

/** Refuse a current pay that is not a pay figure. */
function refuseNoCurrentPay(current: MemberPay['current']): void {
  if (!isPayFigure(current.todaysMoney)) {
    throw new PayPathUnavailable(
      `current pay ${current.todaysMoney} is not a pay figure`,
    );
  }
}

/** Refuse a sacrifice larger than the pay it comes off: `sacrificed` of
 *  the `paidFor` a member is paid for the months read, both in today's
 *  money. */
function refuseSacrificeOverPay(
  schemeYearEnd: SchemeYearEnd, sacrificed: number, paidFor: number,
): void {
  if (sacrificed > paidFor) {
    throw new RangeError(
      `pay path: ${schemeYearEnd} sacrifices ${sacrificed} of `
        + `${paidFor} paid`,
    );
  }
}

/** Refuse a year given both ways, in `declared` and in
 *  `statedBeforeSacrifice`: one says the figure is after the year's
 *  deductions and the other before them, and it cannot be both. */
function refuseYearGivenBothWays(
  stated: readonly DeclaredPay[], declared: ReadonlyMap<SchemeYearEnd, number>,
): void {
  for (const {schemeYearEnd} of stated) {
    if (declared.has(schemeYearEnd)) {
      throw new RangeError(
        `pay path: ${schemeYearEnd} given both declared and before sacrifice`,
      );
    }
  }
}

/** The pay a member declared, by scheme year. Throws RangeError for a year
 *  declared twice or a figure that is not a pay figure. */
function declaredByYear(
  declared: readonly DeclaredPay[],
): Map<SchemeYearEnd, number> {
  const byYear = new Map<SchemeYearEnd, number>();
  for (const {schemeYearEnd, todaysMoney: figure} of declared) {
    if (byYear.has(schemeYearEnd)) {
      throw new RangeError(`pay path: ${schemeYearEnd} declared twice`);
    }
    if (!isPayFigure(figure)) {
      throw new RangeError(
        `pay path: ${schemeYearEnd} declared as ${figure}`,
      );
    }
    byYear.set(schemeYearEnd, figure);
  }
  return byYear;
}

/**
 * A year's pay before any sacrifice, for every year the member did not
 * declare: their current pay, and each other year worked out from it.
 */
function workedPay(
  dateOfBirth: IsoDate, pay: MemberPay,
): (schemeYearEnd: SchemeYearEnd) => {pay: number; basis: PayBasis} {
  const {current} = pay;
  const stated = declaredByYear(pay.statedBeforeSacrifice);
  /** The age whose birthday falls in a scheme year: the years since
   *  the scheme year the member was born in. */
  const bornIn = schemeYearEndFor(isoToDate(dateOfBirth));
  const indexIn = (schemeYearEnd: SchemeYearEnd) =>
    promotionalIndex(schemeYearEnd - bornIn);

  const currentYear = schemeYearEndFor(isoToDate(current.asAt));
  const steps = pay.ladder === null
    ? []
    : contractualSteps(pay.ladder, current, currentYear);
  /** Where the curve takes over going forwards: the top of the
   *  ladder, or today where there is no ladder left to climb. */
  const curveFrom = steps.at(-1)
    ?? {from: currentYear, pay: current.todaysMoney};

  return (schemeYearEnd) => {
    const set = stated.get(schemeYearEnd);
    if (set !== undefined) return {pay: set, basis: PAY_BASES.declared};
    if (schemeYearEnd === currentYear) {
      return {pay: current.todaysMoney, basis: PAY_BASES.declared};
    }
    if (schemeYearEnd < currentYear) {
      return {
        pay: current.todaysMoney * indexIn(schemeYearEnd)
          / indexIn(currentYear),
        basis: PAY_BASES.reconstructed,
      };
    }
    if (schemeYearEnd <= curveFrom.from) {
      const paid = steps.filter((s) => s.from <= schemeYearEnd);
      return {
        pay: paid.at(-1)?.pay ?? current.todaysMoney,
        basis: PAY_BASES.contractual,
      };
    }
    return {
      pay: curveFrom.pay * indexIn(schemeYearEnd)
        / indexIn(curveFrom.from),
      basis: PAY_BASES.projected,
    };
  };
}

/** The sacrifices a member declared. Throws RangeError for one that is
 *  not an amount of money given up, or that ends before it starts. */
function checkedSacrifices(
  sacrifices: readonly Sacrifice[],
): readonly Sacrifice[] {
  for (const {monthlyCash, from, to} of sacrifices) {
    if (!Number.isFinite(monthlyCash) || monthlyCash <= 0) {
      throw new RangeError(`pay path: a sacrifice of ${monthlyCash} a month`);
    }
    if (monthToDate(to) < monthToDate(from)) {
      throw new RangeError(`pay path: a sacrifice from ${from} to ${to}`);
    }
  }
  return sacrifices;
}

/** The deductions listed for a run of months, in today's money. */
function sacrificeReader(
  sacrifices: readonly Sacrifice[],
  cashPrices: Prices,
): (paid: PaidMonths) => number {
  // Every read of every year comes through here, so a member with none
  // walks no months.
  if (sacrifices.length === 0) return () => 0;
  return ({from, count}) => monthsOf(from, count).reduce((sum, month) => {
    const year = schemeYearEndFor(month);
    const cash = cashTakenIn(sacrifices, month);
    // Asked of the series only where there is a deduction, so a year
    // with none is exactly its pay and needs no price for its year.
    return cash === 0
      ? sum
      : sum + cashPrices.todaysMoneyOf(cash, schemeYearEndDate(year));
  }, 0);
}

/** All twelve months of a scheme year. */
function wholeYear(schemeYearEnd: SchemeYearEnd): PaidMonths {
  return {
    from: isoMonthOf(schemeYearStartDate(schemeYearEnd)),
    count: MONTHS_PER_YEAR,
  };
}

/** The cash every sacrifice running in `month` takes from its payslip. */
function cashTakenIn(sacrifices: readonly Sacrifice[], month: Date): number {
  const here = monthNumber(month);
  return sacrifices
    .filter((s) => monthNumber(monthToDate(s.from)) <= here
      && here <= monthNumber(monthToDate(s.to)))
    .reduce((sum, s) => sum + s.monthlyCash, 0);
}

/**
 * The contractual steps still to come, as the scheme years each is
 * first paid in, scaled to the member's own pay so a part-time
 * member's steps stay in proportion to what they are actually paid.
 */
function contractualSteps(
  ladder: NonNullable<MemberPay['ladder']>,
  current: MemberPay['current'],
  currentYear: SchemeYearEnd,
): {from: SchemeYearEnd; pay: number}[] {
  const here = ladder.current;
  if (!ladder.points.includes(here)) {
    throw new RangeError(
      `pay ladder: current point "${here.label}" is not one of its points`,
    );
  }
  const hereYears = here.yearsExperience;
  const scale = current.todaysMoney / here.salary;
  return ladder.points
    .filter((p) => p.yearsExperience > hereYears)
    .map((p) => ({
      from: schemeYearEnd(currentYear + p.yearsExperience - hereYears),
      pay: p.salary * scale,
    }))
    .sort((a, b) => a.from - b.from);
}
