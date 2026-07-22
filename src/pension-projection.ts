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
 */
export function projectPension(
  input: PensionProjectionInput,
): PensionProjectionResult {
  const {
    dateOfBirth,
    exitDate,
    retirementDate,
    npa,
    assumedCpi,
  } = input;

  const today = new Date();
  const npDateValue = npaDate(dateOfBirth, npa);
  const isEstimation = input.kind === 'estimation';

  const accruedAtExit = computeAccruedAtExit(
    input, today,
  );

  // Revalue from exit to retirement (deferred = CPI only)
  const exitToRetirement = yearsBetween(
    exitDate, retirementDate,
  );
  const revaluedAtRetirement = exitToRetirement > 0
    ? revalue(accruedAtExit, assumedCpi, exitToRetirement)
    : accruedAtExit;

  // Apply ERF/LRF
  const {factor, type: factorType} = retirementFactor(
    retirementDate,
    npDateValue,
  );
  const annualPension = revaluedAtRetirement * factor;
  const adjustmentAmount = revaluedAtRetirement
    - annualPension;

  // Generate curve
  const curve = buildCurve(input, accruedAtExit, today);

  return {
    accruedAtExit,
    revaluedAtRetirement,
    annualPension,
    factor,
    factorType,
    adjustmentAmount,
    curve,
    isEstimation,
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

/** Determine accrued pension at exit date */
function computeAccruedAtExit(
  input: PensionProjectionInput,
  today: Date,
): number {
  const {currentSalary, exitDate, assumedCpi} = input;
  const activeRate = assumedCpi + ACTIVE_REVAL_BONUS;

  if (input.kind === 'statement') {
    const yearsToExit = yearsBetween(today, exitDate);
    if (yearsToExit <= 0) return input.accruedPension;
    return simulateAccrual(
      input.accruedPension, currentSalary,
      activeRate, yearsToExit,
    );
  }

  // Estimation: accrue from join to exit
  const joinToExit = yearsBetween(
    input.joinDate, exitDate,
  );
  return simulateAccrual(
    0, currentSalary, activeRate,
    Math.max(0, joinToExit),
  );
}

/** Compute nominal pension for a point in active phase */
function activeNominal(
  input: PensionProjectionInput,
  pointDate: Date,
  today: Date,
  activeRate: number,
): number {
  const {currentSalary} = input;
  if (input.kind === 'statement') {
    const yrs = Math.max(
      0, yearsBetween(today, pointDate),
    );
    return simulateAccrual(
      input.accruedPension, currentSalary,
      activeRate, yrs,
    );
  }
  const yrsFromJoin = yearsBetween(
    input.joinDate, pointDate,
  );
  return simulateAccrual(
    0, currentSalary, activeRate,
    Math.max(0, yrsFromJoin),
  );
}

/** Build the projection curve at yearly intervals */
function buildCurve(
  input: PensionProjectionInput,
  accruedAtExit: number,
  today: Date,
): ProjectionPoint[] {
  const {
    dateOfBirth,
    exitDate,
    retirementDate,
    npa,
    assumedCpi,
  } = input;

  const npDateValue = npaDate(dateOfBirth, npa);
  const points: ProjectionPoint[] = [];

  const currentAge = yearsBetween(dateOfBirth, today);
  const endAge = Math.max(
    npa + 5,
    yearsBetween(dateOfBirth, retirementDate) + 5,
  );
  const startAge = Math.floor(currentAge);
  const activeRate = assumedCpi + ACTIVE_REVAL_BONUS;

  // Pre-compute pension at retirement for in-payment
  const exitToRet = Math.max(
    0, yearsBetween(exitDate, retirementDate),
  );
  const {factor} = retirementFactor(
    retirementDate, npDateValue,
  );
  const atRetirement = revalue(
    accruedAtExit, assumedCpi, exitToRet,
  ) * factor;

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
      input, pointDate, today, exitDate,
      retirementDate, accruedAtExit, assumedCpi,
      activeRate, atRetirement,
    );

    const deflator = Math.pow(
      1 + assumedCpi, Math.max(0, yearsFromToday),
    );
    const real = nominal / deflator;
    points.push({age, nominal, real, accrued});
  }

  return points;
}

/** Determine nominal value and accrued flag for a point */
function curvePointValue(
  input: PensionProjectionInput,
  pointDate: Date,
  today: Date,
  exitDate: Date,
  retirementDate: Date,
  accruedAtExit: number,
  assumedCpi: number,
  activeRate: number,
  atRetirement: number,
): { nominal: number; accrued: boolean } {
  if (pointDate <= exitDate) {
    const nominal = activeNominal(
      input, pointDate, today, activeRate,
    );
    return {nominal, accrued: pointDate <= today};
  }
  if (pointDate <= retirementDate) {
    const yrsDeferred = yearsBetween(exitDate, pointDate);
    const nominal = revalue(
      accruedAtExit, assumedCpi, yrsDeferred,
    );
    return {nominal, accrued: false};
  }
  // In payment
  const yrsInPayment = yearsBetween(
    retirementDate, pointDate,
  );
  const nominal = revalue(
    atRetirement, assumedCpi, yrsInPayment,
  );
  return {nominal, accrued: false};
}
