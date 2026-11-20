/**
 * Pay-scale resolvers — build a {@link Post} from a
 * published pay scale. The AfC resolver reads the
 * Agenda-for-Change tables; the medical and dental resolvers
 * read their own, all producing the same uniform Post.
 * Polymorphism lives here, not on the Post.
 *
 * Each resolver stamps the Post's {@link Role} identity from
 * the inputs it already holds (band / point / region), so the
 * Post knows which scale position it came from.
 */

import type {
  Nation, PayYear, TaxYear,
} from '@casomoltd/paye-calc';
import type {AfcBandId} from './afc-band.js';
import {onlyPointLabelled} from './scale-point.js';
import type {ScalePoint} from './scale-point.js';
import {afcPayYears, afcPointOf, getAfcScales} from './scales.js';
import type {GradeMeta} from './scale-tables.js';
import type {Role} from './role.js';
import type {AfcRegionId} from './regions.js';
import {afcRegionToNation} from './regions.js';
import {grossSalary} from './hcas.js';
import type {MedicalGradeId} from './medical-grades.js';
import {getMedicalScales, MEDICAL_PAY_YEARS} from './medical-scales.js';
import type {DentalGradeId} from './dental-grades.js';
import {getDentalScales, DENTAL_PAY_YEARS} from './dental-scales.js';
import {ScaleUnavailable} from './errors.js';
import {Post} from './post.js';

/**
 * The two years a Post is built from. A selector pair, so a query names
 * both rather than leaving one to be guessed.
 */
export interface ScaleYears {
  /** The pay year whose SCALE the point was read from. */
  readonly payYear: PayYear;
  /**
   * The year whose tax, NI and pension tiers apply.
   *
   * REQUIRED, and deliberately not defaulted to `payYear`. A nation whose
   * pay round runs late pays last year's salary under this year's
   * deductions, and the contribution tier is set by the scheme year, not
   * by the round the salary came from. Defaulting it gives every caller
   * that did not think about it the salary's own year, which prices a
   * Northern Irish reader's 2025-26 pay at 2025-26 deductions in the
   * 2026-27 tax year.
   */
  readonly taxYear: TaxYear;
}

/** An AfC point the caller holds, and where to price it. */
export interface AfcPointQuery extends ScaleYears {
  readonly band: AfcBandId;
  readonly point: ScalePoint;
  readonly region: AfcRegionId;
}

/** An AfC point named by its label, and where to price it. */
export interface AfcLabelQuery extends ScaleYears {
  readonly band: AfcBandId;
  readonly pointLabel: string;
  readonly region: AfcRegionId;
}

/** A medical or dental point the caller holds, and where to price it. */
export interface GradePointQuery<G extends string> extends ScaleYears {
  readonly grade: G;
  readonly point: ScalePoint;
  readonly nation: Nation;
}

/** A medical or dental point named by its label, and where to price it. */
export interface GradeLabelQuery<G extends string> extends ScaleYears {
  readonly grade: G;
  readonly pointLabel: string;
  readonly nation: Nation;
}

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
    year: PayYear,
    taxYear: TaxYear,
  ): Post;
  /** Grades with a published scale for this nation/year. */
  availableGrades(nation: Nation, year: PayYear): readonly G[];
  /** Latest PAY year a grade is published for a nation, or null. */
  latestYearFor(gradeId: G, nation: Nation): PayYear | null;
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
  fromPoint(query: AfcPointQuery): Post;
  fromScalePoint(query: AfcLabelQuery): Post;
}

export const afcResolver: AfcResolver = {
  fromSalary(salary, nation, year, taxYear) {
    return Post.fromSalary(salary, nation, year, taxYear);
  },

  fromPoint: afcFromPoint,

  fromScalePoint({band, pointLabel, region, payYear, taxYear}) {
    // `afcPointOf` owns the one-point-per-label rule for AfC.
    const nation = afcRegionToNation(region);
    const {current} = afcPointOf(payYear, nation, band, pointLabel);
    return afcFromPoint({band, point: current, region, payYear, taxYear});
  },

  availableGrades(nation, year) {
    return getAfcScales(year, nation).map(
      (b) => b.band,
    );
  },

  latestYearFor(gradeId, nation) {
    // That nation's own published years, not England's: probing
    // England's list would call getAfcScales for a year this
    // nation has not published, which throws ScaleUnavailable —
    // breaking the "or null" contract for the exact case the
    // method exists to answer.
    for (const year of [...afcPayYears(nation)].reverse()) {
      const published = getAfcScales(year, nation)
        .some((b) => b.band === gradeId);
      if (published) {
        return year;
      }
    }
    return null;
  },
};

