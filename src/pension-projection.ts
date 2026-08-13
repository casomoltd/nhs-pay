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
 * ── Which ruler this projects in ────────────────────
 *
 * Everything here is computed in TODAY'S MONEY, and cash
 * terms are that figure scaled by CPI. This is not a
 * presentation choice: every promise the 2015 scheme makes is
 * expressed RELATIVE to CPI (in service CPI + 1.5%, deferred
 * and in payment CPI exactly), so with pay holding its value
 * the scheme's real behaviour is CPI-free — +1.5% a year
 * while you pay in, flat once you stop. Only the translation
 * to cash reads `assumedCpi`.
 *
 * Projecting in cash instead requires growing pay at CPI to
 * stay self-consistent. Holding pay flat in CASH while
 * revaluing the pot at CPI + 1.5% — the shape this module
 * used to have — counts inflation twice on historic service:
 * it treats a salary from ten years ago as worth today's
 * number in today's prices, then revalues the pension it
 * bought as though it were not.
 *
 * The scaling between the two rulers is exact, not an
 * approximation. In service the cash pot grows (1+cpi)(1.015)
 * while the slice it adds grows (1+cpi); deferred and in
 * payment both grow at CPI. The (1+cpi)^t factor therefore
 * divides out of every term, so ONE projection serves both
 * rulers and the two can never disagree.
 *
 * NHSBSA Key Notes — 2015 Scheme Estimates (V2), March 2025
 *   → Commutation rate: £12 lump sum per £1 pension
 *   → HMRC 25% cap on lump sum
 */

import {invariant} from './errors.js';
import {
  npaDate,
  periodInYearsMonths,
  yearsBetween,
} from './dates.js';
import {FactorTable} from './gad/factor-table.js';
import type {
  FactorProvenance,
  FactorTableKind,
} from './gad/factor-table.js';
import {ERF_0_420} from './gad/erf-2023-06-30.js';
import {LRF_0_421} from './gad/lrf-2023-06-30.js';

// ── Types ───────────────────────────────────────────

/**
 * One figure in both rulers. Every scalar the projection
 * reports is a pair, so a consumer picks a ruler rather than
 * doing CPI arithmetic of its own — and so it can never apply
 * the wrong horizon to a figure, because each pair was scaled
 * against the date its own figure falls on.
 */
export interface ProjectionMoney {
  /** Today's money — the projection's native ruler. */
  readonly real: number;
  /** Actual pounds, at the date this figure falls on. */
  readonly nominal: number;
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
  /** Whether this is accrued (known) or projected */
  accrued: boolean;
}

/** Input for statement path */
export interface PensionStatementInput {
  kind: 'statement';
  /** Accrued pension from Annual Benefit Statement (£/yr) */
  accruedPension: number;
  /** Current pensionable pay */
  currentSalary: number;
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
  /** Accrued pension at exit date, scaled at the EXIT date */
  accruedAtExit: ProjectionMoney;
  /** After revaluation, before ERF/LRF, at retirement */
  revaluedAtRetirement: ProjectionMoney;
  /** After ERF/LRF, at retirement */
  annualPension: ProjectionMoney;
  /** ERF or LRF factor applied */
  factor: number;
  factorType: FactorTableKind | 'none';
  /** Gap between revalued and drawn pension, at retirement */
  adjustmentAmount: ProjectionMoney;
  /** Curve data for chart (both views) */
  curve: ProjectionPoint[];
  /** Whether estimation path was used */
  isEstimation: boolean;
}

// ── Constants ───────────────────────────────────────

/** 1/54 accrual rate — NHS 2015 CARE scheme */
export const ACCRUAL_RATE = 1 / 54;

/** Commutation: £12 lump sum per £1 pension */
export const COMMUTATION_FACTOR = 12;

/** In-service revaluation bonus above CPI */
const ACTIVE_REVAL_BONUS = 0.015;

/**
 * The scheme's promises in today's money. Each is the headline
 * rate MINUS the CPI it is quoted against, which is why none
 * of them mentions `assumedCpi`:
 *  - paying in: CPI + 1.5% ⇒ 1.5% real
 *  - deferred:  CPI        ⇒ flat
 *  - in payment: CPI       ⇒ flat
 * The two flat rates are named rather than inlined because
 * "the pension holds its value" is the scheme's actual
 * guarantee, and a bare 0 reads like an omission.
 */
