/**
 * Shared machinery for the non-AfC pay families (medical, dental).
 *
 * The canonical domain shape: a family's scales key on
 * `(grade, nation, year)` and resolve to `ScalePoint[]`, uniform with
 * AfC. Verbatim transcription lives in `circulars/*`; the per-family
 * selection + mapping lives in the translation layers
 * (`medical-scales.ts`, `dental-scales.ts`). This module owns only the
 * canonical container, the grouping accessor, and the translators
 * generic enough to be shared across both families.
 */

import type {
  Nation, PayYear, YearLabel,
} from '@casomoltd/paye-calc';
import type {DocumentSource} from './document-source.js';
import type {ScalePoint} from './scale-point.js';
import type {SalaryRange} from './values.js';
import {ScaleUnavailable} from './errors.js';

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
 * win in silence — the same first-match-by-accident this module's
 * callers were rewritten to stop doing.
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

/**
 * Group a nation/year's grades into metas, in `gradeIds` order. `year`
 * and `nation` are both required; an absent combination throws
 * {@link ScaleUnavailable} rather than defaulting to another nation's
 * or year's figures.
 */
export function resolveGradeMetas<G extends string>(
  tables: GradeScaleTables<G>,
  gradeIds: readonly G[],
  year: PayYear,
  nation: Nation,
): GradeMeta<G>[] {
  // The table keys on the label; the signature carries the basis.
  const key: YearLabel = year;
  const grades = tables[key]?.[nation];
  const metas = grades
    ? gradeIds.flatMap((grade) => {
        const scale = grades[grade];
        if (!scale) {
          return [];
        }
        const salaries = scale.points.map((p) => p.salary);
        return [
          {
            grade,
            points: scale.points,
            salary: {
              min: Math.min(...salaries),
              max: Math.max(...salaries),
            },
            source: scale.source,
          },
        ];
      })
    : [];
  if (metas.length === 0) {
    throw new ScaleUnavailable(nation, year);
  }
  return metas;
}

// ── Shared translators ──────────────────────────
// Small pure maps from a circular's verbatim rows to canonical points.
// The per-family selection (which scale feeds which grade) lives in the
// `*-scales.ts` translation layers; these translators are the pieces
// generic enough to be shared by both.

/**
 * An incremental scale with no distinct labels beyond position: the
 * first point is "Minimum", the rest "Point 1", "Point 2", … (the
 * devolved training grades). Input is the salary column, top to bottom.
 */
export const stepped = (
  salaries: readonly number[],
): readonly ScalePoint[] =>
  salaries.map((salary, i) => ({
    label: i === 0 ? 'Minimum' : `Point ${i}`,
    salary,
  }));

/** A two-point salary range (salaried GP), min then max. */
export const range = (r: SalaryRange): readonly ScalePoint[] => [
  {label: 'Range minimum', salary: r.min},
  {label: 'Range maximum', salary: r.max},
];

/** Plain "Point 1", "Point 2"… labelling (1-based). */
export const numbered = (
  salaries: readonly number[],
): readonly ScalePoint[] =>
  salaries.map((salary, i) => ({label: `Point ${i + 1}`, salary}));

/**
 * One point per row, labelled by the row's `stage` (training grades).
 * Carries the row's `nodalPoint` onto the point where the source lists one
 * (the 2016-contract resident scales); rows without it stay stage-only.
 */
export const byStage = (
  rows: readonly {stage: string; salary: number; nodalPoint?: string}[],
): readonly ScalePoint[] =>
  rows.map((r) => ({
    label: r.stage,
    salary: r.salary,
    ...(r.nodalPoint !== undefined ? {nodalPoint: r.nodalPoint} : {}),
  }));

/**
 * One point per row, labelled by the row's pay-scale `code`. Carries
 * whichever axis the source lists beside the code, because the code
 * alone is opaque: `yearsExperience` for the SAS scales, `nodalPoint`
 * for locally employed doctors, whose codes England publishes against
 * the 2016-contract points and NOT in code order. Rows with neither
 * (GP educators, closed grades) stay code-only.
 */
export const byCode = (
  rows: readonly {
    code: string;
    salary: number;
    yearsExperience?: number;
    nodalPoint?: string;
  }[],
): readonly ScalePoint[] =>
  rows.map((r) => ({
    label: r.code,
    salary: r.salary,
    ...(r.yearsExperience !== undefined
      ? {yearsExperience: r.yearsExperience}
      : {}),
    ...(r.nodalPoint !== undefined
      ? {nodalPoint: r.nodalPoint}
      : {}),
  }));

/** One point per row, labelled "Band {band} Point {point}" (dental spine). */
export const bySpine = (
  rows: readonly {band: string | number; point: number; salary: number}[],
): readonly ScalePoint[] =>
  rows.map((r) => ({
    label: `Band ${r.band} Point ${r.point}`,
    salary: r.salary,
  }));

/**
 * The `salaries` of the named incremental scale in a circular's list.
 * Fails loud (at module load) on a mapping key that doesn't match a
 * source scale — a translation-layer typo can't ship silently.
 */
export const scaleSalaries = <T extends {salaries: readonly number[]}>(
  rows: readonly T[],
  match: (r: T) => boolean,
  key: string,
): readonly number[] => {
  const found = rows.find(match);
  if (!found) {
    throw new Error(`scale-tables: no source scale for "${key}"`);
  }
  return found.salaries;
};
