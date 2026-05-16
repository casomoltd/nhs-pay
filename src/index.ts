// ── Scales ───────────────────────────────────────
export {
  AFC_BANDS,
  AFC_BAND_IDS,
  AFC_HOURS_PER_YEAR,
  AFC_TAX_YEARS,
  NLW_HOURLY,
  WALES_LW_FLOOR,
  annualiseHourly,
  applyWalesFloor,
} from './scales.js';
export type {
  AfcBandId,
  HcasZone,
  HcasZones,
  ScalePoint,
} from './scales.js';

// ── Pension ──────────────────────────────────────
export {
  getPensionTiers,
  lookupPensionTier,
  pensionTierRate,
} from './pension.js';
export type {PensionTier} from './pension.js';

// ── Pension Projection ─────────────────────────────
export {
  ACCRUAL_RATE,
  COMMUTATION_FACTOR,
  commute,
  lookupErf1,
  lookupLrf1,
  maxLumpSum,
  npaDate,
  periodInYearsMonths,
  projectPension,
  retirementFactor,
  revalue,
  yearlyAccrual,
} from './pension-projection.js';
export type {
  CommutationResult,
  PensionEstimationInput,
  PensionProjectionInput,
  PensionProjectionResult,
  PensionStatementInput,
  ProjectionPoint,
} from './pension-projection.js';

// ── HCAS ─────────────────────────────────────────
export {
  HCAS_ZONE_IDS,
  calculateHcasSupplement,
  grossSalary,
  isHcasZoneId,
} from './hcas.js';
export type {HcasZoneId} from './hcas.js';

// ── HCAS PCTs ────────────────────────────────────
export {
  getHcasPcts,
  getHcasZone,
} from './hcas-pcts.js';
export type {HcasPct} from './hcas-pcts.js';

// ── Regions ──────────────────────────────────────
export {
  AFC_REGIONS,
  ZONE_LABELS,
  ZONE_TO_REGION,
  afcRegionToHcasZone,
  afcRegionToNation,
  isAfcRegionId,
  isNation,
  resolveRegion,
} from './regions.js';
export type {
  AfcRegionId,
  ResolvedRegion,
} from './regions.js';

// ── Bands ────────────────────────────────────────
export {
  AFC_BAND_INFO,
  AFC_CURRENT_YEAR,
  AFC_PREVIOUS_YEAR,
  getAfcScales,
} from './bands.js';
export type {
  AfcBandInfo,
  AfcBandMeta,
  AfcScaleData,
} from './bands.js';

// ── Take-home ────────────────────────────────────
export {nhsTakeHome} from './take-home.js';

// ── Format ───────────────────────────────────────
export {
  fmtMoney,
  fmtPct,
  fmtSalary,
  formatGBP,
  formatGBPPrecise,
  formatPct,
  yearLabel,
} from './format.js';

// ── Re-exports from paye-calc ────────────────────
// Types that appear in our public API so consumers
// don't need a direct paye-calc import for NHS work.
export {
  TAX_REGIONS,
  TAX_YEARS,
  NATIONS,
  NATION_KEYS,
  TakeHomePay,
  GrossAnnual,
  PensionBasis,
  PensionPercent,
  StudentLoanPlan,
  nationToTaxRegion,
  getTaxYearConfig,
  hoursPerYear,
} from '@casomoltd/paye-calc';
export type {
  Nation,
  TaxRegion,
  TaxYear,
} from '@casomoltd/paye-calc';
