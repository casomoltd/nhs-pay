// ── Scales ───────────────────────────────────────
export {afcBand1} from './afc-scales.js';
export type {AfcBand1, AfcBand1Published} from './afc-scales.js';
export {
  AFC_BANDS,
  AFC_BAND_IDS,
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
export type {PayLadder, ScalePoint} from './scale-point.js';

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

// ── Pay elements ─────────────────────────────────
export {
  PENSION_SCHEMES,
  elementPay,
  isPensionable,
  pensionSchemeOf,
} from './pay-elements.js';
export type {PayElement, PensionScheme} from './pay-elements.js';
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
// ── Additional pension ───────────────────────────
export {
  ADDITIONAL_PENSION_LIMIT,
  ADDITIONAL_PENSION_PAYMENTS,
  ADDITIONAL_PENSION_UNIT,
  additionalPensionCost,
  additionalPensionToBuy,
} from './additional-pension.js';
export type {
  AdditionalPensionPayment,
  AdditionalPensionPurchase,
} from './additional-pension.js';
export {ADDITIONAL_PENSION_COVERS} from './gad/additional-pension-table.js';
export type {
  AdditionalPensionCover,
  AdditionalPensionProvenance,
} from './gad/additional-pension-table.js';
// ── Errors ───────────────────────────────────────
export {
  ADDITIONAL_PENSION_REFUSALS,
  AdditionalPensionUnavailable,
  AmbiguousScalePoint,
  AwardUnavailable,
  BeforeStatement,
  BenefitNotModelled,
  isBeforeStatement,
  NOT_MODELLED,
  PayPathUnavailable,
  PensionTiersUnavailable,
  RetirementFactorOutOfRange,
  RuleUnsourced,
  ScaleUnavailable,
  STATEMENT_READS,
} from './errors.js';
export type {
  AdditionalPensionRefusal, NotModelled, StatementRead,
} from './errors.js';

// ── Cited documents ──────────────────────────────
// Every published document the library reads a figure from. A consumer
// citing "where these figures come from" reads the record rather than
// keeping its own copy of the url.
export {DocumentSource, SOURCE_CURRENCIES} from './document-source.js';
export {
  isoDate,
  isoMonth,
  monthOf,
  firstOfMonth,
  monthToDate,
  isoToDate,
  isoDateOf,
} from './iso-date.js';
export type {IsoDate, IsoMonth} from './iso-date.js';
export type {
  DocumentSourceFields,
  PageSource,
  SourceCurrency,
} from './document-source.js';
export {
  AFC_ENGLAND_SCALES_2025,
  AFC_ENGLAND_SCALES_2026,
  AFC_NI_2025,
  AFC_SCOTLAND,
  AFC_SCOTLAND_36_HOUR_WEEK,
  AFC_W_01_2026,
  AFC_W_02_2025,
  AFC_W_02_2026,
  AP_FACTSHEET_2026,
  DHSC_PETITION_779519,
  FA2004_SCH36_PARA_23ZB,
  SPPA_NHS_CIRCULAR_2025_09,
  HSC_TC8_05_2025,
  MD_W_01_2025,
  MD_W_01_2026,
  NHSBSA_ESTIMATE_GUIDE,
  NHSBSA_STATEMENT_GUIDE,
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
  anyNationSettled,
  awardFamilyFor,
  awardsFor,
  backdatedMonths,
  changesFor,
} from './award.js';
export type {
  AwardFamily,
  ForthcomingChange,
  PayAward,
  PayChange,
  PayScaleId,
} from './award.js';

// ── Pay rounds ───────────────────────────────────
// Where a nation's round has got to, derived from the award table and
// the published scales rather than stored anywhere.
export {payRound} from './pay-round.js';
export {payYearStartDate} from './pay-year.js';
export type {PayRound, RoundStatus} from './pay-round.js';

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
  activeRatePct,
  IN_SERVICE_REVALUATION,
  revaluationFor,
} from './revaluation.js';
export type {RevaluationYear} from './revaluation.js';

// ── Pay path ───────────────────────────────────────
// GAD's promotional curve is the same for everybody, so it is public;
// a member's pay path is built inside and reached through the member's
// benefits.
export {buildPayPath, PAY_BASES, promotionalIndex} from './pay-path.js';
export type {PayBasis, PayPath, YearPay} from './pay-path.js';

