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

import {
  ACTIVE_REVAL_BONUS_PCT,
  appliedOnFor,
} from '../revaluation.js';
import type {CpiEntry, CpiSource, Prices} from './prices.js';
import {schemeYearEndFor} from './seed.js';

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

/** Active until the member leaves, deferred until they draw, in
 * payment after. Derived from dates; never entered.
 *
 * Lives beside the rule it selects, because the rule is a
 * function of phase alone and this is the only way a phase is
 * ever obtained. */
export function phaseAt(
  year: number, exitYear: number, retireYear: number,
): MemberPhase {
  if (year <= exitYear) return 'active';
  return year < retireYear ? 'deferred' : 'inPayment';
}

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
 * phase fixes its rule once and the walker never branches.
 *
 * TOTAL: every scheme year asked for has an uplift. The rate is
 * a `CpiSource` reading and a series has no gaps, so there is no
 * year to answer "none" about. A ROW that carries no uplift —
 * the first of a walk, which opens nothing — says so in its own
 * field, `LedgerYear.uplift`; nullability there is about the
 * walk's first step, not about this rule, and putting it here
 * would make every caller narrow a value it always gets. */
export type UpliftSource = (
  schemeYearEnd: number,
) => AppliedUplift;

/** CPI + 1.5 points. A negative CPI is carried through, not
 * floored: September 2015's −0.1 gave a 1.4% uplift, not 1.5%. */
export function activeRatePct(cpi: number): number {
  return cpi + ACTIVE_REVAL_BONUS_PCT;
}

/** Pensions Increase: CPI, floored at zero. Prices falling does
 * not claw a pension back.
 *
 * A DIFFERENT instrument from the one above. The in-service rate
 * comes from the Public Service Pensions Revaluation Order, made
 * under s.9(2) Public Service Pensions Act 2013; this one is
 * Pensions Increase, made by the annual Pensions Increase
 * (Review) Order under s.59 Social Security Pensions Act 1975,
 * and it is what lifts a preserved pension and one in payment.
 * Two orders, two section powers, the same September CPI.
 *
 * Sources: "HM Treasury — 2026 pensions increase multiplier
 * tables, covering note" and "HM Treasury — 2026 pensions
 * increase multiplier tables, Annexes B and C" — see
 * docs/source-archive.md. */
export function deferredRatePct(cpi: number): number {
  return Math.max(0, cpi);
}

/**
 * The whole rule, in one factory.
 *
 * Takes a CPI READER rather than the whole table: the rule is a
 * function of phase and a series, and WHICH series is the
 * caller's question, not this one's. Whatever entry it is handed
 * goes through unbranched — an Order's figure and an assumption
 * are the same arithmetic here, and differ only in the
 * provenance carried out beside the rate.
 *
 * Nothing in a projection calls this directly; both the walk and
 * the seed go through `openingUpliftFor`, which fixes the series
 * once so they cannot choose differently.
 *
 * That the published rates ARE `CPI + 1.5` is not asserted here,
 * because nothing here reads them: the rule is checked against
 * the TABLE, on all eleven rows at once, by
 * `tests/prices.test.ts` — "reproduces every published rate, 11
 * of 11". That check owns it, and it fires whether or not any
 * caller ever asks for a published year.
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
    return {
      appliedOn: appliedOnFor(schemeYearEnd),
      percent: ratePct(from.cpi),
      from,
    };
  };
}

/**
 * The uplift that OPENS the scheme year after
 * `seedSchemeYearEnd` — the one question the seed and the walk
 * must never answer differently.
 *
 * A seed is a balance standing at a year end and the walk's
 * first step revalues it; `seedFromBalanceAt` divides that same
 * step back out of a figure read mid-year. Three coordinates
 * settle the answer — the phase the member is in for the year
 * being OPENED, the year the rate is labelled by, and the CPI
 * series it is read from — and a difference in any one of them
 * stops a member's own stated balance round-tripping, with
 * nothing in the output to show it. Hence one producer that both
 * call: a coordinate spelled out twice is a coordinate that can
 * drift.
 *
 * The rate is labelled by the year that just ENDED, which is why
 * the seed's own year is the argument: SI 2016/438, applied 1
 * April 2016, opens the year ending 31 March 2017. The
 * off-by-one is the scheme's, not ours.
 *
 * ── One rate after the seed ─────────────────────────
 *
 * `assumedFor` is read for every year, whether or not an Order
 * covers it. An Order is a NOMINAL rate, and today's money is
 * this same model at an assumption of ZERO, so one applied
 * inside that run puts a whole year of CPI into a reading
 * defined to hold none — 8.2 points for a member holding a 2024
 * statement, 3.2 for a 2025 one, so the size of it is a property
 * of the paperwork rather than of the member. Nor is the
 * exactness collectable: the year-end figure an Order produces
 * here also carries this library's guess at that year's pay, so
 * there is nothing to check it against until a statement the
 * member has not received.
 *
 * Decided at https://github.com/casomoltd/nhs-pay/issues/13
 */
export function openingUpliftFor(
  seedSchemeYearEnd: number,
  exitDate: Date,
  retirementDate: Date,
  prices: Prices,
): AppliedUplift {
  const phase = phaseAt(
    seedSchemeYearEnd + 1,
    schemeYearEndFor(exitDate),
    schemeYearEndFor(retirementDate),
  );
  return upliftsFor(phase, prices.assumedFor)(seedSchemeYearEnd);
}
