/**
 * NHS 2015 CARE Pension Projection
 *
 * Models the 2015 scheme lifecycle:
 * accrual → revaluation → crystallisation → commutation.
 *
 * Sources:
 *
 * GAD Consolidated Factor Spreadsheet (NHS EW Consolidated
 * Factors 2023-03), issued 30 June 2023
 *   → ERF1/LRF1 values (see src/gad/ issue files for the
 *     verbatim transcriptions + per-table provenance)
 *
 * GAD "NHSPS 2015 E&W — Early and late retirement in normal
 * health — Factors and guidance", 7 August 2019 — methodology
 * only (the 2023 workbook names it as its related guidance)
 *   → Rounding rules (§2.3 ERF, §3.4 LRF)
 *   → Order of operations (§1.18)
 *
 * NHSBSA 2015 Members' Guide (V13), May 2024
 *   → Accrual rate: 1/54 (p.6)
 *   → NPA = SPA, minimum 65
 *
 * NHS 2015 Scheme design document (gov.uk)
 *   → In-service revaluation: CPI + 1.5%
 *   → Deferred revaluation: CPI only
 *   → In-payment revaluation: CPI (Pensions Increase Order)
 *
 * ── Two projections, not one and a deflator ─────────
 *
 * Everything is computed in CASH — actual pounds at a stated
 * date — because that is the ruler the scheme itself uses: its
 * records, its uplifts and a member's statement are all cash
 * figures.
 *
 * Today's money is NOT that divided by inflation. It is the
 * SAME model run with the caller's assumption set to ZERO, so
 * the pot grows 1.5% a year while a member is paying in and
 * not at all once they are deferred, and pay stays the figure
 * they gave. `projectPension` runs both and pairs them; every
 * reported figure carries the two readings and its own date.
 *
 * **So today's money does not move with the CPI assumption**,
 * and a deferred pension is exactly flat in it. Deflating
 * instead leaves 1.5 / (1 + cpi) of real growth — 1.47% at 2% —
 * which is defensible arithmetic and not what anyone means by
 * ignoring inflation. A member checking by hand takes 1.5% a
 * year on a flat salary; the tool's own two views are defined
 * that way, so this is.
 *
 * It also deleted an anchor date, a face-value window, and a
 * rule that a stated balance must never be restated. At a zero
 * assumption there is nothing to restate. Three attempts at
 * placing that anchor each produced a defensible figure that
 * disagreed with a real statement.
 *
 * This inverts what the module used to do, and gives up a
 * property it used to advertise. The old engine quoted
 * everything against CPI — in service CPI + 1.5%, deferred and
 * in payment CPI exactly — so in real terms the scheme looked
 * CPI-free and ONE projection served both rulers, unable to
 * disagree with itself. Two runs restore that property without
 * the multiplicative reading that bought it.
 *
 * That rested on reading CPI + 1.5% as a MULTIPLICATION. The
 * scheme adds: 3.1% CPI gives 4.6%, which is what the Treasury
 * Order made and what a member's statement shows. Under the
 * additive rule the real rate is 1.5 / (1 + cpi) — it depends
 * on the inflation assumption, so the two rulers CAN now
 * disagree and the model says so rather than pretending
 * otherwise. Deferred and in payment are still CPI exactly, so
 * those phases remain flat in real terms.
 *
 * Decided in the open at
 * https://github.com/casomoltd/nhs-pay/issues/10
 *
 * ── Annual, and stepped ─────────────────────────────
 *
 * The scheme year is the unit. The pot moves once a year, on
 * 6 April (1 April through 2022), and is unchanged in between —
 * so the model steps rather than compounds continuously, and a
 * figure read four months after an uplift is the same figure
 * that uplift produced. `pension/ledger.ts` holds one row per
 * scheme year; this module is the orchestrator over it.
 *
 * NHSBSA Key Notes — 2015 Scheme Estimates (V2), March 2025
 *   → Commutation rate: £12 lump sum per £1 pension
 *   → HMRC 25% cap on lump sum
 *
 * ── A published rate needs a known base ─────────────
 *
 * An Order is applied only while the balance it acts on is
 * still the scheme's own. Once a slice this library GUESSED
 * has entered the balance, every uplift after it is the
 * caller's assumption — for the rate as well as the pay.
 *
 * The case that forces it: a statement dated 31 March 2025 is
 * followed by an Order in April 2025, which acts on the stated
 * figure and is therefore still checkable. The Order in April
 * 2026 is not, because the statement covering 2025/26 is not
 * issued until months after it. A legislated rate multiplied
 * by a guessed base is precision in one term and a guess in
 * the other, and it reads as an authority the figure has not
 * earned.
 *
 * The cost, stated rather than hidden: a member who has not
 * given a statement gets no published Order at all, since
 * every one of their years is estimated. In today's money —
 * the default view — this is worth about 0.2% over a decade,
 * because the CPI in the rate and the CPI in the ruler very
 * nearly cancel whichever series they are drawn from.
 *
 * ── Checked against a real statement ────────────────
 *
 * Reconciled line by line against a member's NHS Annual
 * Benefit Statement (2015 Section, updated to 31/03/2025;
 * name and membership number redacted):
 * Archived as "Annual Benefit Statement, 2015 Section,
 * redacted" — see docs/source-archive.md.
 *
 * The accrual rate, the in-service revaluation, the HMRC
 * lump-sum cap and the commutation residual all reproduced
 * it. No figure from it is recorded here — the earnings
 * beside those rates are the member's and stay out.
 *
 * It settled the ORDER of the accrual loop, previously an
 * untested assumption: a year's slice is added AFTER the pot
 * is revalued, never before, so a slice earns no revaluation
 * in the scheme year it is earned. The other order overstated
 * that statement by 3.2%, and every internal test still
 * passed. `pension/ledger.ts` is written in that order and
 * `revaluation never touches the year's own slice` holds it
 * there.
 *
 * A ten-year projection built BY HAND from that statement is
 * the golden oracle in `tests/golden-abs.test.ts` — reproduced
 * to the penny on every row. It was hand-built before this
 * code, which is the point of it: a fixture derived from the
 * implementation agrees with whatever the implementation is
 * changed to.
 *
 * ── Added, not compounded ───────────────────────────
 *
 * The scheme ADDS CPI and 1.5 PERCENTAGE POINTS: 3.1% CPI
 * gives 4.6%, which is what the Treasury Order made and what
 * the statement above shows. revaluation.ts carries every
 * published year with its SI, and `pension/uplift.ts` derives
 * the rate forward from the CPI figure — never backward, since
 * back-computing CPI as rate − 1.5 would make the test of the
 * +1.5 rule agree with itself.
 *
 * This module used to compound instead, at a flat real 1.5%:
 * the multiplicative reading of the same rule, running about
 * 0.6% high over a full career at 2% CPI. That is now fixed,
 * at the cost described above.
 */

