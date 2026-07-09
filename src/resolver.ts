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
import {AFC_TAX_YEARS} from './scales.js';
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
      const point = meta.points.find(
        (p) => p.label === pointLabel,
      );
      if (!point) {
        throw new ScaleUnavailable(
          nation, year, grade, pointLabel,
        );
      }
      return Post.fromSalary(
        point.salary, nation, year, toRole(grade, point, nation),
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
