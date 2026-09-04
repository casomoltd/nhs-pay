// ── Scales ───────────────────────────────────────
export {
  AFC_BANDS,
  AFC_BAND_IDS,
  AFC_HOURS_PER_YEAR,
  afcScaleSource,
  latestAfcYear,
  payYearLag,
  isAwaitingPayAward,
  assertPayYearLagIsSane,
  afcPayYears,
  NLW_HOURLY,
  WALES_LIVING_WAGE,
  annualiseHourly,
} from './scales.js';
export type {
  AfcBandId,
  HcasZone,
  HcasZones,
  WalesLivingWage,
} from './scales.js';
export type {ScalePoint} from './scale-point.js';

// ── Pension ──────────────────────────────────────
export {
  PensionTiers,
  getEmployerPensionRate,
  getPensionScheme,
  getPensionTiers,
  getPensionTiersVO,
  lookupPensionTier,
  pensionTierRate,
} from './pension.js';
export type {
  EmployerPensionRate,
  NhsPensionScheme,
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
  MEDICAL_PAY_YEARS,
  getMedicalScales,
  latestMedicalSource,
} from './medical-scales.js';
export type {
  MedicalGradeId,
  MedicalGradeMeta,
} from './medical-scales.js';
export {
  DENTAL_GRADES,
  DENTAL_GRADE_IDS,
  DENTAL_PAY_YEARS,
  getDentalScales,
} from './dental-scales.js';
export type {
  DentalGradeId,
  DentalGradeMeta,
} from './dental-scales.js';
// ── Errors ───────────────────────────────────────
export {
  AmbiguousScalePoint,
  AwardUnavailable,
  PensionTiersUnavailable,
  RetirementFactorOutOfRange,
  ScaleUnavailable,
} from './errors.js';

// ── Cited documents ──────────────────────────────
// Every published document the library reads a figure from. A consumer
// citing "where these figures come from" reads the record rather than
// keeping its own copy of the url.
export {DocumentSource} from './document-source.js';
export {
  isoDate,
  isoMonth,
  monthOf,
  firstOfMonth,
  monthToDate,
  isoToDate,
} from './iso-date.js';
export type {IsoDate, IsoMonth} from './iso-date.js';
export type {
  DocumentSourceFields,
  SourceCurrency,
} from './document-source.js';
export {
  AFC_ENGLAND_SCALES_2025,
  AFC_ENGLAND_SCALES_2026,
  AFC_NI_2025,
  AFC_SCOTLAND,
  AFC_SCOTLAND_36_HOUR_WEEK,
  AFC_W_02_2025,
  AFC_W_02_2026,
  HSC_TC8_05_2025,
  MD_W_01_2025,
  MD_W_01_2026,
  PC_MD_1_2026_R2,
  PCS_DD_2025_01,
  PCS_DD_2025_01_ADDENDUM,
  PCS_DD_2026_01,
  PCS_DD_2026_02,
} from './sources.js';

// ── Pay awards ───────────────────────────────────
export {
  AWARD_FAMILIES,
  afcAward,
  awardsFor,
  changesFor,
} from './award.js';
export type {
  AwardFamily,
  ForthcomingChange,
  PayAward,
  PayChange,
  PayScaleId,
} from './award.js';

// ── AfC allowances ───────────────────────────────
export {
  SESSION_ALLOWANCES,
  afcSessionAllowances,
  sessionAllowance,
} from './allowances.js';
export type {
  SessionAllowance,
  SessionAllowanceId,
} from './allowances.js';

export {
  ACTIVE_REVAL_BONUS_PCT,
  IN_SERVICE_REVALUATION,
  revaluationFor,
} from './revaluation.js';
export type {RevaluationYear} from './revaluation.js';

// ── Pension Projection ─────────────────────────────
// Deliberate surface: the scenario-level API plus
// yearlyAccrual (a consumer builds its pension-growth
// chart from it). Date plumbing (periodInYearsMonths,
// npaDate) and factor-table internals stay private —
// factor VALUES are reachable solely through
// retirementFactor/projectPension, which own the GAD
// rounding rules; factor PROVENANCE is data
// (factorProvenance), so consumers cite it, never
// hand-type it.
export {
  ACCRUAL_RATE,
  factorProvenance,
  projectPension,
  retirementFactor,
  yearlyAccrual,
} from './pension-projection.js';

// ── Commutation ──────────────────────────────────────
// Its own module: a choice taken AT retirement, on a pension
// the projection has already finished producing. Nothing in
// the projection calls into it.
export {
  COMMUTATION_FACTOR,
  HMRC_LUMP_SUM_CAP_PCT,
  LUMP_SUM_ALLOWANCE,
  LUMP_SUM_CAPS,
  nhsCommutationLimits,
  VALUATION_FACTOR,
  commute,
} from './commutation.js';
export type {
  CommutationLimits,
  CommutationResult,
  DatedAmount,
  LumpSumCap,
  LumpSumLimit,
  LumpSumLimits,
} from './commutation.js';
export type {
  FactorProvenance,
  FactorTableKind,
} from './gad/factor-table.js';

// ── Normal pension age ───────────────────────────────
export {normalPensionAge} from './npa.js';
export type {
  PensionEstimationInput,
  PensionProjectionInput,
  PensionProjectionResult,
  PensionStatementInput,
  ProjectionPoint,
} from './pension-projection.js';
export type {ProjectionMoney} from './pension/money.js';

// ── The pension ledger ───────────────────────────────
// Additive: the projection API above is unchanged, and a
// consumer reads the ledger only when it wants the workings.
export {createPrices} from './pension/prices.js';
export type {
  CpiEntry,
  CpiSource,
  Prices,
} from './pension/prices.js';
export {
  activeRatePct,
  deferredRatePct,
  upliftsFor,
} from './pension/uplift.js';
export type {
  AppliedUplift,
  MemberPhase,
  UpliftSource,
} from './pension/uplift.js';
export {
  schemeYearClosedBy,
  schemeYearEndDate,
  schemeYearEndFor,
  schemeYearStartDate,
  seedFromJoinDate,
  seedFromStatement,
} from './pension/seed.js';
export type {LedgerSeed} from './pension/seed.js';
export {buildLedger} from './pension/ledger.js';
export type {
  AppliedDrawing,
  LedgerRequest,
  LedgerYear,
  MemberLedger,
} from './pension/ledger.js';
export type {EstimatedHistory} from './pension/history.js';

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
  formatPctPrecise,
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
  PayYear,
  YearLabel,
} from '@casomoltd/paye-calc';