import {invariant} from './errors.js';
import {
  npaDate,
  periodInYearsMonths,
  yearsBetween,
} from './dates.js';
import {createPrices} from './pension/prices.js';
import type {Prices} from './pension/prices.js';
import {buildLedger, phaseAt} from './pension/ledger.js';
import {estimateHistory} from './pension/history.js';
import type {EstimatedHistory} from './pension/history.js';
import type {MemberLedger} from './pension/ledger.js';
import {upliftsFor} from './pension/uplift.js';
import type {MemberPhase} from './pension/uplift.js';
import {
  schemeYearClosedBy,
  schemeYearEndDate,
  schemeYearEndFor,
  seedFromJoinDate,
  seedFromStatement,
} from './pension/seed.js';
import type {LedgerSeed} from './pension/seed.js';
import {FactorTable} from './gad/factor-table.js';
import type {
  FactorProvenance,
  FactorTableKind,
} from './gad/factor-table.js';
import {ERF_0_420} from './gad/erf-2023-06-30.js';
import {LRF_0_421} from './gad/lrf-2023-06-30.js';

// ── Types ───────────────────────────────────────────

/**
 * One figure under BOTH projections.
 *
 * Every scalar reported here is a pair, so a consumer picks a
 * reading rather than doing CPI arithmetic of its own.
 *
 * **Neither reading is derived from the other.** They are two
 * runs of the same model: `nominal` at the caller's inflation
 * assumption, `real` with that assumption set to zero. So
 * `real` is not `nominal` deflated, and dividing one by the
 * other does not give the assumption back.
 *
 * That distinction is the whole of a long-running disagreement
 * about a third of a percent. Deflating a CPI + 1.5 projection
 * leaves 1.5 / (1 + cpi) of real growth — 1.47% at 2% — because
 * the 1.5 points are added before the growth and eaten into by
 * the same year's inflation. Running the model at zero gives
 * 1.5% flat, which is what "ignore inflation" means and what
 * every member's own arithmetic does.
 */
