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
import type {ScalePoint} from './scale-point.js';
import {afcTaxYears} from './scales.js';
import type {GradeMeta} from './scale-tables.js';
import type {Role} from './role.js';
import type {AfcRegionId} from './regions.js';
import {afcRegionToNation} from './regions.js';
import {getAfcScales} from './bands.js';
import {grossSalary} from './hcas.js';
import type {MedicalGradeId} from './medical-scales.js';
import {getMedicalScales, MEDICAL_TAX_YEARS} from './medical-scales.js';
import type {DentalGradeId} from './dental-scales.js';
import {getDentalScales, DENTAL_TAX_YEARS} from './dental-scales.js';
import {AmbiguousScalePoint, ScaleUnavailable} from './errors.js';
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
  /**
   * Build a Post from a point the caller already holds — the precise
   * accessor, as on {@link NationScaleResolver}.
   *
   * AfC labels are all distinct today, so `fromScalePoint` resolves
   * unambiguously across every nation and year. That is a property of
   * the current data, not a guarantee: Band 2 already carries two
   * points at one salary in all four nations, which is the shape one
   * relabelling away from a repeat. A caller holding the point should
   * not depend on the property.
   */
  fromPoint(
    band: AfcBandId,
    point: ScalePoint,
    region: AfcRegionId,
    year: TaxYear,
    /**
     * The year whose tax, NI and pension tiers apply, where that is
     * not the salary's own year. Defaults to `year`.
     *
     * A nation whose pay round runs late pays last year's salary
     * under this year's deductions, and the contribution tier is set
     * by the scheme year, not by the round the salary came from.
     */
    taxYear?: TaxYear,
  ): Post;
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

  fromPoint(band, point, region, year, taxYear) {
    const nation = afcRegionToNation(region);
    const scales = getAfcScales(year, nation);
    // The point must be ON this band's published scale. Without it,
    // the accessor this round now prefers will happily build a
    // Northern Ireland Post from an England point — the exact
    // substitution the per-nation tables exist to prevent, and one
    // `fromScalePoint` ruled out by construction.
    // Matched by VALUE, not reference: a consumer may map the points
    // through its own view type before handing one back, and identity
    // would then reject a legitimate call.
    const meta = scales.bands.find((b) => b.band === band);
    const onScale = meta?.points.some(
      (p) => p.label === point.label && p.salary === point.salary,
    );
    if (!onScale) {
      throw new ScaleUnavailable(nation, year, band, point.label);
    }
    const gross = grossSalary(
      point.salary, region, scales.hcas,
    );
    return Post.fromSalary(gross, nation, year, {
      kind: 'afc',
      band,
      point,
      region,
    }, taxYear);
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
    const matches = meta.points.filter(
      (p) => p.label === pointLabel,
    );
    if (matches.length === 0) {
      throw new ScaleUnavailable(
        nation, year, band, pointLabel,
      );
    }
    // The same rule as the medical and dental resolvers. A domain rule
    // has to hold on every path, and this one landed on one of two.
    if (matches.length > 1) {
      throw new AmbiguousScalePoint(band, pointLabel, matches.length);
    }
    return this.fromPoint(band, matches[0], region, year);
  },

  availableGrades(nation, year) {
    return getAfcScales(year, nation).bands.map(
      (b) => b.band,
    );
  },

  latestYearFor(gradeId, nation) {
    // That nation's own published years, not England's: probing
    // England's list would call getAfcScales for a year this
    // nation has not published, which throws ScaleUnavailable —
    // breaking the "or null" contract for the exact case the
    // method exists to answer.
    for (const year of [...afcTaxYears(nation)].reverse()) {
      const published = getAfcScales(year, nation)
        .bands.some((b) => b.band === gradeId);
      if (published) {
        return year;
      }
    }
    return null;
  },
};

// Medical & dental scales carry basic pay by nation (no HCAS), so their
// scale-point entry threads a Nation, not an AfC region. Each family
// owns the list of years it publishes (MEDICAL/DENTAL_TAX_YEARS, derived
// from its own tables), which `latestYearFor` probes newest-first.

/**
 * Grade IDs published for a nation/year, or `[]` if the whole
 * combination is unpublished — a non-throwing probe for `latestYearFor`
 * (which walks years that may not all exist for a nation), distinct
 * from `availableGrades`, which fails loud like the AfC resolver.
 */
function publishedGrades<G extends string>(
  load: () => readonly {grade: G}[],
): readonly G[] {
  try {
    return load().map((m) => m.grade);
  } catch (e) {
    if (e instanceof ScaleUnavailable) {
      return [];
    }
    throw e;
  }
}

