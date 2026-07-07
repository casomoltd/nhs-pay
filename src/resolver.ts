/**
 * Pay-scale resolvers — build a {@link Post} from a
 * published pay scale. The AfC resolver reads the
 * Agenda-for-Change tables; medical / dental resolvers
 * (Phase 2) will read their own, all producing the same
 * uniform Post. Polymorphism lives here, not on the Post.
 *
 * Each resolver stamps the Post's {@link Role} identity from
 * the inputs it already holds (band / point / region), so the
 * Post knows which scale position it came from.
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import type {AfcBandId} from './scales.js';
import {AFC_TAX_YEARS} from './scales.js';
import type {AfcRegionId} from './regions.js';
import {afcRegionToNation} from './regions.js';
import {getAfcScales} from './bands.js';
import {grossSalary} from './hcas.js';
import {ScaleUnavailable} from './errors.js';
import {Post} from './post.js';

/**
 * The uniform contract every pay family satisfies: build a
 * Post from a salary, and enumerate what is published. The
 * scale-point entry is family-specific (grades and their
 * region model differ per family), so it is added by each
 * resolver's own interface, not this shared one.
 */
export interface PayScaleResolver<G extends string> {
  fromSalary(
    salary: number,
    nation: Nation,
    year: TaxYear,
  ): Post;
  /** Grades with a published scale for this nation/year. */
  availableGrades(nation: Nation, year: TaxYear): readonly G[];
  /** Latest year a grade is published for a nation, or null. */
  latestYearFor(gradeId: G, nation: Nation): TaxYear | null;
}

/**
 * AfC resolver — adds a band + point + region entry. AfC
 * take-home threads an {@link AfcRegionId} (nation + HCAS
 * zone collapsed), not a bare Nation, so its scale-point
 * path resolves the HCAS / Wales-floor gross itself.
 */
export interface AfcResolver extends PayScaleResolver<AfcBandId> {
  fromScalePoint(
    band: AfcBandId,
    pointLabel: string,
    region: AfcRegionId,
    year: TaxYear,
  ): Post;
}

export const afcResolver: AfcResolver = {
  fromSalary(salary, nation, year) {
    return Post.fromSalary(salary, nation, year);
  },

  fromScalePoint(band, pointLabel, region, year) {
    const nation = afcRegionToNation(region);
    const scales = getAfcScales(year, nation);
    const meta = scales.bands.find(
      (b) => b.band === band,
    );
    if (!meta) {
      throw new ScaleUnavailable(nation, year, band);
    }
    const point = meta.points.find(
      (p) => p.label === pointLabel,
    );
    if (!point) {
      throw new ScaleUnavailable(
        nation, year, band, pointLabel,
      );
    }
    const gross = grossSalary(
      point.salary, region, scales.hcas, year,
    );
    return Post.fromSalary(gross, nation, year, {
      kind: 'afc',
      band,
      point,
      region,
    });
  },

  availableGrades(nation, year) {
    return getAfcScales(year, nation).bands.map(
      (b) => b.band,
    );
  },

  latestYearFor(gradeId, nation) {
    for (const year of [...AFC_TAX_YEARS].reverse()) {
      const published = getAfcScales(year, nation)
        .bands.some((b) => b.band === gradeId);
      if (published) {
        return year;
      }
    }
    return null;
  },
};
