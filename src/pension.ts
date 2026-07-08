/**
 * NHS pension contributions: member tier types, the
 * `PensionTiers` lookup value object, the per-scheme member
 * tier tables (NHSBSA for England & Wales, SPPA for Scotland,
 * HSC for Northern Ireland), and the per-nation employer
 * contribution rates.
 *
 * Member-tier sources are cited per table below and pinned in
 * tests/fixtures/pension-tiers.csv; employer rates carry their
 * own `EmployerPensionRate.source` per nation.
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, TAX_YEARS} from '@casomoltd/paye-calc';
import type {SalaryRange} from './values.js';
import {PensionTiersUnavailable} from './errors.js';

export interface PensionTier extends SalaryRange {
  tier: number;
  rate: number;
}

/**
 * Employer pension contribution for one of the UK's three NHS
 * pension schemes, as fractions of pensionable pay.
 *
 * Unlike the member tiers, employer rates are set by periodic
 * scheme valuation rather than each tax year. All three current
 * rates took effect on 1 April 2024 (from the 2020 valuations)
 * and hold for 2025/26 and 2026/27; the 2024 valuations
 * determine the rates from 2027/28.
 */
export interface EmployerPensionRate {
  /** Employer contribution rate as a fraction of pensionable pay. */
  rate: number;
  /**
   * Separate administration levy charged on top of `rate`, as a
   * fraction of pensionable pay (0 where the scheme charges none).
   */
  adminLevy: number;
  /** Tax year (April start) the current rate took effect. */
  effectiveFrom: TaxYear;
  /** Scheme administrator. */
  administrator: string;
  /** Authoritative source URL for the figures. */
  source: string;
}

// England and Wales share the NHSBSA-administered scheme, so they
// share one rate; Scotland (SPPA) and NI (HSC) run their own.
const NHSBSA_EMPLOYER_RATE: EmployerPensionRate = {
  rate: 0.237,
  adminLevy: 0.0008,
  effectiveFrom: TAX_YEARS.Y2024_25,
  administrator: 'NHSBSA',
  source:
    'https://www.nhsbsa.nhs.uk/nhs-pension-scheme-employer-contribution-rates-202425',
};

const EMPLOYER_PENSION_RATES: Record<
  Nation,
  EmployerPensionRate
> = {
  england: NHSBSA_EMPLOYER_RATE,
  wales: NHSBSA_EMPLOYER_RATE,
  scotland: {
    rate: 0.225,
    adminLevy: 0,
    effectiveFrom: TAX_YEARS.Y2024_25,
    administrator: 'SPPA',
    source:
      'https://pensions.gov.scot/nhs/employers/employer-contributions',
  },
  'northern-ireland': {
    rate: 0.232,
    adminLevy: 0,
    effectiveFrom: TAX_YEARS.Y2024_25,
    administrator: 'HSC Pension Service',
    source:
      'https://www.health-ni.gov.uk/consultations/hsc-pension-scheme-employer-and-employee-contribution-rates',
  },
};

/** Employer pension contribution for a nation's NHS scheme. */
export function getEmployerPensionRate(
  nation: Nation,
): EmployerPensionRate {
  return EMPLOYER_PENSION_RATES[nation];
}

/**
 * A member's pension contribution tier table, owning the
 * salary → tier / rate lookup. Wrap a tax year's tiers
 * (see {@link getPensionTiersVO}) and query it directly,
 * rather than re-scanning the array at each call site.
 */
export class PensionTiers {
  constructor(
    private readonly tiers: readonly PensionTier[],
  ) {}

  /** Contribution rate (%) for a salary; 0 if unbanded. */
  rateFor(salary: number): number {
    const match = this.tierFor(salary);
    return match ? match.band.rate * 100 : 0;
  }