const ACTIVE_REAL_RATE = ACTIVE_REVAL_BONUS;
const DEFERRED_REAL_RATE = 0;
const IN_PAYMENT_REAL_RATE = 0;

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
  const resolved = resolveProjection(input, today);
  // Each figure is scaled against ITS OWN date: the exit
  // figure is cash at exit, the retirement ones cash at
  // retirement. Handing consumers a horizon to apply is what
  // let one of them deflate the exit figure over the years to
  // retirement.
  const atExit = (real: number) =>
    money(resolved, real, resolved.exitDate);
  const atRetirement = (real: number) =>
    money(resolved, real, resolved.retirementDate);

  return {
    accruedAtExit: atExit(resolved.accruedAtExit),
    revaluedAtRetirement: atRetirement(
      resolved.revaluedAtRetirement,
    ),
    annualPension: atRetirement(resolved.annualPension),
    factor: resolved.factor,
    factorType: resolved.factorType,
    adjustmentAmount: atRetirement(
      resolved.revaluedAtRetirement - resolved.annualPension,
    ),
    curve: buildCurve(resolved),
    isEstimation: resolved.isEstimation,
  };
}

// ── Internal Helpers ────────────────────────────────

/**
 * Today's money → actual pounds at `date`. The exponent is
 * SIGNED: a date in the past scales the figure down, because
 * the same real pension was fewer actual pounds back then.
 */
function money(
  resolved: ResolvedProjection,
  real: number,
  date: Date,
): ProjectionMoney {
  const years = yearsBetween(resolved.today, date);
  return {
    real,
    nominal: real * Math.pow(1 + resolved.assumedCpi, years),
  };
}

/**
 * Simulate year-by-year accrual with in-service
 * revaluation over a fractional number of years.
 */
function simulateAccrual(
  startPension: number,
  salary: number,
  activeRate: number,
  years: number,
): number {
  let pension = startPension;
  const fullYears = Math.max(0, Math.floor(years));
  for (let i = 0; i < fullYears; i++) {
    pension = pension * (1 + activeRate)
      + yearlyAccrual(salary);
  }
  const partial = years - fullYears;
  if (partial > 0) {
    pension = pension * (1 + activeRate * partial)
      + yearlyAccrual(salary) * partial;
  }
  return pension;
}

/**
 * The kind-independent seed of the accrual simulation.
 * Normalising input.kind down to this pair is what lets
 * one evaluator serve both the exit computation and
 * every active-phase curve point.
 */
interface AccrualAnchor {
  /** Pension already banked at the origin date */
  readonly accrualBase: number;
  /** Date accrual simulation starts from */
  readonly accrualOrigin: Date;
  /** Held flat in TODAY'S money: the member's pay keeps its
   * value rather than its cash figure. */
  readonly currentSalary: number;
  /** The in-service real rate — CPI-free by construction. */
  readonly activeRate: number;
}

/**
 * Accrued pension in today's money at a date in the active
 * phase. A date at or before the origin degrades to zero
 * years, which simulateAccrual returns untouched — so the
 * statement path's "already past exit" case needs no
 * special branch.
 */
function accruedRealAt(
  anchor: AccrualAnchor,
  date: Date,
): number {
  const years = Math.max(
    0, yearsBetween(anchor.accrualOrigin, date),
  );
  return simulateAccrual(
    anchor.accrualBase, anchor.currentSalary,
    anchor.activeRate, years,
  );
}

/**
 * Kind-normalised, today-anchored evaluation context —
 * the single producer of every at-retirement value.
 * projectPension assembles its result from these fields
 * and buildCurve reads the same ones, so the curve's
 * in-payment base IS annualPension by construction.
 */
interface ResolvedProjection extends AccrualAnchor {
  /** Every scalar below is TODAY'S MONEY; projectPension
   * pairs each with its cash reading at its own date. */
  readonly today: Date;
  readonly dateOfBirth: Date;
  readonly exitDate: Date;
  readonly retirementDate: Date;
  readonly npa: number;
  readonly assumedCpi: number;
  readonly isEstimation: boolean;
  readonly accruedAtExit: number;
  readonly revaluedAtRetirement: number;
  readonly factor: number;
  readonly factorType: FactorTableKind | 'none';
  readonly annualPension: number;
}