export interface ProjectionMoney {
  /** Actual pounds at `asAt`, the pension revalued at CPI plus
   * 1.5 points a year while accruing. */
  readonly nominal: number;
  /** Today's pounds: the same projection with inflation
   * ignored, so 1.5% a year while accruing and flat once
   * deferred. */
  readonly real: number;
  /** The date the figure falls on. Its absence is how a
   * consumer once deflated an exit figure over the horizon to
   * retirement: a figure that does not carry its own date
   * cannot defend itself. */
  readonly asAt: Date;
}

/** A point on the projection curve */
export interface ProjectionPoint {
  /** Age in years (can be fractional) */
  age: number;
  /** Annual pension in actual £ of that year. Below today's
   * age this is SMALLER than `real`: past pounds bought more. */
  nominal: number;
  /** Annual pension in today's £ — what the projection
   * computes; `nominal` is this scaled by CPI. */
  real: number;
  /** Whether this is accrued (known) or projected — i.e.
   * whether the point falls on or before today. Deliberately
   * NOT `phase === 'active'`: a consumer uses this to separate
   * history from forecast, and a future working year is
   * forecast. */
  accrued: boolean;
  /** Which lifecycle phase the point falls in. Additive: the
   * three fields above keep their names and meanings. */
  phase: MemberPhase;
}

/** Input for statement path */
export interface PensionStatementInput {
  kind: 'statement';
  /** Accrued pension from Annual Benefit Statement (£/yr) */
  accruedPension: number;
  /**
   * The date the statement valued that figure at — an ABS
   * carries one ("updated to 31/03/2025"), and it is
   * typically months behind whenever the member reads it.
   * Omit only when the figure really is current: defaulting
   * to `today` silently throws away every month of accrual
   * and revaluation since the statement was issued.
   */
  statementDate?: Date;
  /** Current pensionable pay */
  currentSalary: number;
  /**
   * Date joined the 2015 scheme, if the member gave one.
   *
   * ILLUSTRATION ONLY. A statement states a balance, not a
   * history, so the years before it are estimated — see
   * `pension/history.ts` — and drawn so the built-up arm has a
   * shape and a beginning. Nothing after the statement reads
   * it, and the estimate is calibrated to land exactly on the
   * stated balance rather than near it.
   *
   * Omit and the chart simply starts at the statement, which
   * is what it did before this existed.
   */
  joinDate?: Date;
  dateOfBirth: Date;
  /** Date member stops accruing (leaves NHS) */
  exitDate: Date;
  /** Date member starts drawing pension */
  retirementDate: Date;
  /** Normal Pension Age (67 for most) */
  npa: number;
  /** Assumed CPI rate as decimal, e.g. 0.02 */
  assumedCpi: number;
}

/** Input for estimation path (no ABS available) */
export interface PensionEstimationInput {
  kind: 'estimation';
  /** Date joined 2015 scheme */
  joinDate: Date;
  /** Current pensionable pay */
  currentSalary: number;
  dateOfBirth: Date;
  /** Date member stops accruing */
  exitDate: Date;
  /** Date member starts drawing pension */
  retirementDate: Date;
  /** Normal Pension Age */
  npa: number;
  /** Assumed CPI rate as decimal */
  assumedCpi: number;
}

export type PensionProjectionInput =
  | PensionStatementInput
  | PensionEstimationInput;

/** Commutation options (separate from projection) */
export interface CommutationResult {
  pensionGivenUp: number;
  residualPension: number;
  lumpSum: number;
  maxLumpSum: number;
}