  /**
   * Matching tier (1-based) and band for a salary, or
   * null when no band contains it.
   */
  tierFor(
    salary: number,
  ): {tier: number; band: PensionTier} | null {
    for (const band of this.tiers) {
      if (salary <= band.max) {
        return {tier: band.tier, band};
      }
    }
    return null;
  }
}

/**
 * Pension contribution rate (%) for a salary.
 */
export function pensionTierRate(
  salary: number,
  tiers: PensionTier[],
): number {
  return new PensionTiers(tiers).rateFor(salary);
}

/**
 * Look up the matching pension tier for a salary.
 * Returns tier number (1-based) and the tier band,
 * or null if no tiers are provided.
 */
export function lookupPensionTier(
  salary: number,
  tiers: PensionTier[],
): {tier: number; band: PensionTier} | null {
  return new PensionTiers(tiers).tierFor(salary);
}

// ── Member contribution tiers by scheme + year ──
//
// Three schemes, not one table per nation: England & Wales share
// NHSBSA; Scotland is SPPA; Northern Ireland is HSC. They share the
// tiered-contribution idea but publish their own thresholds AND
// rates, so the same salary can land in a different tier — and a
// different rate — by nation. Each rate is a source-cited transcription
// pinned in tests/fixtures/pension-tiers.csv.

/** The three NHS pension schemes across the UK. */
const PENSION_SCHEMES = {
  nhsbsa: 'nhsbsa', // England & Wales
  sppa: 'sppa', // Scotland
  hsc: 'hsc', // Northern Ireland
} as const;
type PensionScheme =
  (typeof PENSION_SCHEMES)[keyof typeof PENSION_SCHEMES];

const NATION_TO_SCHEME: Record<Nation, PensionScheme> = {
  [NATION_KEYS.england]: PENSION_SCHEMES.nhsbsa,
  [NATION_KEYS.wales]: PENSION_SCHEMES.nhsbsa,
  [NATION_KEYS.scotland]: PENSION_SCHEMES.sppa,
  [NATION_KEYS.northernIreland]: PENSION_SCHEMES.hsc,
};

// NHSBSA (England & Wales). Sources (member contribution rates):
//   2025/26 https://www.nhsbsa.nhs.uk/nhs-pensions-contribution-rates-202526
//   2026/27 https://www.nhsbsa.nhs.uk/member-hub/cost-being-scheme
// Six tiers; rates unchanged year-on-year, thresholds re-based to the
// AfC award. Pinned in tests/fixtures/pension-tiers.csv.
const NHSBSA_2025_26: PensionTier[] = [
  {tier: 1, min: 0, max: 13259, rate: 0.052},
  {tier: 2, min: 13260, max: 27797, rate: 0.065},
  {tier: 3, min: 27798, max: 33868, rate: 0.083},
  {tier: 4, min: 33869, max: 50845, rate: 0.098},
  {tier: 5, min: 50846, max: 65190, rate: 0.107},
  {tier: 6, min: 65191, max: Infinity, rate: 0.125},
];

const NHSBSA_2026_27: PensionTier[] = [
  {tier: 1, min: 0, max: 13259, rate: 0.052},
  {tier: 2, min: 13260, max: 28854, rate: 0.065},
  {tier: 3, min: 28855, max: 35155, rate: 0.083},
  {tier: 4, min: 35156, max: 52778, rate: 0.098},
  {tier: 5, min: 52779, max: 67668, rate: 0.107},
  {tier: 6, min: 67669, max: Infinity, rate: 0.125},
];

