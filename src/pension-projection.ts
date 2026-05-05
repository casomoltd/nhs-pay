/**
 * NHS 2015 CARE Pension Projection
 *
 * Models the 2015 scheme lifecycle:
 * accrual → revaluation → crystallisation → commutation.
 *
 * Sources:
 *
 * GAD "NHSPS 2015 E&W — Early and late retirement in normal
 * health — Factors and guidance", 7 August 2019
 *   → ERF1 table (Appendix B, p.25)
 *   → LRF1 table (Appendix C, p.26)
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
  factorType: 'erf' | 'lrf' | 'none';
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

/**
 * ERF1 — Early Retirement Factors for 2015 scheme
 * GAD Appendix B, p.25 (7 August 2019)
 *
 * Rows = years early (0–13), Columns = months (0–11)
 * Factor applied to pension when retiring before NPA.
 */
const ERF1 = [
  //  0mo    1mo    2mo    3mo    4mo    5mo    6mo
  //  7mo    8mo    9mo   10mo   11mo
  [1.000, 0.997, 0.994, 0.992, 0.989, 0.986,
    0.983, 0.981, 0.978, 0.975, 0.972, 0.969],  // 0yr
  [0.967, 0.963, 0.960, 0.957, 0.953, 0.950,
    0.947, 0.943, 0.940, 0.937, 0.933, 0.930],  // 1yr
  [0.927, 0.923, 0.919, 0.916, 0.912, 0.909,
    0.905, 0.901, 0.898, 0.894, 0.891, 0.887],  // 2yr
  [0.884, 0.880, 0.876, 0.873, 0.869, 0.865,
    0.862, 0.858, 0.854, 0.851, 0.847, 0.843],  // 3yr
  [0.840, 0.836, 0.832, 0.828, 0.824, 0.820,
    0.816, 0.812, 0.808, 0.804, 0.800, 0.796],  // 4yr
  [0.792, 0.788, 0.784, 0.780, 0.776, 0.772,
    0.768, 0.764, 0.760, 0.756, 0.751, 0.747],  // 5yr
  [0.733, 0.729, 0.724, 0.720, 0.715, 0.711,
    0.706, 0.702, 0.697, 0.693, 0.689, 0.684],  // 6yr
  [0.680, 0.675, 0.671, 0.667, 0.662, 0.658,
    0.653, 0.649, 0.645, 0.640, 0.636, 0.632],  // 7yr
  [0.627, 0.623, 0.619, 0.614, 0.610, 0.606,
    0.602, 0.597, 0.593, 0.589, 0.585, 0.580],  // 8yr
  [0.576, 0.572, 0.568, 0.564, 0.560, 0.556,
    0.552, 0.548, 0.544, 0.540, 0.536, 0.532],  // 9yr
  [0.528, 0.525, 0.521, 0.517, 0.513, 0.510,
    0.506, 0.502, 0.498, 0.495, 0.491, 0.487],  // 10yr
  [0.484, 0.480, 0.477, 0.473, 0.470, 0.466,
    0.463, 0.459, 0.456, 0.452, 0.449, 0.446],  // 11yr
  [0.442, 0.439, 0.436, 0.432, 0.429, 0.426,
    0.422, 0.419, 0.416, 0.413, 0.409, 0.406],  // 12yr
  [0.540, 0.536, 0.531, 0.527, 0.522, 0.518,
    0.514, 0.509, 0.505, 0.501, 0.496, 0.492],  // 13yr
] as const;

/**
 * LRF1 — Late Retirement Factors for 2015 scheme
 * GAD Appendix C, p.26 (7 August 2019)
 *
 * Rows = years late (0–10), Columns = months (0–11)
 * Factor applied to pension when retiring after NPA.
 */