/** Full projection result */
export interface PensionProjectionResult {
  /** Accrued pension at the close of the scheme year the exit
   * falls in, dated at that close — see docs/how-it-works.md,
   * "An exit date names a SCHEME YEAR, not a day". */
  accruedAtExit: ProjectionMoney;
  /** After revaluation, before ERF/LRF, at retirement */
  revaluedAtRetirement: ProjectionMoney;
  /** After ERF/LRF, at retirement */
  annualPension: ProjectionMoney;
  /** The balance in force TODAY — flat between the scheme's
   * annual steps, so it is exact rather than interpolated.
   *
   * Reported here rather than left to a consumer reading the
   * curve, because the curve is sampled at scheme year ends: a
   * reader looking for "what have I got now" off the nearest
   * plotted point gets a figure up to a year stale. One did,
   * and showed a member the balance from before both the year
   * end and the April uplift. */
  accruedNow: ProjectionMoney;
  /** ERF or LRF factor applied */
  factor: number;
  factorType: FactorTableKind | 'none';
  /** Gap between revalued and drawn pension, at retirement */
  adjustmentAmount: ProjectionMoney;
  /** Curve data for chart (both views) */
  curve: ProjectionPoint[];
  /** Whether estimation path was used */
  isEstimation: boolean;
  /**
   * The year-by-year record every figure above was read off.
   *
   * Additive, and the point of it is that a consumer showing
   * its working cannot disagree with the headline: the rows ARE
   * the derivation, not a re-derivation. A panel that recomputed
   * "statement plus the Orders since" from the published CPI
   * alone missed the in-service 1.5 points and the leaver's
   * part-year blend, so it printed a sum that did not reach the
   * number beside it.
   */
  /**
   * The illustrative years before the statement, or null when
   * there are none to draw. Its `impliedPay` is in TODAY'S
   * money — the figure a reader can hold against the pay they
   * entered, and the one to caption with.
   */
  estimatedHistory: EstimatedHistory | null;
  ledger: MemberLedger;
  /** The same walk with inflation ignored — the rows behind
   * every `real` reading above, so a consumer showing its
   * working in today's money reads them rather than
   * recomputing and disagreeing with the headline. */
  todaysMoneyLedger: MemberLedger;
}

// ── Constants ───────────────────────────────────────

/** 1/54 accrual rate — NHS 2015 CARE scheme */
export const ACCRUAL_RATE = 1 / 54;

/** Commutation: £12 lump sum per £1 pension */
export const COMMUTATION_FACTOR = 12;


// ── Factor Tables ───────────────────────────────────

// Which issue is in force is exactly these two constructions —
// swap the import when GAD supersedes a table (the two tables
// change on different dates, hence one issue file per table).
const ERF1 = new FactorTable(ERF_0_420);
const LRF1 = new FactorTable(LRF_0_421);

/**
 * Provenance of the in-force table behind a factor kind — the
 * citation facts (table ref, guidance name, issue date, source
 * PDF) consumers render instead of hand-typing them, so a page
 * showing "GAD factors issued 30 June 2023" updates itself when
 * a later issue supersedes the table above.
 */
export function factorProvenance(
  kind: FactorTableKind,
): FactorProvenance {
  return kind === 'erf'
    ? ERF1.provenance
    : LRF1.provenance;
}

// ── Retirement Factor ───────────────────────────────

/**
 * Determine whether ERF or LRF applies and return the
 * factor. The rounding rules (ERF up §2.3, LRF down §3.4)
 * live on the tables themselves — see FactorTable.
 */
export function retirementFactor(
  retirementDate: Date,
  npDate: Date,
): { factor: number; type: FactorTableKind | 'none' } {
  if (retirementDate >= npDate) {
    // Late or on-time retirement
    const period = periodInYearsMonths(
      npDate,
      retirementDate,
    );
    if (period.years === 0 && period.months === 0
      && period.days === 0) {
      return {factor: 1, type: 'none'};
    }
    return {factor: LRF1.factorFor(period), type: 'lrf'};
  }

  // Early retirement
  const period = periodInYearsMonths(
    retirementDate,
    npDate,
  );
  return {factor: ERF1.factorFor(period), type: 'erf'};
}

// ── Core Calculations ───────────────────────────────

/** Annual pension accrual for one year of service */
export function yearlyAccrual(
  pensionablePay: number,
): number {
  return pensionablePay * ACCRUAL_RATE;
}

/**
 * Compound revaluation over a number of years.
 * Caller passes CPI + 1.5% for active, CPI for deferred.
 */
export function revalue(
  pension: number,
  annualRate: number,
  years: number,
): number {
  if (years <= 0) return pension;
  return pension * Math.pow(1 + annualRate, years);
}

// ── Commutation ─────────────────────────────────────

