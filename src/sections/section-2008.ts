/**
 * The 2008 Section: final salary on reckonable pay, a pension age of 65,
 * no automatic lump sum. Internal: reached only through the member's
 * benefits.
 */
import {meanOf3ConsecutiveIn10, PAY_MEASURES} from './final-salary.js';
import type {FinalSalaryRules} from './final-salary.js';
import {BenefitNotModelled, NOT_MODELLED} from '../errors.js';
import {drawnEarly, readFactor} from '../factor-basis.js';
import {LEGACY_PENSION_AGES} from '../pension/ages.js';
import type {FactorBasis, FactorOutcome} from '../factor-basis.js';

/** The pension age the 2008 Section's factors are measured from. */
const PENSION_AGE = LEGACY_PENSION_AGES.section2008;

/** The 2008 Section's basis: 1-402 before 65, 2-416 after. */
const BASIS_2008 = {
  against: PENSION_AGE, early: 'earlyAge65', late: 'late2008',
} as const satisfies FactorBasis;

/** The 2008 Section's statute (SI 2008/653): 1/60 of reckonable pay,
 *  the best average of three consecutive years in the last ten, and
 *  no automatic lump sum. */
export const RULES_2008: FinalSalaryRules = {
  denominator: 60,
  payMeasure: PAY_MEASURES.meanOf3ConsecutiveIn10,
  pensionAge: PENSION_AGE,
  lateUplift: true,
  finalPay: meanOf3ConsecutiveIn10,
  pensionFactor: factor2008,
  automaticLumpSum: null,
};

/**
 * The factor for a 2008 Section pension drawn on `drawn`: 1-402 early,
 * 2-416 late.
 *
 * **An early drawing from preserved benefits is refused**, as in the
 * 1995 Section: 1-402 is printed for members retiring early, and whether
 * it also serves a member who left first has not been read at source:
 * https://github.com/casomoltd/nhs-pay/issues/18
 */
export function factor2008(
  dateOfBirth: Date,
  leaving: Date,
  drawn: Date,
): FactorOutcome {
  if (drawnEarly(BASIS_2008, dateOfBirth, drawn) && leaving < drawn) {
    throw new BenefitNotModelled(
      NOT_MODELLED.preservedDrawnEarly,
      'a 2008 Section pension drawn before 65 from preserved benefits',
    );
  }
  return readFactor(BASIS_2008, dateOfBirth, drawn);
}
