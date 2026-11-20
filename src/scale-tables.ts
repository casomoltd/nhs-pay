/**
 * Shared machinery for the non-AfC pay families (medical, dental).
 *
 * The canonical domain shape: a family's scales key on
 * `(grade, nation, year)` and resolve to `ScalePoint[]`, uniform with
 * AfC. Verbatim transcription lives in `circulars/*`; the per-family
 * selection + mapping lives in the translation layers
 * (`medical-scales.ts`, `dental-scales.ts`), with the row translators
 * they share in `scale-translators.ts`. This module owns the canonical
 * container and the family object every read goes through
 * ({@link gradeFamily}).
 */

import type {
  Nation, PayYear, YearLabel,
} from '@casomoltd/paye-calc';
import type {DocumentSource} from './document-source.js';
import type {ScalePoint} from './scale-point.js';
import type {SalaryRange} from './values.js';
import {salaryRangeOf} from './values.js';
import {ScaleUnavailable, invariant} from './errors.js';

/**
 * One grade's points together with the document that published them.
 *
 * The pair travels as one value because a nation-year is not enough to
 * identify the source: Scotland's 2026/27 round is split across
 * PCS(DD)2026/01 (training grades) and PCS(DD)2026/02 (everything
 * else), so two grades in the same bucket cite different circulars.
 */
export interface GradeScale {
  readonly points: readonly ScalePoint[];
  readonly source: DocumentSource;
}

/** A grade's canonical scale points in a nation/year, with its range
 *  and the document that publishes them. */
export interface GradeMeta<G extends string> {
  grade: G;
  points: readonly ScalePoint[];
  salary: SalaryRange;
  /** The circular these figures were transcribed from — carried so a
   *  consumer rendering a pay table cites the document that prints the
   *  salaries, never the instrument that announced the award. They are
   *  different documents in every nation. */
  source: DocumentSource;
}

/** Canonical basic-pay tables keyed year → nation → grade → scale. */
// Keyed by YearLabel: a lookup table keys on the label union, so a
// year nobody publishes is a compile error rather than a miss.
export type GradeScaleTables<G extends string> = Partial<
  Record<YearLabel, Partial<Record<Nation, Partial<Record<G, GradeScale>>>>>
>;

/**
 * One nation-based pay family (medical, dental): every read over its
 * tables, so the families share one implementation rather than two
 * copies that can drift.
 */
export interface GradeFamily<G extends string> {
  /** Pay years with a published table, newest first. */
  readonly years: readonly PayYear[];
  /** The grades published for a nation and year, in the family's grade
   *  order. Throws {@link ScaleUnavailable} where none is published,
   *  rather than defaulting to another nation's or year's figures. */
  scalesFor(year: PayYear, nation: Nation): GradeMeta<G>[];
  /** True where the nation and year publish `grade`: the non-throwing
   *  question a consumer asks before reading a year it is not sure of. */
  publishes(grade: G, year: PayYear, nation: Nation): boolean;
  /** The points of one grade's scale. Throws {@link ScaleUnavailable}
   *  where the nation and year do not publish it. */
  pointsFor(grade: G, year: PayYear, nation: Nation): readonly ScalePoint[];
  /** The newest year the family publishes any grade for a nation, or null
   *  where it publishes none. */
  latestYear(nation: Nation): PayYear | null;
  /** The newest year the family publishes `grade` for a nation, or null. */
  latestYearOf(grade: G, nation: Nation): PayYear | null;
  /** The newest document of the newest year the family publishes for a
   *  nation: by issue date among that year's grades, so a round split
   *  over two circulars cites the later one, and a nation behind cites
   *  its last year's. */
  latestSource(nation: Nation): DocumentSource;
  /** The document that publishes one grade's scale. Throws
   *  {@link ScaleUnavailable} where the nation and year publish a table
   *  but not this grade. */
  sourceFor(grade: G, year: PayYear, nation: Nation): DocumentSource;
}

/**
 * Bind every grade in a mapping to the document it was read from.
 *
 * Pass `G` explicitly at the call site. Left to inference it is read
 * from the literal it is handed, which makes every key valid and turns
 * a mistyped grade into a scale that silently vanishes from the table
 * rather than a compile error.
 *
 * Combine the results with {@link combineScales}, never a bare spread:
 * a duplicate key inside one object literal is a compile error, and the
 * same duplicate across two spreads is not.
 */
