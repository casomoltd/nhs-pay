/**
 * Merge layer — joins each AfC band id with its
 * year-specific salary points and the year's pension
 * tiers.
 *
 * Presentation copy (labels, slugs, role descriptions)
 * is a consumer's concern and lives there, not in this
 * domain library.
 */

import type {
  TaxYear, Nation,
} from '@casomoltd/paye-calc';
import {TAX_YEARS} from '@casomoltd/paye-calc';
import type {
  AfcBandId,
  HcasZones,
} from './scales.js';
import type {ScalePoint} from './scale-point.js';
import {
  AFC_BAND_IDS,
  afcScaleSource,
  getScalesForYear,
} from './scales.js';
import type {DocumentSource} from './document-source.js';
import type {SalaryRange} from './values.js';

// ── Merged scale data ───────────────────────────

export interface AfcBandMeta {
  band: AfcBandId;
  points: ScalePoint[];
  salary: SalaryRange;
  /** The document that publishes these figures for this nation and
   *  year — the same value across a nation's bands, because one
   *  circular publishes the whole ladder. Carried per band anyway so a
   *  consumer reads a scale's source the same way whichever family it
   *  is rendering; medical and dental genuinely differ per grade. */
  source: DocumentSource;
}

// Pay scales only — pension tiers are a separate dataset with their
// own per-scheme availability (a nation can have a published scale
// for a year but no tier table), so they are fetched via
// getPensionTiers(year, nation), not bundled here.
export interface AfcScaleData {
  bands: AfcBandMeta[];
  hcas: HcasZones;
}

/** Current financial year for band pages. */
export const AFC_CURRENT_YEAR = TAX_YEARS.Y2026_27;

/** Previous financial year for comparison. */
export const AFC_PREVIOUS_YEAR = TAX_YEARS.Y2025_26;

/** Load AFC scale data — synchronous, no file I/O.
 *  Scotland and Wales each publish their own ladder; Northern
 *  Ireland adopts England's. Every figure is transcribed from the
 *  nation's own instrument, so no nation's scale is computed from
 *  another's. `year` and `nation` are both required — the accessor
 *  never defaults a locale, since a forgotten `nation` would
 *  silently return England figures for every region (the exact bug
 *  this signature prevents). */
export function getAfcScales(
  year: TaxYear,
  nation: Nation,
): AfcScaleData {
  const scaleYear = getScalesForYear(year, nation);
  const source = afcScaleSource(year, nation);

  const bands = AFC_BAND_IDS.map((band) => {
    const points = scaleYear.scales[band];
    const salaries = points.map(
      (p) => p.salary,
    );
    return {
      band,
      points,
      salary: {
        min: Math.min(...salaries),
        max: Math.max(...salaries),
      },
      source,
    };
  });

  return {
    bands,
    hcas: scaleYear.hcas,
  };
}
