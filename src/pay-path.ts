/**
 * A member's pensionable pay in every scheme year of their career,
 * in today's money, and why each year's figure is what it is.
 *
 * Every section reads pay: the 2015 Section banks a slice of each
 * year's, and a final-salary section measures its last window. So pay
 * is built once per member and every section reads the same path,
 * which is what makes final pay identical under both remedy elections
 * by construction rather than by care.
 *
 * A member rarely declares more than today's pay, so the rest is
 * worked out, the same way for everybody, and each year says which
 * of four things it is:
 *
 * - **declared** — the member told us: their current pay, and any
 *   year they gave a figure for.
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
 */
import {PROMOTIONAL_SCALE_2020} from './gad/promotional-scale-2020.js';
import {invariant, PayPathUnavailable} from './errors.js';
import type {IsoDate} from './iso-date.js';
import {isoToDate} from './iso-date.js';
import {schemeYearEndFor} from './pension/seed.js';
import type {SteppedPoint} from './scale-point.js';

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
    (nonManual.male[i] + nonManual.female[i]) / 2;
  const last = ages.length - 1;
  if (age <= ages[0]) return blend(0);
  if (age >= ages[last]) return blend(last);
  const hi = ages.findIndex((a) => a > age);
  const lo = hi - 1;
  const through = (age - ages[lo]) / (ages[hi] - ages[lo]);
  return blend(lo) + (blend(hi) - blend(lo)) * through;
}

/**
 * A year's pensionable pay the member gave us, in today's money, which
 * the field's name says so a caller cannot pass a payslip's cash
 * figure by mistake: every other year of the path is in today's money,
 * and one cash figure among them would be silently low. Bringing an
 * old figure forward is deferred:
 * https://github.com/casomoltd/nhs-pay/issues/22
 */
export interface DeclaredPay {
  readonly schemeYearEnd: number;
  readonly todaysMoney: number;
}

/** What a member told us about their pay. */
export interface MemberPay {
  readonly declared: readonly DeclaredPay[];
  /** Pensionable pay now, in today's money. The anchor every
   *  worked-out year scales from, so it is the one figure the path
   *  cannot do without. */
  readonly current: {readonly todaysMoney: number; readonly asAt: IsoDate};
  /** The member's pay scale and where on it they are, while steps
   *  remain. Null off a stepped scale, or at its top. `current` is one
   *  of `points`, the object itself, so it cannot name a point the
   *  scale does not have. */
  readonly ladder: {
    readonly points: readonly SteppedPoint[];
    readonly current: SteppedPoint;
  } | null;
}

/** What a year's pay rests on: see the module header. */
export const PAY_BASES = {
  declared: 'declared',
  contractual: 'contractual',
  projected: 'projected',
  reconstructed: 'reconstructed',
} as const;

export type PayBasis = (typeof PAY_BASES)[keyof typeof PAY_BASES];

export interface YearPay {
  readonly pay: number;
  readonly basis: PayBasis;
}

/** A member's pensionable pay, every scheme year, in today's money. */
export interface PayPath {
  payFor(schemeYearEnd: number): YearPay;
}

/**
 * The contractual steps still to come, as the scheme years each is
 * first paid in, scaled to the member's own pay so a part-time
 * member's steps stay in proportion to what they are actually paid.
 */
function contractualSteps(
  ladder: NonNullable<MemberPay['ladder']>,
  current: MemberPay['current'],
  currentYear: number,
): {from: number; pay: number}[] {
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
      from: currentYear + p.yearsExperience - hereYears,
      pay: p.salary * scale,
    }))
    .sort((a, b) => a.from - b.from);
}

/**
 * Build a member's pay path. Refuses only where there is nothing to
 * build from: every other gap is filled, the same way for everybody,
 * and labelled as filled.
 */
export function buildPayPath(
  dateOfBirth: IsoDate,
  pay: MemberPay,
): PayPath {
  const {current} = pay;
  // Nought is a figure: a member paid nothing accrues nothing, and a
  // stated balance still revalues. Only what is not a figure refuses.
  if (!Number.isFinite(current.todaysMoney) || current.todaysMoney < 0) {
    throw new PayPathUnavailable(
      `current pay ${current.todaysMoney} is not a pay figure`,
    );
  }
  const born = isoToDate(dateOfBirth);
  /** The age whose birthday falls in a scheme year: the years since
   *  the scheme year the member was born in. */
  const bornIn = schemeYearEndFor(born);
  const ageIn = (schemeYearEnd: number) => schemeYearEnd - bornIn;
  const indexIn = (schemeYearEnd: number) =>
    promotionalIndex(ageIn(schemeYearEnd));

  const currentYear = schemeYearEndFor(isoToDate(current.asAt));
  const declared = new Map<number, number>();
  for (const {schemeYearEnd, todaysMoney: figure} of pay.declared) {
    if (declared.has(schemeYearEnd)) {
      throw new RangeError(`pay path: ${schemeYearEnd} declared twice`);
    }
    if (!Number.isFinite(figure) || figure <= 0) {
      throw new RangeError(
        `pay path: ${schemeYearEnd} declared as ${figure}`,
      );
    }
    declared.set(schemeYearEnd, figure);
  }
  const steps = pay.ladder === null
    ? []
    : contractualSteps(pay.ladder, current, currentYear);
  const lastStep = steps.at(-1);
  /** Where the curve takes over going forwards: the top of the
   *  ladder, or today where there is no ladder left to climb. */
  const curveFrom = lastStep ?? {from: currentYear, pay: current.todaysMoney};

  return {
    payFor(schemeYearEnd: number): YearPay {
      invariant(
        Number.isInteger(schemeYearEnd),
        `pay path: scheme year ${schemeYearEnd}`,
      );
      const given = declared.get(schemeYearEnd);
      if (given !== undefined) return {pay: given, basis: PAY_BASES.declared};
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
    },
  };
}