// ── Member benefits ────────────────────────────────
// A member's benefits across every section they hold: built once from
// the member, asked once per set of retirement choices. The sections
// themselves are internal.
export {
  ACCRUALS,
  memberBenefits,
  PAST_YEARS,
  ALLOWANCE_STATUS,
  allowanceReading,
  firstYearOver,
  PERIOD_KINDS,
  REMEDY,
  REMEDY_BASES,
  SECTION_OPENED,
  SECTIONS,
} from './member/index.js';
export {PAY_MEASURES} from './sections/final-salary.js';
export type {PayMeasure} from './sections/final-salary.js';
export type {
  AllowanceInput,
  AllowanceReading,
  AllowanceStatus,
  AllowanceYear,
  Assumptions,
  Award,
  DeclaredPeriod,
  Holdings,
  LegacyRules,
  LegacySectionId,
  Member,
  MemberBenefits,
  PastYears,
  Position,
  RemedyBasis,
  RemedyElection,
  RetirementChoices,
  RulerLedgers,
  Section2015Walk,
  SectionId,
  ServicePeriod,
  StatementBalance,
} from './member/index.js';
export type {DeclaredPay, MemberPay} from './pay-path.js';
export {FACTOR_APPLIES, FACTOR_SOURCES} from './factor-basis.js';
export type {Applies2015, Factored, FactorOutcome} from './factor-basis.js';
export {factor2015} from './sections/section-2015.js';
export {CASH_CHOICES} from './commutation.js';
export type {CashChoice} from './commutation.js';

// ── Pension Projection ─────────────────────────────
// The 2015 Section's scenario-level API, plus yearlyAccrual (one
// scheme year's accrual) and the period-keyed ERF. Date plumbing
// and factor-table internals stay private — a factor VALUE is reached
// only through a function that owns GAD's rounding rules; factor
// PROVENANCE is data (factorProvenance), so consumers cite it, never
// hand-type it.
export {
  ACCRUAL_RATE,
  erf2015For,
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
  GadTableProvenance,
} from './gad/factor-table.js';

// ── Pension ages ─────────────────────────────────────
export {
  firstJoinedOf,
  LEGACY_PENSION_AGES,
  mayDrawOn,
  memberMinimumPensionAge,
  MPA_KEPT_AGE,
  MPA_RISE_JOINED_AFTER,
  normalPensionAge,
} from './pension/ages.js';
export type {JoiningHistory} from './pension/ages.js';

// ── Pension projection types ─────────────────────────
export type {
  PensionEstimationInput,
  PensionProjectionInput,
  PensionProjectionResult,
  PensionStatementInput,
} from './pension-projection.js';
export type {ProjectionPoint} from './pension/curve.js';
export type {ProjectionMoney} from './pension/money.js';

// ── The pension ledger ───────────────────────────────
// A consumer reads the ledger only when it wants the workings.
export {
  createPrices,
  createPublishedPrices,
  inflationFactor,
  TODAYS_MONEY_CPI,
} from './pension/prices.js';
export type {
  CpiEntry,
  CpiSource,
  Prices,
} from './pension/prices.js';
export {
  deferredRatePct,
  MEMBER_PHASES,
  upliftsFor,
} from './pension/uplift.js';
export type {
  AppliedUplift,
  MemberPhase,
  UpliftSource,
} from './pension/uplift.js';
export {
  isSchemeYearEnd,
  schemeYearAfter,
  schemeYearBefore,
  schemeYearClosedBy,
  schemeYearEnd,
  schemeYearEndDate,
  schemeYearEndFor,
  schemeYearStartDate,
} from './pension/scheme-year.js';
export type {SchemeYearEnd} from './pension/scheme-year.js';
export {
  SEED_BASES,
  seedFromJoinDate,
  seedFromStatement,
} from './pension/seed.js';
export type {LedgerSeed, SeedBasis} from './pension/seed.js';
export {buildLedger} from './pension/ledger.js';
export type {
  AppliedDrawing,
  AppliedLeaverAdjustment,
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
  afcPointOf,
  getAfcScales,
} from './bands.js';
export type {
  AfcBandMeta,
  AfcScaleData,
} from './bands.js';

// ── Take-home ────────────────────────────────────
export {nhsTakeHome} from './take-home.js';

// ── Working week ──────────────────────────────
export {afcWeekInForce, afcWeeklyHours, hoursPerYear} from './working-week.js';
export {CONTRACT_FAMILIES, fteOf, standardWeek} from './contract-week.js';
export type {ContractFamily, ContractedWeek} from './contract-week.js';
export type {NhsTakeHomeOptions} from './take-home.js';

// ── Year labels ──────────────────────────────────
export {yearLabel} from './format.js';

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
} from '@casomoltd/paye-calc';
export type {
  Nation,
  TaxRegion,
  TaxYear,
  PayYear,
  YearLabel,
} from '@casomoltd/paye-calc';
