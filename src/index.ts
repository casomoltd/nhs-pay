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
} from './scales.js';
export type {ScalePoint} from './scale-point.js';

// ── Pension ──────────────────────────────────────
export {
  PensionTiers,
  getEmployerPensionRate,
  getPensionTiers,
  getPensionTiersVO,
  lookupPensionTier,
  pensionTierRate,
} from './pension.js';
export type {
  EmployerPensionRate,
  PensionTier,
} from './pension.js';

// ── Value objects ────────────────────────────────
export type {SalaryRange} from './values.js';

// ── Post & resolvers ─────────────────────────────
export {Post, NO_ADJUSTMENTS} from './post.js';
export type {PostIdentity, PostAdjustments} from './post.js';
export type {
  AfcRole,
  DentalRole,
  MedicalRole,
  Role,
  RoleKind,
  VsmRole,
} from './role.js';
export {afcResolver, dentalResolver, medicalResolver} from './resolver.js';
export type {
  AfcResolver,
  DentalResolver,
  MedicalResolver,
  NationScaleResolver,
  PayScaleResolver,
} from './resolver.js';

// ── Medical & dental scales ──────────────────────
export {
  MEDICAL_GRADES,
  MEDICAL_GRADE_IDS,
  MEDICAL_TAX_YEARS,
  getMedicalScales,
} from './medical-scales.js';
export type {
  MedicalGradeId,
  MedicalGradeMeta,
} from './medical-scales.js';
export {
  DENTAL_GRADES,
  DENTAL_GRADE_IDS,
  DENTAL_TAX_YEARS,
  getDentalScales,
} from './dental-scales.js';
export type {
  DentalGradeId,
  DentalGradeMeta,
} from './dental-scales.js';
export {
  AwardUnavailable,
  PensionTiersUnavailable,
  ScaleUnavailable,
} from './errors.js';

// ── AfC pay award ────────────────────────────────
export {afcAward} from './award.js';

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
  AFC_CURRENT_YEAR,
  AFC_PREVIOUS_YEAR,
  getAfcScales,
} from './bands.js';
export type {
  AfcBandMeta,
  AfcScaleData,
} from './bands.js';

// ── Take-home ────────────────────────────────────
export {nhsTakeHome} from './take-home.js';
export type {NhsTakeHomeOptions} from './take-home.js';

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
