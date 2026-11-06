/**
 * A member's benefits across every section they hold: built once from
 * what the member told us, then asked one question per set of
 * retirement choices.
 *
 * Everything ABOUT the member goes in once, when the owner is built;
 * each method takes only the question. So a caller never assembles the
 * member again per option, and no section, pay path or ledger is a
 * thing it has to build.
 *
 * Rules come in two tiers. Each section's own — denominator, pay
 * measure, pension age, lump sum, factors — belong to that section;
 * the ones a caller reads are the legacy section's, through
 * `MemberBenefits.legacy`. The rules over the whole set live
 * here: which sections a member holds and whether their service is
 * eligible for the McCloud remedy, then, at the drawing, summing every
 * award into one pension and one automatic lump sum and taking cash
 * across that one total.
 *
 * Its parts sit beside it: the vocabulary in `types.ts`, the service
 * check and the remedy's dates in `service.ts`, and each section's award
 * in `valuation.ts`. This module owns the member; `index.ts` is the door
 * a caller comes through.
 */
import {cashAt, nhsCommutationLimits} from '../commutation.js';
import {BenefitNotModelled, NOT_MODELLED} from '../errors.js';
import type {IsoDate} from '../iso-date.js';
import {isoToDate} from '../iso-date.js';
import {
  drawingTest, firstJoinedOf, mayDrawOn, memberMinimumPensionAge,
  normalPensionAge,
} from '../pension/ages.js';
import type {JoiningHistory} from '../pension/ages.js';
import {buildPayPath} from '../pay-path.js';
import {npaDate} from '../dates.js';
import {sumMoney} from '../pension/money.js';
import {
  createPrices, createPublishedPrices, TODAYS_MONEY_CPI,
} from '../pension/prices.js';
import type {Prices} from '../pension/prices.js';
import {seedFromJoinDate} from '../pension/seed.js';
import {
  legacyPeriodsOf, periodsOf, REMEDY, servicePeriods,
} from './service.js';
import type {LegacyHolding} from './service.js';
import {
  careerAward, holdings, legacyAward, RULES, section2015, seed2015,
} from './valuation.js';
import type {Built, Drawing} from './valuation.js';
import {PAST_YEARS, REMEDY_BASES, SECTIONS} from './types.js';
import type {
  Assumptions, Award, LegacyRules, LegacySectionId, Member,
  MemberBenefits, PastYears, Position, RetirementChoices,
} from './types.js';

/** The price series each reading of the past is priced on. Total over
 *  `PastYears`, so a new reading fails the build until it has one. */
const CASH_SERIES: Record<PastYears, (cpi: number, asOf: Date) => Prices> = {
  [PAST_YEARS.assumed]: createPrices,
  [PAST_YEARS.published]: createPublishedPrices,
};

/**
 * Build a member's benefits. Throws `PayPathUnavailable` where there
 * is no current pay to build pay from, `BenefitNotModelled` for service
 * the library does not model, and RangeError for a declaration that
 * cannot be true.
 *
 * `today` is required because it decides which answer comes back: it
 * is the date the figures are as at, so a figure reproduces as at it.
 */
export function memberBenefits(
  member: Member,
  assumptions: Assumptions,
  today: Date,
): MemberBenefits {
  const held = servicePeriods(member.service);
  const {legacy, ordinary2015} = held;
  const remedy = legacy !== null && legacy.window !== null;
  refuseUnmodelled(member, remedy, legacy);
  const born = isoToDate(member.dateOfBirth);
  const history: JoiningHistory = {
    born: member.dateOfBirth, firstJoined: firstJoinedOf(member),
  };
  const built: Built = {
    member,
    history,
    today,
    born,
    npaOn: npaDate(born, normalPensionAge(born)),
    payPath: buildPayPath(member.dateOfBirth, member.pay),
    legacy,
    ordinary2015,
    cashPrices: CASH_SERIES[assumptions.pastYears](
      assumptions.assumedCpi, today),
    todaysPrices: createPrices(TODAYS_MONEY_CPI, today),
  };
  return {
    periods: periodsOf(held),
    remedy,
    legacy: legacy === null ? null : legacyOf(legacy.section),
    payPath: built.payPath,
    minimumPensionAgeOn: (drawing: IsoDate) =>
      memberMinimumPensionAge(history, drawing),
    mayDrawOn: (drawing: IsoDate) => mayDrawOn(history, drawing),
    now: () => holdings(built),
    at: (choices) => position(built, remedy, choices),
  };
}

/** Every section's award at one set of choices, summed, with cash taken
 *  across the total. */