/**
 * A basic-pay-by-nation resolver (medical, dental) — like the AfC
 * resolver, but its scale-point entry threads a bare {@link Nation}
 * (no HCAS/region), and it stamps a family-specific {@link Role} via
 * the `toRole` builder its factory is given.
 */
export interface NationScaleResolver<G extends string>
  extends PayScaleResolver<G> {
  /**
   * Build a Post from a point the caller already holds.
   *
   * The precise accessor, and the one to prefer. A LABEL does not
   * identify a point on every scale — England's consultant scale
   * carries six points labelled "Threshold 3", differing only in
   * years of service — so a caller holding the point should hand it
   * over rather than round-trip through a string that may match
   * several and throw.
   */
  fromPoint(
    grade: G,
    point: ScalePoint,
    nation: Nation,
    year: TaxYear,
    /**
     * The year whose tax, NI and pension tiers apply, where that is
     * not the salary's own year. Defaults to `year`.
     *
     * A nation whose pay round runs late pays last year's salary
     * under this year's deductions, and the contribution tier is set
     * by the scheme year, not by the round the salary came from.
     */
    taxYear?: TaxYear,
  ): Post;
  fromScalePoint(
    grade: G,
    pointLabel: string,
    nation: Nation,
    year: TaxYear,
  ): Post;
}

/**
 * Build a {@link NationScaleResolver} over a family's `getScales`
 * accessor and its {@link Role} stamp. Both the medical and dental
 * resolvers are this factory with different data and role — the
 * polymorphism the design intends, with no per-family machinery.
 */
function makeNationScaleResolver<G extends string>(
  getScales: (year: TaxYear, nation: Nation) => readonly GradeMeta<G>[],
  toRole: (grade: G, point: ScalePoint, nation: Nation) => Role,
  years: readonly TaxYear[],
): NationScaleResolver<G> {
  return {
    fromSalary(salary, nation, year) {
      return Post.fromSalary(salary, nation, year);
    },

    fromScalePoint(grade, pointLabel, nation, year) {
      const meta = getScales(year, nation).find(
        (m) => m.grade === grade,
      );
      if (!meta) {
        throw new ScaleUnavailable(nation, year, grade);
      }
      const matches = meta.points.filter(
        (p) => p.label === pointLabel,
      );
      if (matches.length === 0) {
        throw new ScaleUnavailable(
          nation, year, grade, pointLabel,
        );
      }
      // Loud, not first-match. Where a label names several points the
      // caller has asked a question the data cannot answer, and the
      // salaries happening to agree today is not a reason to guess.
      if (matches.length > 1) {
        throw new AmbiguousScalePoint(grade, pointLabel, matches.length);
      }
      return Post.fromSalary(
        matches[0].salary, nation, year,
        toRole(grade, matches[0], nation),
      );
    },

    fromPoint(grade, point, nation, year, taxYear) {
      // The point must belong to the scale it is being resolved
      // against. `fromPoint` takes a point the caller is already
      // holding, so nothing else checks that it came from THIS
      // grade, nation and year — and a consumer that renders one
      // nation's table and resolves against another gets a Post
      // built from a salary that nation does not pay.
      //
      // By VALUE, not identity: a consumer may map points through
      // its own view type before handing one back.
      const meta = getScales(year, nation)
        .find((m) => m.grade === grade);
      const onScale = meta?.points.some(
        (p) => p.label === point.label && p.salary === point.salary,
      );
      if (!onScale) {
        throw new ScaleUnavailable(
          nation, year, grade, point.label,
        );
      }
      return Post.fromSalary(
        point.salary, nation, year,
        toRole(grade, point, nation), taxYear,
      );
    },

    availableGrades(nation, year) {
      return getScales(year, nation).map((m) => m.grade);
    },

    latestYearFor(gradeId, nation) {
      for (const year of years) {
        const published = publishedGrades(() =>
          getScales(year, nation),
        ).includes(gradeId);
        if (published) {
          return year;
        }
      }
      return null;
    },
  };
}

/** Medical (doctors) resolver — a grade + point + nation entry. */
export type MedicalResolver = NationScaleResolver<MedicalGradeId>;

/** Salaried dental resolver — a grade + point + nation entry. */
export type DentalResolver = NationScaleResolver<DentalGradeId>;

export const medicalResolver: MedicalResolver = makeNationScaleResolver(
  getMedicalScales,
  (grade, point, nation) => ({kind: 'medical', grade, point, nation}),
  MEDICAL_TAX_YEARS,
);

export const dentalResolver: DentalResolver = makeNationScaleResolver(
  getDentalScales,
  (grade, point, nation) => ({kind: 'dental', grade, point, nation}),
  DENTAL_TAX_YEARS,
);