// SPPA (Scotland), from 1 April 2026. Source: SPPA circular 2026/03
// (9 Mar 2026), Table 2 — bands in 2026/27 terms, applied to a
// member's current-year annualised pensionable pay:
// https://pensions.gov.scot/sites/default/files/2026-03/2026_03_-_NHS_Employee_contribution_tier_bandings_from_1_April_2026.pdf
// Nine tiers; rates differ from NHSBSA. No 2025/26 tier table sourced
// yet (fail loud).
const SPPA_2026_27: PensionTier[] = [
  {tier: 1, min: 0, max: 13330, rate: 0.057},
  {tier: 2, min: 13331, max: 28987, rate: 0.064},
  {tier: 3, min: 28988, max: 34302, rate: 0.07},
  {tier: 4, min: 34303, max: 43038, rate: 0.087},
  {tier: 5, min: 43039, max: 45134, rate: 0.098},
  {tier: 6, min: 45135, max: 54862, rate: 0.105},
  {tier: 7, min: 54863, max: 59369, rate: 0.112},
  {tier: 8, min: 59370, max: 83026, rate: 0.116},
  {tier: 9, min: 83027, max: Infinity, rate: 0.127},
];

// HSC (Northern Ireland). Source: HSC Pension Service member
// contribution rates:
// https://hscpensions.hscni.net/hsc-pension-scheme/hsc-pension-members-section/membership-contributions-pay/
// Six tiers; rates higher than NHSBSA in tiers 2-6. HSC sets its own
// thresholds AND rates — the 2025/26 bands differ from NHSBSA 2025/26.
const HSC_2025_26: PensionTier[] = [
  {tier: 1, min: 0, max: 13259, rate: 0.052},
  {tier: 2, min: 13260, max: 27288, rate: 0.067},
  {tier: 3, min: 27289, max: 33247, rate: 0.085},
  {tier: 4, min: 33248, max: 49913, rate: 0.1},
  {tier: 5, min: 49914, max: 63994, rate: 0.109},
  {tier: 6, min: 63995, max: Infinity, rate: 0.127},
];

const HSC_2026_27: PensionTier[] = [
  {tier: 1, min: 0, max: 13259, rate: 0.052},
  {tier: 2, min: 13260, max: 28854, rate: 0.067},
  {tier: 3, min: 28855, max: 35155, rate: 0.085},
  {tier: 4, min: 35156, max: 52778, rate: 0.1},
  {tier: 5, min: 52779, max: 67668, rate: 0.109},
  {tier: 6, min: 67669, max: Infinity, rate: 0.127},
];

const PENSION_TIERS_BY_SCHEME: Record<
  PensionScheme,
  Partial<Record<TaxYear, PensionTier[]>>
> = {
  [PENSION_SCHEMES.nhsbsa]: {
    [TAX_YEARS.Y2025_26]: NHSBSA_2025_26,
    [TAX_YEARS.Y2026_27]: NHSBSA_2026_27,
  },
  [PENSION_SCHEMES.sppa]: {
    [TAX_YEARS.Y2026_27]: SPPA_2026_27,
  },
  [PENSION_SCHEMES.hsc]: {
    [TAX_YEARS.Y2025_26]: HSC_2025_26,
    [TAX_YEARS.Y2026_27]: HSC_2026_27,
  },
};

/**
 * Member pension contribution tiers for a nation and tax year.
 *
 * The three schemes (NHSBSA for England & Wales, SPPA for Scotland,
 * HSC for Northern Ireland) publish independent tier tables — their
 * thresholds AND rates differ — so the nation is required; there is
 * no UK-wide default. Throws {@link PensionTiersUnavailable} for an
 * unpublished combination rather than substituting another scheme's
 * or year's figures.
 */
export function getPensionTiers(
  year: TaxYear,
  nation: Nation,
): PensionTier[] {
  const tiers =
    PENSION_TIERS_BY_SCHEME[NATION_TO_SCHEME[nation]][year];
  if (!tiers) {
    throw new PensionTiersUnavailable(year, nation);
  }
  return tiers;
}

/**
 * {@link PensionTiers} value object for a nation and tax year —
 * the same data as {@link getPensionTiers}, ready to query.
 */
export function getPensionTiersVO(
  year: TaxYear,
  nation: Nation,
): PensionTiers {
  return new PensionTiers(getPensionTiers(year, nation));
}
