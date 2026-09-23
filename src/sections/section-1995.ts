/**
 * The 1995 Section: final salary, a pension age of 60, and an automatic
 * lump sum. Internal: reached only through the member's benefits.
 */
import {npaDate} from '../dates.js';
import {bestSingleOf3, PAY_MEASURES} from './final-salary.js';
import type {FinalSalaryRules} from './final-salary.js';
import {BenefitNotModelled, NOT_MODELLED} from '../errors.js';
import {FACTOR_APPLIES, FACTOR_SOURCES, readFactor} from '../factor-basis.js';
import type {
  FactorApplies, FactorBasis, FactorOutcome,
} from '../factor-basis.js';

/** The pension age the 1995 Section's reductions are measured from. */
const PENSION_AGE = 60;

/**
 * The factor for a 1995 Section benefit drawn on `drawn`, for the
 * pension or for the automatic lump sum.
 *
 * **No late uplift, ever.** Drawing after 60 does not raise a 1995
 * pension, so a late drawing is 1.000 for a reason of its own rather
 * than a factor read from a table.
 *
 * **An early drawing from preserved benefits is refused.** Tables 1-401
 * and 1-407 are for members retiring from active service; a member who
 * left first reads 1-403A/B and 1-409A/B, and which of those applies has
 * not been read at source: https://github.com/casomoltd/nhs-pay/issues/18
 */
export function factor1995(
  dateOfBirth: Date,
  leaving: Date,
  drawn: Date,
  applies: FactorApplies,
): FactorOutcome {
  const sixty = npaDate(dateOfBirth, PENSION_AGE);
  if (drawn > sixty) {
    return {source: FACTOR_SOURCES.noLateUplift, factor: 1};
  }
  if (drawn < sixty && leaving < drawn) {
    throw new BenefitNotModelled(
      NOT_MODELLED.preservedDrawnEarly,
      'a 1995 Section benefit drawn before 60 from preserved benefits',
    );
  }
  const basis: FactorBasis = {
    against: PENSION_AGE, direction: 'early', applies,
  };
  return readFactor(basis, dateOfBirth, drawn);
}

/** The 1995 Section's statute (SI 1995/300): 1/80 of the best single
 *  year's pay of the last three, and three times the pension as an
 *  automatic lump sum. */
export const RULES_1995: FinalSalaryRules = {
  denominator: 80,
  payMeasure: PAY_MEASURES.bestSingleOf3,
  pensionAge: PENSION_AGE,
  finalPay: bestSingleOf3,
  pensionFactor: (dateOfBirth, leaving, drawn) =>
    factor1995(dateOfBirth, leaving, drawn, FACTOR_APPLIES.pension),
  automaticLumpSum: {
    multiple: 3,
    factor: (dateOfBirth, leaving, drawn) =>
      factor1995(dateOfBirth, leaving, drawn, FACTOR_APPLIES.lumpSum),
  },
};
