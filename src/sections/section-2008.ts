/**
 * The 2008 Section: final salary on reckonable pay, a pension age of 65,
 * no automatic lump sum. Internal: reached only through the member's
 * benefits.
 */
import {npaDate} from '../dates.js';
import {meanOf3ConsecutiveIn10, PAY_MEASURES} from './final-salary.js';
import type {FinalSalaryRules} from './final-salary.js';
import {BenefitNotModelled, NOT_MODELLED} from '../errors.js';
import {readFactor} from '../factor-basis.js';
import type {FactorBasis, FactorOutcome} from '../factor-basis.js';

/** The pension age the 2008 Section's factors are measured from. */
const PENSION_AGE = 65;

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
  const sixtyFive = npaDate(dateOfBirth, PENSION_AGE);
  if (drawn < sixtyFive && leaving < drawn) {
    throw new BenefitNotModelled(
      NOT_MODELLED.preservedDrawnEarly,
      'a 2008 Section pension drawn before 65 from preserved benefits',
    );
  }
  const basis: FactorBasis = {
    against: PENSION_AGE,
    direction: drawn < sixtyFive ? 'early' : 'late',
  };
  return readFactor(basis, dateOfBirth, drawn);
}

/** The 2008 Section's statute (SI 2008/653): 1/60 of reckonable pay,
 *  the best average of three consecutive years in the last ten, and
 *  no automatic lump sum. */
export const RULES_2008: FinalSalaryRules = {
  denominator: 60,
  payMeasure: PAY_MEASURES.meanOf3ConsecutiveIn10,
  pensionAge: PENSION_AGE,
  finalPay: meanOf3ConsecutiveIn10,
  pensionFactor: factor2008,
  automaticLumpSum: null,
};