/**
 * Maximum tax-free lump sum under HMRC 25% rule.
 * Formula: (20 × pension) / (3 + 20/commutationFactor)
 */
export function maxLumpSum(
  adjustedPension: number,
): number {
  return (20 * adjustedPension) / (3 + 20 / COMMUTATION_FACTOR);
}

/**
 * Calculate commutation at a given fraction of max.
 * ERF/LRF is applied BEFORE commutation (§1.18).
 */
export function commute(
  adjustedPension: number,
  fraction: number,
): CommutationResult {
  invariant(
    fraction >= 0 && fraction <= 1,
    `Commutation fraction must be 0–1, got ${fraction}`,
  );
  const max = maxLumpSum(adjustedPension);
  const lumpSum = max * fraction;
  const pensionGivenUp = lumpSum / COMMUTATION_FACTOR;
  const residualPension = adjustedPension - pensionGivenUp;

  return {
    pensionGivenUp,
    residualPension,
    lumpSum,
    maxLumpSum: max,
  };
}

// ── Projection Orchestrator ─────────────────────────

/**
 * Generate a full pension projection including curve
 * data for both nominal and real (CPI-deflated) views.
 *
 * `today` is the evaluation date — the anchor for the
 * accrued/projected split and the real-terms deflator.
 * Injectable so tests can pin exact curve values;
 * captured exactly once and threaded (a second capture
 * could flip the ms-precision accrued flag).
 */
export function projectPension(
  input: PensionProjectionInput,
  today: Date = new Date(),
): PensionProjectionResult {
  /* TWO RUNS, not one run read two ways. Cash at the caller's
     assumption; today's money with that assumption set to zero,
     which is what "ignore inflation" means: the pension
     revalues at 1.5% a year while accruing and not at all once
     deferred, and pay stays the figure the caller gave.

     Cheap, deterministic and pure, so running the model twice
     costs a few microseconds and buys a definition a reader can
     check by hand. The deflated alternative cost an anchor
     date, a face-value window, a rule against restating a
     stated balance, and three failed attempts at placing the
     anchor — all to arrive at 1.47% where the member's own
     arithmetic says 1.5%. */
  const cash = resolveProjection(input, today);
  const todays = input.assumedCpi === 0
    ? cash
    : resolveProjection({...input, assumedCpi: 0}, today);

  const pair = (
    n: number, r: number, asAt: Date,
  ): ProjectionMoney => ({nominal: n, real: r, asAt});

  return {
    accruedAtExit: pair(
      cash.accruedAtExit,
      todays.accruedAtExit,
      // Dated at the close it is the closing of.
      schemeYearEndDate(schemeYearEndFor(cash.exitDate)),
    ),
    revaluedAtRetirement: pair(
      cash.revaluedAtRetirement,
      todays.revaluedAtRetirement,
      cash.retirementDate,
    ),
    annualPension: pair(
      cash.annualPension, todays.annualPension,
      cash.retirementDate,
    ),
    accruedNow: pair(
      cash.ledger.atDate(today), todays.ledger.atDate(today),
      today,
    ),
    factor: cash.factor,
    factorType: cash.factorType,
    adjustmentAmount: pair(
      cash.revaluedAtRetirement - cash.annualPension,
      todays.revaluedAtRetirement - todays.annualPension,
      cash.retirementDate,
    ),
    curve: buildCurve(cash, todays),
    isEstimation: cash.isEstimation,
    estimatedHistory: todays.history,
    ledger: cash.ledger,
    todaysMoneyLedger: todays.ledger,
  };
}

// ── Internal Helpers ────────────────────────────────

/**
 * Kind-normalised evaluation context. The ledger IS the model;
 * everything below it is a named index into the same list, so
 * "the curve's in-payment base is the reported pension" is a
 * consequence of there being one list rather than a property a
 * test has to assert.
 */
interface Resolved {
  readonly today: Date;
  readonly dateOfBirth: Date;
  readonly exitDate: Date;
  readonly retirementDate: Date;
  readonly npa: number;
  readonly prices: Prices;
  readonly ledger: MemberLedger;
  /** The estimated run-up before a stated balance, in THIS
   * run's money. Null for an estimation, which walks from the
   * join date already, and for a statement with no join date. */
  readonly history: EstimatedHistory | null;
  /** Where the curve starts: the earliest date the ledger can
   * actually answer for. */
  readonly curveFrom: Date;
  readonly isEstimation: boolean;
  /* Plain numbers: a walk reports in the money it was built in
     and cannot see the other one. Pairing is `projectPension`'s
     job, and keeping it there is what stops a figure from one
     ruler being quoted against the other's date. */
  readonly accruedAtExit: number;
  readonly revaluedAtRetirement: number;
  readonly annualPension: number;
  readonly factor: number;
  readonly factorType: FactorTableKind | 'none';
}

