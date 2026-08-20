/**
 * The uplift rule: a function of PHASE alone.
 *
 * Both published rate columns are pure functions of the CPI
 * figure, verified against every year the library holds:
 *
 *   active          CPI + 1.5, a negative CPI carried through
 *   deferred/paid   max(0, CPI), floored
 *
 * `rate = CPI + 1.5` holds on 11 of 11 rows, 2016–2026. The
 * Pensions Increase column of the 2020 Valuation Report App. E
 * equals `max(0, CPI)` on 8 of 8 published years, 2016–2023 —
 * including 2016, where −0.1 CPI gives 1.4 active and 0.0
 * deferred, and 2023's 10.1 spike.
 *
 * So there is no second rate table. The published Pensions
 * Increase figures are a GOLDEN TEST, not production data.
 *
 * Note the direction: CPI is sourced independently from each
 * Order's operative words and the rates derive forward from it.
 * Never the reverse — back-computing CPI as `rate − 1.5` would
 * make the test of the +1.5 rule agree with itself.
 */

import {invariant} from '../errors.js';
import {
  ACTIVE_REVAL_BONUS_PCT,
  appliedOnFor,
  revaluationFor,
} from '../revaluation.js';
import type {CpiEntry, CpiSource} from './prices.js';

/**
 * The three phases. Ordered by date and DERIVED from the member's
 * own dates: a phase is never "entered", so there are no
 * transitions to guard and no machine to run.
 *
 * FOUNDING ASSUMPTION, and this is where it lives: the phases are
 * TOTALLY ORDERED and each occurs at most once, because the input
 * carries a single exitDate. One unbroken membership — join,
 * contribute, leave, draw. A career break or a return to the
 * scheme cannot be expressed, and would be modelled as continuous
 * active service, OVERSTATING the pension. Relaxing it later
 * means allowing the sequence to repeat, which this shape already
 * permits: phase is computed per year from the member's dates.
 */
export type MemberPhase = 'active' | 'deferred' | 'inPayment';

/** One uplift, as applied to a member's record. */
export interface AppliedUplift {
  /** The date the POT moves — 1 April through 2022, 6 April from
   * 2023. Not the order's commencement, and not the Pensions
   * Increase date, which is a third date again. */
  readonly appliedOn: Date;
  /** Percentage points applied to the whole balance. Negative
   * is legal. One rate for the year, never a blend: the phase
   * on the day it lands settles it (see `upliftOpening`). */
  readonly percent: number;
  /** The CPI row this rate derives from. Provenance is READ from
   * here and stored nowhere else, so a figure and its source
   * cannot drift apart. */
  readonly from: CpiEntry;
}

/** Where one year's uplift comes from. A single operation, so a
 * phase fixes its rule once and the walker never branches. */
export type UpliftSource = (
  schemeYearEnd: number,
) => AppliedUplift | null;

/** CPI + 1.5 points. A negative CPI is carried through, not
 * floored: September 2015's −0.1 gave a 1.4% uplift, not 1.5%. */
export function activeRatePct(cpi: number): number {
  return cpi + ACTIVE_REVAL_BONUS_PCT;
}

/** Pensions Increase: CPI, floored at zero. Prices falling does
 * not claw a pension back. */
export function deferredRatePct(cpi: number): number {
  return Math.max(0, cpi);
}

/**
 * The whole rule, in one factory.
 *
 * Takes a CPI READER rather than the whole table, because which
 * reader applies is not this module's judgement: a year's Order
 * is used while the balance it acts on is still the scheme's
 * own, and only the ledger knows that. Handed the assumption,
 * this function does exactly what it does with an Order.
 */
export function upliftsFor(
  phase: MemberPhase,
  cpiFor: CpiSource,
): UpliftSource {
  const ratePct = phase === 'active'
    ? activeRatePct
    : deferredRatePct;

  return (schemeYearEnd) => {
    const from = cpiFor(schemeYearEnd);
    const percent = ratePct(from.cpi);
    // The table stores each year's rate as published as well as
    // the CPI behind it, so the derivation can be checked against
    // the Order rather than trusted. Loud on purpose: a future
    // Order departing from CPI + 1.5 must stop the run, not
    // quietly reprice every member.
    //
    // Gated on the ENTRY carrying an SI, never on the year being
    // inside the published range: a caller deliberately reading
    // the assumption for a published year must not be checked
    // against the Order it chose not to use.
    const published = from.si === null
      ? null
      : revaluationFor(schemeYearEnd);
    if (phase === 'active' && published !== null) {
      invariant(
        Math.abs(percent - published.ratePct) < 1e-9,
        `${published.si} revalued at ${published.ratePct}%, but `
          + `CPI + ${ACTIVE_REVAL_BONUS_PCT} gives ${percent}%`,
      );
    }
    return {
      appliedOn: appliedOnFor(schemeYearEnd),
      percent,
      from,
    };
  };
}