export function fromDocument<G extends string>(
  source: DocumentSource,
  points: {[K in G]?: readonly ScalePoint[]},
): Partial<Record<G, GradeScale>> {
  const out: Partial<Record<G, GradeScale>> = {};
  for (const [grade, pts] of Object.entries(points) as [
    G, readonly ScalePoint[],
  ][]) {
    out[grade] = {points: pts, source};
  }
  return out;
}

/**
 * Merge the parts of a nation-year whose grades come from more than one
 * document, refusing an overlap.
 *
 * A grade can have exactly one publishing circular in a nation and
 * year. Spreading two partial records instead would let the later one
 * win in silence, so the grade's figures would be whichever document was
 * listed last rather than the one that publishes them.
 */
export function combineScales<G extends string>(
  ...parts: Partial<Record<G, GradeScale>>[]
): Partial<Record<G, GradeScale>> {
  const out: Partial<Record<G, GradeScale>> = {};
  for (const part of parts) {
    for (const [grade, scale] of Object.entries(part) as [
      G, GradeScale,
    ][]) {
      if (out[grade]) {
        throw new Error(
          `scale-tables: grade "${grade}" is claimed by two documents `
          + 'in one nation and year — only one can have published it',
        );
      }
      out[grade] = scale;
    }
  }
  return out;
}

/** Build a {@link GradeFamily} over a family's tables, reading grades in
 *  `gradeIds` order. */
export function gradeFamily<G extends string>(
  tables: GradeScaleTables<G>,
  gradeIds: readonly G[],
): GradeFamily<G> {
  // The table keys on the label; each signature carries the basis.
  const gradesOf = (year: PayYear, nation: Nation) => {
    const key: YearLabel = year;
    return tables[key]?.[nation];
  };
  const metasOf = (year: PayYear, nation: Nation) =>
    gradeMetas(gradesOf(year, nation), gradeIds);
  const years = (Object.keys(tables) as PayYear[])
    .sort((a, b) => b.localeCompare(a));
  const publishes = (grade: G, year: PayYear, nation: Nation) =>
    gradesOf(year, nation)?.[grade] !== undefined;
  const holds = (year: PayYear, nation: Nation) =>
    metasOf(year, nation).length > 0;
  const latestYear = (nation: Nation) =>
    years.find((year) => holds(year, nation)) ?? null;
  const scaleOf = (grade: G, year: PayYear, nation: Nation) => {
    const scale = gradesOf(year, nation)?.[grade];
    if (scale === undefined) {
      throw new ScaleUnavailable(nation, year, grade);
    }
    return scale;
  };
  return {
    years,
    scalesFor(year, nation) {
      const metas = metasOf(year, nation);
      if (metas.length === 0) {
        throw new ScaleUnavailable(nation, year);
      }
      return metas;
    },
    publishes,
    pointsFor: (grade, year, nation) => scaleOf(grade, year, nation).points,
    latestYear,
    latestYearOf: (grade, nation) =>
      years.find((year) => publishes(grade, year, nation)) ?? null,
    sourceFor: (grade, year, nation) => scaleOf(grade, year, nation).source,
    latestSource(nation) {
      const year = latestYear(nation);
      // A plain error, not ScaleUnavailable: there is no year to name.
      invariant(year !== null, `gradeFamily: ${nation} publishes no scale`);
      // metasOf is never empty for a year latestYear found, so there is
      // always a first.
      const [first, ...rest] = metasOf(year, nation).map((m) => m.source);
      return rest.reduce((a, b) => (b.issued > a.issued ? b : a), first);
    },
  };
}

/** A nation-year's grades as metas, in `gradeIds` order, skipping a grade
 *  the nation-year does not publish. */
function gradeMetas<G extends string>(
  grades: Partial<Record<G, GradeScale>> | undefined,
  gradeIds: readonly G[],
): GradeMeta<G>[] {
  return gradeIds.flatMap((grade) => {
    const scale = grades?.[grade];
    return scale === undefined ? [] : [{
      grade,
      points: scale.points,
      salary: salaryRangeOf(scale.points),
      source: scale.source,
    }];
  });
}