/**
 * A member's stated balance, on whatever date it is stated —
 * the day they read it, or the day their statement prints. That
 * is a position mid-scheme-year, and a seed is a year-end
 * closing balance, so it has to be carried back to one.
 *
 * In November the April uplift has already been applied to the
 * figure being read, so dividing it out lands on the last
 * year-end closing balance and the walk re-applies it — no
 * double count, and no year of accrual thrown away. On a date
 * before that April the figure already IS the year-end balance
 * and nothing is divided, which is why a statement printed on
 * 31 March passes through untouched.
 *
 * ONE route for both the dated and the undated case, because
 * there is only one question: what was the closing balance at
 * the year end before this date? `seedFromStatement` stays
 * strict about wanting a year end; this is what finds it.
 * Statements print on arbitrary days — 7 November is a real
 * one — so the strict form alone could not serve them.
 */
function seedFromBalanceAt(
  balance: number,
  asOf: Date,
  exitDate: Date,
  retirementDate: Date,
  prices: Prices,
): LedgerSeed {
  const lastYearEnd = schemeYearClosedBy(asOf);
  /* Ask the WALK's question, about the WALK's year. The uplift
     undone here is the one OPENING year `lastYearEnd + 1`, and
     `buildLedger` re-applies that same uplift by calling
     `phaseAt` for that same year. Inverting the walk exactly is
     this function's only job, so it must not spell the rule out
     a second time.

     It used to. This compared `exitDate` against the year end
     that had just CLOSED — the phase one year BEHIND the walk's
     — and the two answers differed for exactly one exit date:
     31 March of the last closed scheme year. That is the day an
     ABS is drawn to, and the day the calculator's exit slider
     snapped to, so the case was common rather than exotic. The
     seed divided out CPI + 1.5 while the walk multiplied back
     CPI, and the member's own stated balance came back 1.5
     points light with nothing in the output to show it. */
  const phase = phaseAt(
    lastYearEnd + 1,
    schemeYearEndFor(exitDate),
    schemeYearEndFor(retirementDate),
  );
  const applied = upliftsFor(phase, prices.cpiFor)(lastYearEnd);
  invariant(applied !== null, 'uplift must exist');
  const already = applied.appliedOn <= asOf;
  return seedFromStatement(
    already ? balance / (1 + applied.percent / 100) : balance,
    schemeYearEndDate(lastYearEnd),
  );
}

/** The earliest of some dates. */
function earliest(...dates: readonly Date[]): Date {
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}

