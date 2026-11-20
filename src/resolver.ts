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

import type {Nation, PayYear} from '@casomoltd/paye-calc';
import type {AfcBandId} from './afc-band.js';
import {onlyPointLabelled} from './scale-point.js';
import type {ScalePoint} from './scale-point.js';
import {
  afcBandPoints, afcPointOf, getAfcScales, latestAfcYear,
} from './scales.js';
import type {GradeFamily} from './scale-tables.js';
import type {Role} from './role.js';
import type {AfcRegionId} from './regions.js';
import {afcRegionToNation} from './regions.js';
import {grossSalary} from './hcas.js';
import type {MedicalGradeId} from './medical-grades.js';
import {MEDICAL_FAMILY} from './medical-scales.js';
import type {DentalGradeId} from './dental-grades.js';
import {DENTAL_FAMILY} from './dental-scales.js';
import {ScaleUnavailable} from './errors.js';
import {Post} from './post.js';
import type {PostIdentity} from './post.js';

/**
 * The two years a Post is built from, as {@link PostIdentity} names them:
 * the pay year whose scale a point was read from, and the tax year whose
 * deductions apply. Both are required, for the reason given there.
 */
export type ScaleYears = Pick<PostIdentity, 'payYear' | 'taxYear'>;

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

/** A medical or dental point the caller holds, and the Post it prices. */
export interface GradePointQuery<G extends string> extends PostIdentity {
  readonly grade: G;
  readonly point: ScalePoint;
}

/** A medical or dental point named by its label, and the Post it prices. */
export interface GradeLabelQuery<G extends string> extends PostIdentity {
  readonly grade: G;
  readonly pointLabel: string;
}

/**
 * The uniform contract every pay family satisfies: build a
 * Post from a salary, and enumerate what is published. The
 * scale-point entry is family-specific (grades and their
 * region model differ per family), so it is added by each
 * resolver's own interface, not this shared one.
 */
export interface PayScaleResolver<G extends string> {
  /** An off-scale Post at a salary, in a nation and both years. */
  fromSalary(salary: number, identity: PostIdentity): Post;
  /** Grades with a published scale for this nation/year. Throws
   *  {@link ScaleUnavailable} where the nation publishes none that year. */
  availableGrades(nation: Nation, year: PayYear): readonly G[];
  /** Latest PAY year a grade is published for a nation, or null. */
  latestYearFor(gradeId: G, nation: Nation): PayYear | null;
}

/**
 * AfC resolver — adds a band + point + region entry. AfC
 * take-home threads an {@link AfcRegionId} (nation + HCAS
 * zone collapsed), not a bare Nation, so its scale-point
 * path resolves the HCAS gross itself.
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

/** Medical (doctors) resolver — a grade + point + nation entry. */
export type MedicalResolver = NationScaleResolver<MedicalGradeId>;

/** Salaried dental resolver — a grade + point + nation entry. */
export type DentalResolver = NationScaleResolver<DentalGradeId>;

export const afcResolver: AfcResolver = {
  fromSalary: Post.offScale,

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

  // Every band is on every AfC year's ladder (`getAfcScales` maps the
  // whole band list), so a band's latest year is the nation's latest.
  latestYearFor: (_band, nation) => latestAfcYear(nation),
};

export const medicalResolver: MedicalResolver = makeNationScaleResolver(
  MEDICAL_FAMILY,
  (grade, point, nation) => ({kind: 'medical', grade, point, nation}),
);

export const dentalResolver: DentalResolver = makeNationScaleResolver(
  DENTAL_FAMILY,
  (grade, point, nation) => ({kind: 'dental', grade, point, nation}),
);

/**
 * Build a {@link NationScaleResolver} over a {@link GradeFamily} and its
 * {@link Role} stamp. Both the medical and dental resolvers are this
 * factory with a different family and role — the polymorphism the design
 * intends, with no per-family machinery.
 */
function makeNationScaleResolver<G extends string>(
  family: GradeFamily<G>,
  toRole: (grade: G, point: ScalePoint, nation: Nation) => Role,
): NationScaleResolver<G> {
  const fromPoint = (
    {grade, point, ...identity}: GradePointQuery<G>,
  ): Post => {
    const {nation, payYear} = identity;
    assertOnScale(family.pointsFor(grade, payYear, nation), point,
      () => new ScaleUnavailable(nation, payYear, grade, point.label));
    return Post.fromSalary(point.salary, identity, toRole(grade, point, nation));
  };
  return {
    fromSalary: Post.offScale,

    fromScalePoint({grade, pointLabel, ...identity}) {
      const {nation, payYear} = identity;
      const points = family.pointsFor(grade, payYear, nation);
      const point = onlyPointLabelled(points, pointLabel, grade,
        () => new ScaleUnavailable(nation, payYear, grade, pointLabel));
      return fromPoint({grade, point, ...identity});
    },

    fromPoint,

    availableGrades(nation, year) {
      return family.scalesFor(year, nation).map((m) => m.grade);
    },

    latestYearFor: (gradeId, nation) => family.latestYearOf(gradeId, nation),
  };
}

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
  points: readonly ScalePoint[],
  point: ScalePoint,
  unavailable: () => ScaleUnavailable,
): void {
  const onScale = points.some(
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
  // The point must be ON this band's published scale, or an England
  // point would build a Northern Ireland Post.
  assertOnScale(afcBandPoints(payYear, nation, band), point,
    () => new ScaleUnavailable(nation, payYear, band, point.label));
  const gross = grossSalary(point.salary, region, payYear);
  return Post.fromSalary(gross, {nation, payYear, taxYear}, {
    kind: 'afc',
    band,
    point,
    region,
  });
}
