/**
 * Merge layer — joins each AfC band id with its
 * year-specific salary points and the year's pension
 * tiers.
 *
 * Presentation copy (labels, slugs, role descriptions)
 * is a hub-site concern and lives there, not in this
 * domain library.
 */

import type {
  TaxYear, Nation,
} from '@casomoltd/paye-calc';
import {TAX_YEARS} from '@casomoltd/paye-calc';
import type {
  AfcBandId,
  ScalePoint,
  HcasZones,
} from './scales.js';
import {
  AFC_BAND_IDS,
  getScalesForYear,
} from './scales.js';
import type {PensionTier} from './pension.js';
import {getPensionTiers} from './pension.js';

// ── Merged scale data ───────────────────────────

export interface AfcBandMeta {
  band: AfcBandId;
  points: ScalePoint[];
  salaryMin: number;
  salaryMax: number;
}

export interface AfcScaleData {
  bands: AfcBandMeta[];
  hcas: HcasZones;
  pensionTiers: PensionTier[];
}

/** Current financial year for band pages. */
export const AFC_CURRENT_YEAR = TAX_YEARS.Y2026_27;

/** Previous financial year for comparison. */
export const AFC_PREVIOUS_YEAR = TAX_YEARS.Y2025_26;

/** Load AFC scale data — synchronous, no file I/O.
 *  Scotland has its own scale tables; Wales applies
 *  a living wage floor to the England/NI base.
 *  Omit `nation` for backward-compatible England
 *  figures. */
export function getAfcScales(
  year: TaxYear = AFC_CURRENT_YEAR,
  nation?: Nation,
): AfcScaleData {
  const scaleYear =
    getScalesForYear(year, nation);
  const pensionTiers = getPensionTiers(year);

  const bands = AFC_BAND_IDS.map((band) => {
    const points = scaleYear.scales[band];
    const salaries = points.map(
      (p) => p.salary,
    );
    return {
      band,
      points,
      salaryMin: Math.min(...salaries),
      salaryMax: Math.max(...salaries),
    };
  });

  return {
    bands,
    hcas: scaleYear.hcas,
    pensionTiers,
  };
}
