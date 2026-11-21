/**
 * The 1995 Section: final salary, a pension age of 60, and an automatic
 * lump sum. Internal: reached only through the member's benefits.
 */
import {bestSingleOf3, PAY_MEASURES} from './final-salary.js';
import type {FinalSalaryRules} from './final-salary.js';
import {BenefitNotModelled, NOT_MODELLED} from '../errors.js';
import {
  FACTOR_APPLIES, FACTOR_SOURCES, drawnEarly, readFactor,
} from '../factor-basis.js';
import {LEGACY_PENSION_AGES} from '../pension/ages.js';
import type {
  Applies1995, FactorBasis, FactorOutcome,
} from '../factor-basis.js';

/** The pension age the 1995 Section's reductions are measured from. */
const PENSION_AGE = LEGACY_PENSION_AGES.section1995;

/** The 1995 Section's basis for each benefit: 1-401 or 1-407 before 60,
 *  and no late uplift after it, declared rather than read. */
const BASES_1995 = {
  [FACTOR_APPLIES.pension]: {
    against: PENSION_AGE,
    early: 'early1995Pension',
    late: FACTOR_SOURCES.noLateUplift,
  },
  [FACTOR_APPLIES.lumpSum]: {
    against: PENSION_AGE,
    early: 'early1995LumpSum',
    late: FACTOR_SOURCES.noLateUplift,
  },
} as const satisfies Record<Applies1995, FactorBasis>;

/** The 1995 Section's statute (SI 1995/300): 1/80 of the best single
 *  year's pay of the last three, and three times the pension as an
 *  automatic lump sum. */
export const RULES_1995: FinalSalaryRules = {
  denominator: 80,
  payMeasure: PAY_MEASURES.bestSingleOf3,
  pensionAge: PENSION_AGE,
  lateUplift: false,
  finalPay: bestSingleOf3,
  pensionFactor: (dateOfBirth, leaving, drawn) =>
    factor1995(dateOfBirth, leaving, drawn, FACTOR_APPLIES.pension),
  automaticLumpSum: {
    multiple: 3,
    factor: (dateOfBirth, leaving, drawn) =>
      factor1995(dateOfBirth, leaving, drawn, FACTOR_APPLIES.lumpSum),
  },
};

/**
 * The factor for a 1995 Section benefit drawn on `drawn`, for the
 * pension or for the automatic lump sum.
 *
 * **No late uplift, ever.** Drawing after 60 does not raise a 1995
 * pension, so its basis's late arm is 1.000 for a reason of its own
 * rather than a factor read from a table.
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
  applies: Applies1995,
): FactorOutcome {
  const basis = BASES_1995[applies];
  if (drawnEarly(basis, dateOfBirth, drawn) && leaving < drawn) {
    throw new BenefitNotModelled(
      NOT_MODELLED.preservedDrawnEarly,
      'a 1995 Section benefit drawn before 60 from preserved benefits',
    );
  }
  return readFactor(basis, dateOfBirth, drawn);
}