// Medical & dental scales carry basic pay by nation (no HCAS), so their
// scale-point entry threads a Nation, not an AfC region. Each family
// owns the list of years it publishes (MEDICAL/DENTAL_PAY_YEARS, derived
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
  fromPoint(query: GradePointQuery<G>): Post;
  fromScalePoint(query: GradeLabelQuery<G>): Post;
}

/**
 * Build a {@link NationScaleResolver} over a family's `getScales`
 * accessor and its {@link Role} stamp. Both the medical and dental
 * resolvers are this factory with different data and role — the
 * polymorphism the design intends, with no per-family machinery.
 */
function makeNationScaleResolver<G extends string>(
  getScales: (year: PayYear, nation: Nation) => readonly GradeMeta<G>[],
  toRole: (grade: G, point: ScalePoint, nation: Nation) => Role,
  years: readonly PayYear[],
): NationScaleResolver<G> {
  const pointsOf = (grade: G, nation: Nation, year: PayYear) =>
    getScales(year, nation).find((m) => m.grade === grade)?.points;
  const fromPoint = (
    {grade, point, nation, payYear, taxYear}: GradePointQuery<G>,
  ): Post => {
    assertOnScale(pointsOf(grade, nation, payYear), point,
      () => new ScaleUnavailable(nation, payYear, grade, point.label));
    return Post.fromSalary(
      point.salary, nation, payYear, taxYear, toRole(grade, point, nation),
    );
  };
  return {
    fromSalary(salary, nation, year, taxYear) {
      return Post.fromSalary(salary, nation, year, taxYear);
    },

    fromScalePoint({grade, pointLabel, nation, payYear, taxYear}) {
      const points = pointsOf(grade, nation, payYear);
      if (!points) {
        throw new ScaleUnavailable(nation, payYear, grade);
      }
      const point = onlyPointLabelled(points, pointLabel, grade,
        () => new ScaleUnavailable(nation, payYear, grade, pointLabel));
      return fromPoint({grade, point, nation, payYear, taxYear});
    },

    fromPoint,

    availableGrades(nation, year) {
      return getScales(year, nation).map((m) => m.grade);
    },

    latestYearFor(gradeId, nation) {
      return years.find((year) =>
        publishedGrades(() => getScales(year, nation)).includes(gradeId),
      ) ?? null;
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
  MEDICAL_PAY_YEARS,
);

export const dentalResolver: DentalResolver = makeNationScaleResolver(
  getDentalScales,
  (grade, point, nation) => ({kind: 'dental', grade, point, nation}),
  DENTAL_PAY_YEARS,
);

/**
 * The point on a grade's published scale equal to `point`, or a throw.
 *
 * `fromPoint` takes a point the caller is already holding, so nothing
 * else checks it came from THIS grade, nation and year; without this, a
 * consumer that renders one nation's table and resolves against another
 * gets a Post built from a salary that nation does not pay. Matched by
 * VALUE, not identity: a consumer may map points through its own view
 * type before handing one back.
 */
function assertOnScale(
  points: readonly ScalePoint[] | undefined,
  point: ScalePoint,
  unavailable: () => ScaleUnavailable,
): void {
  const onScale = points?.some(
    (p) => p.label === point.label && p.salary === point.salary,
  );
  if (!onScale) {
    throw unavailable();
  }
}

/** Build a Post from an AfC point the caller holds, refusing a point that
 *  is not on the band's published scale. */
function afcFromPoint(
  {band, point, region, payYear, taxYear}: AfcPointQuery,
): Post {
  const nation = afcRegionToNation(region);
  const meta = getAfcScales(payYear, nation).find((b) => b.band === band);
  // The point must be ON this band's published scale, or an England
  // point would build a Northern Ireland Post.
  assertOnScale(meta?.points, point,
    () => new ScaleUnavailable(nation, payYear, band, point.label));
  const gross = grossSalary(point.salary, region, payYear);
  return Post.fromSalary(gross, nation, payYear, taxYear, {
    kind: 'afc',
    band,
    point,
    region,
  });
}