function resolveProjection(
  input: PensionProjectionInput,
  today: Date,
): Resolved {
  const {
    currentSalary, dateOfBirth, exitDate,
    retirementDate, npa, assumedCpi,
  } = input;


  /* The drawing date is used EXACTLY AS GIVEN, to the day.
     Retiring on a birthday, mid-month, or on a scheme year end
     are three different questions and this function answers
     whichever one it is asked — the GAD tables are printed by
     year AND month, and the rounding rules (ERF up §2.3, LRF
     down §3.4) exist precisely for the part-months a date-exact
     answer produces.

     A CONSUMER may want less than that. The NHS pension
     calculator prices retirement in whole years from NPA,
     because it draws a chart whose every point is a 31 March
     and a factor that moved when you retired "on time" would
     be harder to follow than one that is a little rough. It
     gets that by handing this function two birthdays, which are
     a whole number of years apart. That is its simplification
     to declare, in its own methods, and it did not belong in
     here: a library that has already thrown the precision away
     cannot offer it back to the next caller. */

  const isEstimation = input.kind === 'estimation';
  const prices = createPrices(assumedCpi, today);

  // The ONLY place the input variant is read.
  const seed = isEstimation
    ? seedFromJoinDate(input.joinDate)
    : seedFromBalanceAt(
        input.accruedPension,
        input.statementDate ?? today,
        exitDate, retirementDate, prices,
      );

  const {factor, type: factorType} = retirementFactor(
    retirementDate, npaDate(dateOfBirth, npa),
  );
  const retireYear = schemeYearEndFor(retirementDate);

  // Walk five years past the later of NPA and retirement, which
  // is as far as the curve is ever asked to reach.
  const through = Math.max(
    retireYear, schemeYearEndFor(npaDate(dateOfBirth, npa)),
  ) + 6;

  const ledger = buildLedger({
    seed,
    pensionableEarnings: currentSalary,
    exitDate,
    retirementDate,
    prices,
    through,
    drawingFor: () => ({
      on: retirementDate,
      factor,
      kind: factorType === 'none' ? 'erf' : factorType,
      provenance: factorProvenance(
        factorType === 'none' ? 'erf' : factorType,
      ),
      commuted: null,
    }),
  });

  // Absent when retirement falls at or before the seed's own
  // year end — a member handing over a balance and drawing it
  // the same day. There is no row then, but there is still an
  // answer: the balance they handed over.
  const retireRow = ledger.years.find(
    (r) => r.schemeYearEnd === retireYear,
  );
  const revalued = retireRow === undefined
    ? ledger.accruedAt(retirementDate)
    : retireRow.revalued + retireRow.earned;
  const drawn = retireRow === undefined
    ? revalued * factor
    : retireRow.closing;

  /* Illustration only, and only where a statement leaves a gap:
     an estimation path already walks from the join date, so
     there is nothing to fill in. Calibrated to land exactly on
     the stated balance, so the two arms meet without a seam. */
  const history = input.kind === 'statement'
      && input.joinDate !== undefined
    ? estimateHistory({
        joinDate: input.joinDate,
        statedBalance: seed.opening,
        statementSchemeYearEnd: seed.atSchemeYearEnd,
        prices,
      })
    : null;

  return {
    today, dateOfBirth, exitDate, retirementDate, npa,
    prices, ledger, history, isEstimation, factor, factorType,
    /* The earliest date the ledger holds a balance for, which
       is the seed's own year end — NOT today.
    
       It was today for a statement, on the reasoning that an
       ABS carries no join history to draw. But the seed IS a
       balance at a scheme year end, and every step from there
       to now is a published Order, so those months are real
       history and were simply being withheld. Drawing from
       today also put a past leaving date OUTSIDE the plotted
       range, leaving the "stops paying in" marker floating in
       space beside a chart that started after it. */
    curveFrom: earliest(
      today,
      exitDate,
      schemeYearEndDate(
        history === null ? seed.atSchemeYearEnd : history.from - 1,
      ),
    ),
    /* The close of that year, not the exit date — see
       docs/how-it-works.md, "An exit date names a SCHEME
       YEAR, not a day". Reading the date puts this a whole
       year's accrual below the rest of this object for a
       mid-year leaver. */
    accruedAtExit: ledger.closingAt(schemeYearEndFor(exitDate)),
    revaluedAtRetirement: revalued,
    annualPension: drawn,
  };
}

/**
 * A member's age on a date, as WHOLE YEARS plus the fraction of
 * the year since their birthday.
 *
 * The whole part is calendar arithmetic, so it is the age they
 * would give if asked. The fraction only orders points within a
 * year, which is all the chart needs it for.
 */
function ageAtYearEnd(dateOfBirth: Date, on: Date): number {
  const birthdayIn = (year: number) => new Date(
    year, dateOfBirth.getMonth(), dateOfBirth.getDate(),
  );
  const thisYear = birthdayIn(on.getFullYear());
  const reached = thisYear <= on;
  const whole = on.getFullYear() - dateOfBirth.getFullYear()
    - (reached ? 0 : 1);
  const last = reached ? thisYear : birthdayIn(on.getFullYear() - 1);
  const next = reached ? birthdayIn(on.getFullYear() + 1) : thisYear;
  return whole
    + (on.getTime() - last.getTime())
      / (next.getTime() - last.getTime());
}