function position(
  b: Built, remedy: boolean, choices: RetirementChoices,
): Position {
  const dates = checked(b, remedy, choices);
  const awards = b.legacy === null
    ? []
    : legacyAwards(b, b.legacy, choices, dates);
  const own = careerAward(b, {
    section: SECTIONS.s2015,
    window: b.ordinary2015,
    seedFor: (prices) => seed2015(b, dates, prices),
  }, dates);
  awards.push(own.award);

  const pension = sumMoney(awards.map((a) => a.pension), dates.drawing);
  const automaticLumpSum = sumMoney(
    awards.map((a) => a.automaticLumpSum), dates.drawing,
  );
  return {
    choices,
    awards,
    crystallised: {pension, automaticLumpSum},
    cash: cashAt(
      pension, automaticLumpSum, choices.cash,
      nhsCommutationLimits(b.cashPrices),
    ),
    prices: b.cashPrices,
    ...section2015(b, own, dates),
  };
}

/** The legacy section's awards: on the legacy basis every legacy period
 *  is final salary; on the 2015 basis the remedy window leaves it for a
 *  career average walk, paid from the legacy section. */
function legacyAwards(
  b: Built, legacy: LegacyHolding, choices: RetirementChoices,
  dates: Drawing,
): Award[] {
  const {own, window} = legacy;
  // `checked` refused a 2015 basis for a member with no window.
  const onThe2015Basis = choices.remedy.kind === REMEDY_BASES.section2015;
  if (!onThe2015Basis || window === null) {
    return [legacyAward(b, legacy, legacyPeriodsOf(legacy), dates)];
  }
  return [
    legacyAward(b, legacy, [own], dates),
    careerAward(b, {
      section: legacy.section,
      window,
      seedFor: () => seedFromJoinDate(isoToDate(window.from)),
    }, dates).award,
  ];
}

/** Refuse a member whose service the library does not yet value. */
function refuseUnmodelled(
  member: Member, remedy: boolean, legacy: LegacyHolding | null,
): void {
  // Deferred until the split of a pre-rollback balance is read:
  // https://github.com/casomoltd/nhs-pay/issues/20
  if (remedy && member.statement !== null
    && isoToDate(member.statement.asAt) < isoToDate(REMEDY.rollback)) {
    throw new BenefitNotModelled(
      NOT_MODELLED.statementBeforeRollback,
      'a statement from before rollback on 1 October 2023, which '
        + 'counts the remedy years in the 2015 Section',
    );
  }
  // Deferred until part-time final-salary membership is modelled:
  // https://github.com/casomoltd/nhs-pay/issues/26
  if (member.pay.partTime === true && legacy !== null) {
    throw new BenefitNotModelled(
      NOT_MODELLED.partTimeLegacy,
      'part-time pay with 1995 or 2008 Section service, which counts '
        + 'part-time membership pro rata on whole-time final pay',
    );
  }
}

/** A legacy section's rules, as `MemberBenefits.legacy` states them. */
function legacyOf(section: LegacySectionId): LegacyRules {
  const rules = RULES[section];
  return {
    section,
    pensionAge: rules.pensionAge,
    denominator: rules.denominator,
    automaticLumpSum: rules.automaticLumpSum?.multiple ?? null,
    lateUplift: rules.lateUplift,
  };
}

/** Refuse choices that cannot be valued, and return their dates. */
function checked(
  b: Built, remedy: boolean, choices: RetirementChoices,
): Drawing {
  const leaving = isoToDate(choices.leaving);
  const drawing = isoToDate(choices.drawing);
  if (drawing < leaving) {
    throw new RangeError('at: drawn before leaving');
  }
  if (b.ordinary2015.to !== null && isoToDate(b.ordinary2015.to) < leaving) {
    throw new RangeError(
      `at: leaving after the member already left, on ${b.ordinary2015.to}`,
    );
  }
  const elects = choices.remedy.kind !== REMEDY_BASES.none;
  const electionMismatch = remedy !== elects;
  if (electionMismatch) {
    throw new RangeError(remedy
      ? 'at: a remedy member needs an election'
      : 'at: an election for a member with no remediable service');
  }
  // The scheme pays nothing before the minimum pension age outside ill
  // health, so a figure there would be one no member could draw.
  const {mayDraw, minimumAge} = drawingTest(b.history, choices.drawing);
  if (!mayDraw) {
    throw new RangeError(
      `at: drawn before the minimum pension age, ${minimumAge}`,
    );
  }
  return {leaving, drawing};
}
