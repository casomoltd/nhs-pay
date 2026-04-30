/**
 * NHS pension tier types, lookup functions, and
 * year-specific tier data.
 *
 * Source: nhsbsa.nhs.uk/nhs-pensions-contribution-rates
 */

import type {TaxYear} from '@casomoltd/paye-calc';
import {TAX_YEARS} from '@casomoltd/paye-calc';

export interface PensionTier {
  tier: number;
  min: number;
  /** Infinity for the top tier */
  max: number;
  rate: number;
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

/** Get pension tiers for a tax year. */
export function getPensionTiers(
  year: TaxYear,
): PensionTier[] {
  return (
    PENSION_TIERS[year] ?? PENSION_TIERS_2025_26
  );
}
