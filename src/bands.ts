/**
 * Merge layer — joins each AfC band id with its
 * year-specific salary points, salary range and source.
 * Pension tiers are a separate read (`getPensionTiers`).
 *
 * Presentation copy (labels, slugs, role descriptions)
 * is a consumer's concern and lives there, not in this
 * domain library.
 */

import type {
  PayYear, Nation,
} from '@casomoltd/paye-calc';
import {NATION_KEYS} from '@casomoltd/paye-calc';
import {AFC_BAND_IDS} from './afc-band.js';
import type {AfcBandId} from './afc-band.js';
import type {PayLadder, SteppedPoint} from './scale-point.js';
import {getScalesForYear, latestAfcYear, previousAfcYear} from './scales.js';
import type {DocumentSource} from './document-source.js';
import {AmbiguousScalePoint, ScaleUnavailable} from './errors.js';
import type {SalaryRange} from './values.js';

// ── Merged scale data ───────────────────────────

export interface AfcBandMeta {
  band: AfcBandId;
  points: SteppedPoint[];
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
}

/**
 * England's latest AfC PAY year.
 *
 * Read from England's scale table, so it moves when a round is
 * transcribed rather than by hand. Typed as a `PayYear`: an unbranded
 * literal assigns to `TaxYear` and `PayYear` alike, and would pass into a
 * tax-year parameter silently.
 *
 * NOT a site-wide "current year": Northern Ireland is a round behind.
 * A consumer resolving figures for a reader's nation wants
 * `latestAfcYear(nation)`; a consumer applying deductions wants
 * `CURRENT_TAX_YEAR` from paye-calc.
 */
export const AFC_CURRENT_YEAR: PayYear = latestAfcYear(NATION_KEYS.england);

/** The previous AfC pay year, for a year-on-year comparison: the one
 *  before {@link AFC_CURRENT_YEAR} in England's table. */
export const AFC_PREVIOUS_YEAR: PayYear = previousAfcYear(NATION_KEYS.england);

/** Load AFC scale data — synchronous, no file I/O.
 *  Every nation's ladder is transcribed from its own instrument,
 *  Northern Ireland's included though its figures match England's, so
 *  no nation's scale is computed from another's. `year` and `nation`
 *  are both required — the accessor never defaults a locale, since a
 *  forgotten `nation` would silently return England figures for every
 *  region (the exact bug this signature prevents). */
export function getAfcScales(
  year: PayYear,
  nation: Nation,
): AfcScaleData {
  const scaleYear = getScalesForYear(year, nation);
  const {source} = scaleYear;

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

  return {bands};
}

/**
 * The point labelled `label` on an AfC band, with the band's points, for
 * a pay year and nation, read from {@link getAfcScales}. Throws
 * `ScaleUnavailable` where the year and nation publish no scale or the
 * band has no such point, and `AmbiguousScalePoint` where the label names
 * more than one, so a caller never prices a point it did not ask for.
 */
export function afcPointOf(
  year: PayYear,
  nation: Nation,
  band: AfcBandId,
  label: string,
): PayLadder {
  const found = getAfcScales(year, nation).bands.find((b) => b.band === band);
  const matches = found?.points.filter((p) => p.label === label) ?? [];
  const current = matches.at(0);
  if (found === undefined || current === undefined) {
    throw new ScaleUnavailable(nation, year, band, label);
  }
  if (matches.length > 1) {
    throw new AmbiguousScalePoint(band, label, matches.length);
  }
  return {points: found.points, current};
}
