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
  getScalesForYear,
} from './scales.js';
export type {
  AfcBandId,
  AfcScaleYear,
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

// ── HCAS ─────────────────────────────────────────
export {
  HCAS_ZONE_IDS,
  calculateHcasSupplement,
  isHcasZoneId,
} from './hcas.js';
export type {HcasZoneId} from './hcas.js';

// ── Regions ──────────────────────────────────────
export {
  AFC_REGIONS,
  afcRegionToNation,
  isAfcRegionId,
  isNation,
  legacyHcasToRegion,
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
} from '@casomoltd/paye-calc';
export type {
  Nation,
  TaxRegion,
  TaxYear,
} from '@casomoltd/paye-calc';