const LRF1 = [
  //  0mo    1mo    2mo    3mo    4mo    5mo    6mo
  //  7mo    8mo    9mo   10mo   11mo
  [1.000, 1.007, 1.013, 1.020, 1.027, 1.034,
    1.040, 1.047, 1.054, 1.061, 1.067, 1.074],  // 0yr
  [1.081, 1.088, 1.096, 1.103, 1.110, 1.117,
    1.125, 1.132, 1.139, 1.146, 1.154, 1.161],  // 1yr
  [1.168, 1.176, 1.183, 1.191, 1.198, 1.206,
    1.213, 1.221, 1.228, 1.236, 1.243, 1.251],  // 2yr
  [1.258, 1.266, 1.274, 1.282, 1.290, 1.298,
    1.306, 1.314, 1.322, 1.330, 1.338, 1.346],  // 3yr
  [1.354, 1.362, 1.370, 1.378, 1.387, 1.395,
    1.403, 1.412, 1.420, 1.429, 1.437, 1.446],  // 4yr
  [1.454, 1.463, 1.471, 1.480, 1.489, 1.497,
    1.506, 1.515, 1.524, 1.533, 1.542, 1.551],  // 5yr
  [1.560, 1.569, 1.578, 1.587, 1.596, 1.606,
    1.615, 1.624, 1.634, 1.643, 1.653, 1.662],  // 6yr
  [1.672, 1.681, 1.691, 1.701, 1.710, 1.720,
    1.730, 1.740, 1.750, 1.760, 1.770, 1.780],  // 7yr
  [1.790, 1.800, 1.810, 1.821, 1.831, 1.841,
    1.852, 1.862, 1.873, 1.883, 1.894, 1.905],  // 8yr
  [1.915, 1.926, 1.937, 1.948, 1.959, 1.970,
    1.981, 1.992, 2.003, 2.014, 2.026, 2.037],  // 9yr
  [1.411, 1.418, 1.425, 1.433, 1.440, 1.447,
    1.455, 1.462, 1.469, 1.477, 1.484, 1.492],  // 10yr
] as const;

// ── Factor Lookup ───────────────────────────────────

/** Look up ERF1 factor for given years and months early */
export function lookupErf1(
  years: number,
  months: number,
): number {
  if (years < 0 || years > 13 || months < 0 || months > 11) {
    throw new Error(
      `ERF1 out of range: ${years}yr ${months}mo`
      + ' (max 13yr 11mo)',
    );
  }
  return ERF1[years][months];
}

/** Look up LRF1 factor for given years and months late */
export function lookupLrf1(
  years: number,
  months: number,
): number {
  if (years < 0 || years > 10 || months < 0 || months > 11) {
    throw new Error(
      `LRF1 out of range: ${years}yr ${months}mo`
      + ' (max 10yr 11mo)',
    );
  }
  return LRF1[years][months];
}

// ── Date Arithmetic ─────────────────────────────────

/**
 * Calculate the period between two dates in years,
 * months, and remaining days.
 */
export function periodInYearsMonths(
  from: Date,
  to: Date,
): { years: number; months: number; days: number } {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();

  if (days < 0) {
    months -= 1;
    // Days in previous month of 'to'
    const prevMonth = new Date(
      to.getFullYear(),
      to.getMonth(),
      0,
    );
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {years, months, days};
}

// ── NPA Date ────────────────────────────────────────

/** Calculate NPA date from date of birth and NPA age */
export function npaDate(
  dateOfBirth: Date,
  npa: number,
): Date {
  return new Date(
    dateOfBirth.getFullYear() + npa,
    dateOfBirth.getMonth(),
    dateOfBirth.getDate(),
  );
}

// ── Retirement Factor ───────────────────────────────

/**
 * Determine whether ERF or LRF applies and return the
 * factor. ERF rounds UP to next month (§2.3), LRF
 * rounds DOWN to complete months (§3.4).
 */
export function retirementFactor(
  retirementDate: Date,
  npDate: Date,
): { factor: number; type: 'erf' | 'lrf' | 'none' } {
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
    // LRF rounds DOWN — ignore remaining days (§3.4)
    return {
      factor: lookupLrf1(period.years, period.months),
      type: 'lrf',
    };
  }

  // Early retirement — ERF rounds UP to next month (§2.3)
  const period = periodInYearsMonths(
    retirementDate,
    npDate,
  );
  let {years, months} = period;

  // Round up: if there are remaining days, add a month
  if (period.days > 0) {
    months += 1;
    if (months > 11) {
      months = 0;
      years += 1;
    }
  }

  return {
    factor: lookupErf1(years, months),
    type: 'erf',
  };
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
  if (fraction < 0 || fraction > 1) {
    throw new Error(
      `Commutation fraction must be 0–1, got ${fraction}`,
    );
  }
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

/** Fractional years between two dates */
function yearsBetween(from: Date, to: Date): number {
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  return (to.getTime() - from.getTime()) / msPerYear;
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
