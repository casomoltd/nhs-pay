/**
 * NHS pension tier types, lookup functions, and
 * year-specific tier data.
 *
 * Source: https://www.nhsbsa.nhs.uk/member-hub/member-hub-contribution-rates
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {TAX_YEARS} from '@casomoltd/paye-calc';

export interface PensionTier {
  tier: number;
  min: number;
  /** Infinity for the top tier */
  max: number;
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
 * Pension contribution rate (%) for a salary.
 */
export function pensionTierRate(
  salary: number,
  tiers: PensionTier[],
): number {
  for (const tier of tiers) {
    if (salary <= tier.max) {
      return tier.rate * 100;
    }
  }
  return 0;
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
  for (const t of tiers) {
    if (salary <= t.max) {
      return {tier: t.tier, band: t};
    }
  }
  return null;
}

// ── Tier data by tax year ───────────────────────

const PENSION_TIERS_2025_26: PensionTier[] = [
  {tier: 1, min: 0, max: 13259, rate: 0.052},
  {tier: 2, min: 13260, max: 27797, rate: 0.065},
  {tier: 3, min: 27798, max: 33868, rate: 0.083},
  {tier: 4, min: 33869, max: 50845, rate: 0.098},
  {tier: 5, min: 50846, max: 65190, rate: 0.107},
  {tier: 6, min: 65191, max: Infinity, rate: 0.125},
];

const PENSION_TIERS_2026_27: PensionTier[] = [
  {tier: 1, min: 0, max: 13259, rate: 0.052},
  {tier: 2, min: 13260, max: 28854, rate: 0.065},
  {tier: 3, min: 28855, max: 35155, rate: 0.083},
  {tier: 4, min: 35156, max: 52778, rate: 0.098},
  {tier: 5, min: 52779, max: 67668, rate: 0.107},
  {tier: 6, min: 67669, max: Infinity, rate: 0.125},
];

const PENSION_TIERS: Partial<
  Record<TaxYear, PensionTier[]>
> = {
  [TAX_YEARS.Y2025_26]: PENSION_TIERS_2025_26,
  [TAX_YEARS.Y2026_27]: PENSION_TIERS_2026_27,
};

/**
 * Get member pension contribution tiers for a tax year.
 *
 * These thresholds are England & Wales (NHSBSA), re-based to the
 * AfC pay award each year. Scotland (SPPA) and NI (HSC) share the
 * same six contribution *rates* but set their own pay-band
 * thresholds, which can place the same salary in a different
 * tier — do not treat these as UK-wide.
 */
export function getPensionTiers(
  year: TaxYear,
): PensionTier[] {
  return (
    PENSION_TIERS[year] ?? PENSION_TIERS_2025_26
  );
}