/**
 * The curve is the ledger's own steps, plotted ON THEM.
 *
 * **One point per scheme year, at its 31 March close** — the
 * date an Annual Benefit Statement is drawn to, so every
 * plotted value is a figure a member can lay beside paper.
 *
 * It used to be plotted at BIRTHDAYS, and that was the defect
 * behind a run of "the chart disagrees with my statement"
 * reports. A birthday falls somewhere inside a scheme year:
 * after the April uplift but before the year's slice lands, or
 * the other way about. So a member born in January read their
 * 43rd-birthday point as "the 2026 figure" and got a balance
 * that had neither the year's accrual nor anything to do with
 * a year end. The values were right for the dates and wrong
 * for every question anyone asked of them.
 *
 * The x-axis stays an AGE, because that is how people think
 * about retiring. Age N is plotted at the close of the scheme
 * year N's birthday falls in — the year that birthday belongs
 * to — so the axis is unchanged and only the dates behind it
 * move onto the scheme's own calendar.
 *
 * Nothing is drawn before the ledger's own start. For a
 * statement that is the statement's date, and the reason is
 * not tidiness: a member enters one figure, not their history,
 * so anything earlier would be that figure run BACKWARDS
 * through rates nobody checked. An inverse calculation drawn
 * as history is a claim the tool cannot support.
 */
function buildCurve(
  cash: Resolved,
  todays: Resolved,
): ProjectionPoint[] {
  const {today, dateOfBirth, retirementDate, npa} = cash;

  const endAge = Math.max(
    npa + 5, yearsBetween(dateOfBirth, retirementDate) + 5,
  );

  /** The scheme year an age's birthday falls in. */
  const yearOfAge = (age: number) => schemeYearEndFor(
    new Date(
      dateOfBirth.getFullYear() + age,
      dateOfBirth.getMonth(),
      dateOfBirth.getDate(),
    ),
  );

  /** The age whose birthday falls in a scheme year — the
   * inverse, used once to find where the axis starts. */
  const ageInYear = (schemeYearEnd: number) => {
    const end = schemeYearEndDate(schemeYearEnd);
    const birthday = new Date(
      schemeYearEnd, dateOfBirth.getMonth(), dateOfBirth.getDate(),
    );
    return schemeYearEnd - dateOfBirth.getFullYear()
      - (birthday > end ? 1 : 0);
  };

  const startAge = ageInYear(schemeYearEndFor(cash.curveFrom));

  const points: ProjectionPoint[] = [];
  for (let label = startAge; label <= Math.ceil(endAge); label++) {
    const year = yearOfAge(label);
    const on = schemeYearEndDate(year);
    /* The age the member actually IS on that 31 March, not the
       whole age whose birthday the scheme year contains.

       Those differ by anything from nought to twelve months —
       the gap between a birthday and the following 31 March —
       so plotting at the whole age put every value up to a year
       early on the x-axis. Where "today" fell in that gap the
       curve ran BACKWARDS: a member born in June read 7,738 at
       39, 8,577 at 40, then 7,854 at 40.2 for today, then
       9,429 at 41. Three of those are right; the axis was
       wrong.

       A January birthday hides it, being three months from the
       year end. A June one puts nine months of accrual in the
       wrong place.

       Built as WHOLE AGE + fraction rather than as a span in
       365.25-day years, so that `Math.floor(age)` is the age
       the member actually is on that 31 March — by calendar
       arithmetic, not within a rounding of it. Someone born on
       1 April reads 42.997 at the year end before their 43rd
       birthday, which floors correctly today and sits three
       thousandths from flooring wrongly after enough leap
       days. The fraction still orders the points; only the
       whole part is now guaranteed. */
    const age = ageAtYearEnd(dateOfBirth, on);
    /* Two walks meet here, and the estimate owns everything up
       to and including the statement's own year — its last row
       IS the stated balance, so reading it there rather than
       the main ledger changes nothing and keeps the join
       seamless. */
    const from = (r: Resolved) =>
      r.history !== null && year <= r.history.to
        ? r.history.ledger
        : r.ledger;
    const row = from(cash).years.find(
      (r) => r.schemeYearEnd === year,
    );
    points.push({
      age,
      nominal: from(cash).atDate(on),
      real: from(todays).atDate(on),
      accrued: on <= today,
      // Compared by scheme YEAR, matching the ledger's own
      // rule, not by date: a point sits at a 31 March close, so
      // a member who left in January of that year would read as
      // deferred on the very year they were still paying in.
      phase: row?.phase
        ?? (year <= schemeYearEndFor(cash.exitDate)
          ? 'active'
          : 'deferred'),
    });
  }
  return points;
}
