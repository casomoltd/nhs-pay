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
import type {FactorTableKind} from './gad/factor-table.js';
import {ERF_0_420} from './gad/erf-2023-06-30.js';
import {LRF_0_421} from './gad/lrf-2023-06-30.js';

// ── Types ───────────────────────────────────────────

/** A point on the projection curve */
export interface ProjectionPoint {
  /** Age in years (can be fractional) */
  age: number;
  /** Annual pension in nominal £ */
  nominal: number;
  /** Annual pension in today's £ (CPI-deflated) */
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
  /** Accrued pension at exit date (nominal) */
  accruedAtExit: number;
  /** After revaluation, before ERF/LRF (nominal) */
  revaluedAtRetirement: number;
  /** After ERF/LRF (nominal) */
  annualPension: number;
  /** ERF or LRF factor applied */
  factor: number;
  factorType: FactorTableKind | 'none';
  /** Gap between revalued and drawn pension */
  adjustmentAmount: number;
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

// ── Factor Tables ───────────────────────────────────

// Which issue is in force is exactly these two constructions —
// swap the import when GAD supersedes a table (the two tables
// change on different dates, hence one issue file per table).
const ERF1 = new FactorTable(ERF_0_420);
const LRF1 = new FactorTable(LRF_0_421);

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
  const adjustmentAmount = resolved.revaluedAtRetirement
    - resolved.annualPension;

  return {
    accruedAtExit: resolved.accruedAtExit,
    revaluedAtRetirement: resolved.revaluedAtRetirement,
    annualPension: resolved.annualPension,
    factor: resolved.factor,
    factorType: resolved.factorType,
    adjustmentAmount,
    curve: buildCurve(resolved),
    isEstimation: resolved.isEstimation,
  };
}

// ── Internal Helpers ────────────────────────────────

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
  readonly currentSalary: number;
  /** CPI + in-service bonus, computed once */
  readonly activeRate: number;
}

/**
 * Nominal accrued pension at a date in the active phase.
 * A date at or before the origin degrades to zero years,
 * which simulateAccrual returns untouched — so the
 * statement path's "already past exit" case needs no
 * special branch.
 */
function accruedNominalAt(
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
    activeRate: assumedCpi + ACTIVE_REVAL_BONUS,
  };

  const accruedAtExit = accruedNominalAt(anchor, exitDate);

  // Revalue from exit to retirement (deferred = CPI
  // only); revalue self-guards non-positive periods
  const revaluedAtRetirement = revalue(
    accruedAtExit,
    assumedCpi,
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

/** Build the projection curve at yearly intervals */
function buildCurve(
  resolved: ResolvedProjection,
): ProjectionPoint[] {
  const {
    today,
    dateOfBirth,
    retirementDate,
    npa,
    assumedCpi,
  } = resolved;

  const points: ProjectionPoint[] = [];
  const currentAge = yearsBetween(dateOfBirth, today);
  const endAge = Math.max(
    npa + 5,
    yearsBetween(dateOfBirth, retirementDate) + 5,
  );
  const startAge = Math.floor(currentAge);

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
    const yearsFromToday = yearsBetween(today, pointDate);

    const {nominal, accrued} = curvePointValue(
      resolved, pointDate,
    );

    const deflator = Math.pow(
      1 + assumedCpi, Math.max(0, yearsFromToday),
    );
    const real = nominal / deflator;
    points.push({age, nominal, real, accrued});
  }

  return points;
}

/**
 * Nominal value and accrued flag for one curve point —
 * names the three lifecycle phases (active, deferred,
 * in payment) and nothing else.
 */
function curvePointValue(
  resolved: ResolvedProjection,
  pointDate: Date,
): { nominal: number; accrued: boolean } {
  const {
    today,
    exitDate,
    retirementDate,
    assumedCpi,
  } = resolved;

  if (pointDate <= exitDate) {
    const nominal = accruedNominalAt(resolved, pointDate);
    return {nominal, accrued: pointDate <= today};
  }
  if (pointDate <= retirementDate) {
    const yrsDeferred = yearsBetween(exitDate, pointDate);
    const nominal = revalue(
      resolved.accruedAtExit, assumedCpi, yrsDeferred,
    );
    return {nominal, accrued: false};
  }
  // In payment — grows from the annualPension the
  // projection reports, never a re-derivation of it
  const yrsInPayment = yearsBetween(
    retirementDate, pointDate,
  );
  const nominal = revalue(
    resolved.annualPension, assumedCpi, yrsInPayment,
  );
  return {nominal, accrued: false};
}