/** The single place input.kind is read */
function resolveProjection(
  input: PensionProjectionInput,
  today: Date,
): ResolvedProjection {
  const {
    currentSalary,
    dateOfBirth,
    exitDate,
    retirementDate,
    npa,
    assumedCpi,
  } = input;
  const isEstimation = input.kind === 'estimation';

  // The accrual anchor is the only residue of kind:
  // statement = (ABS figure, today);
  // estimation = (nothing banked, scheme join date).
  const anchor: AccrualAnchor = {
    accrualBase: isEstimation ? 0 : input.accruedPension,
    accrualOrigin: isEstimation ? input.joinDate : today,
    currentSalary,
    activeRate: ACTIVE_REAL_RATE,
  };

  const accruedAtExit = accruedRealAt(anchor, exitDate);

  // Deferred revaluation is CPI exactly, so in today's money
  // the pension simply holds its value. The call stays to
  // name the phase; revalue self-guards non-positive periods.
  const revaluedAtRetirement = revalue(
    accruedAtExit,
    DEFERRED_REAL_RATE,
    yearsBetween(exitDate, retirementDate),
  );

  // Apply ERF/LRF
  const {factor, type: factorType} = retirementFactor(
    retirementDate,
    npaDate(dateOfBirth, npa),
  );
  const annualPension = revaluedAtRetirement * factor;

  return {
    ...anchor,
    today,
    dateOfBirth,
    exitDate,
    retirementDate,
    npa,
    assumedCpi,
    isEstimation,
    accruedAtExit,
    revaluedAtRetirement,
    factor,
    factorType,
    annualPension,
  };
}

/**
 * Build the projection curve at yearly intervals. The curve
 * begins at the accrual origin — the scheme join date on the
 * estimation path — so the built-up history is on the curve,
 * not just the projection forward (a statement's accrual
 * origin is today: an ABS figure carries no join history).
 */
function buildCurve(
  resolved: ResolvedProjection,
): ProjectionPoint[] {
  const {
    today,
    dateOfBirth,
    retirementDate,
    npa,
  } = resolved;

  const points: ProjectionPoint[] = [];
  const currentAge = yearsBetween(dateOfBirth, today);
  const originAge = yearsBetween(
    dateOfBirth, resolved.accrualOrigin,
  );
  const endAge = Math.max(
    npa + 5,
    yearsBetween(dateOfBirth, retirementDate) + 5,
  );
  const startAge = Math.floor(
    Math.min(currentAge, originAge),
  );

  for (
    let age = startAge;
    age <= Math.ceil(endAge);
    age++
  ) {
    const pointDate = new Date(
      dateOfBirth.getFullYear() + age,
      dateOfBirth.getMonth(),
      dateOfBirth.getDate(),
    );
    const {real, accrued} = curvePointValue(
      resolved, pointDate,
    );
    const {nominal} = money(resolved, real, pointDate);
    points.push({age, nominal, real, accrued});
  }

  return points;
}

/**
 * Today's-money value and accrued flag for one curve point —
 * names the three lifecycle phases (active, deferred,
 * in payment) and nothing else. The two revalue calls are
 * flat in this ruler, which IS the shape the reader sees:
 * the line rises only while you are paying in.
 */
function curvePointValue(
  resolved: ResolvedProjection,
  pointDate: Date,
): { real: number; accrued: boolean } {
  const {today, exitDate, retirementDate} = resolved;

  if (pointDate <= exitDate) {
    const real = accruedRealAt(resolved, pointDate);
    return {real, accrued: pointDate <= today};
  }
  if (pointDate <= retirementDate) {
    const yrsDeferred = yearsBetween(exitDate, pointDate);
    const real = revalue(
      resolved.accruedAtExit, DEFERRED_REAL_RATE, yrsDeferred,
    );
    return {real, accrued: false};
  }
  // In payment — grows from the annualPension the
  // projection reports, never a re-derivation of it
  const yrsInPayment = yearsBetween(
    retirementDate, pointDate,
  );
  const real = revalue(
    resolved.annualPension, IN_PAYMENT_REAL_RATE, yrsInPayment,
  );
  return {real, accrued: false};
}
