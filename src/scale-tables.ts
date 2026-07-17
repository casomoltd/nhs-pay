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

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import type {ScalePoint} from './scale-point.js';
import type {SalaryRange} from './values.js';
import {ScaleUnavailable} from './errors.js';

/** A grade's canonical scale points in a nation/year, with its range. */
export interface GradeMeta<G extends string> {
  grade: G;
  points: readonly ScalePoint[];
  salary: SalaryRange;
}

/** Canonical basic-pay tables keyed year → nation → grade → points. */
export type GradeScaleTables<G extends string> = Partial<
  Record<TaxYear, Partial<Record<Nation, Partial<Record<G, readonly ScalePoint[]>>>>>
>;

/**
 * Group a nation/year's grades into metas, in `gradeIds` order. `year`
 * and `nation` are both required; an absent combination throws
 * {@link ScaleUnavailable} rather than defaulting to another nation's
 * or year's figures.
 */
export function resolveGradeMetas<G extends string>(
  tables: GradeScaleTables<G>,
  gradeIds: readonly G[],
  year: TaxYear,
  nation: Nation,
): GradeMeta<G>[] {
  const grades = tables[year]?.[nation];
  const metas = grades
    ? gradeIds.flatMap((grade) => {
        const points = grades[grade];
        if (!points) {
          return [];
        }
        const salaries = points.map((p) => p.salary);
        return [
          {
            grade,
            points,
            salary: {
              min: Math.min(...salaries),
              max: Math.max(...salaries),
            },
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
  rows: readonly {stage: string; salary: number; nodalPoint?: number}[],
): readonly ScalePoint[] =>
  rows.map((r) => ({
    label: r.stage,
    salary: r.salary,
    ...(r.nodalPoint !== undefined ? {nodalPoint: r.nodalPoint} : {}),
  }));

/**
 * One point per row, labelled by the row's pay-scale `code`. Carries the
 * row's `yearsExperience` onto the point where the source lists one (the
 * SAS scales) — the code alone is opaque, so the year is the reader-facing
 * axis; rows without it (GP educators, closed grades) stay code-only.
 */
export const byCode = (
  rows: readonly {code: string; salary: number; yearsExperience?: number}[],
): readonly ScalePoint[] =>
  rows.map((r) => ({
    label: r.code,
    salary: r.salary,
    ...(r.yearsExperience !== undefined
      ? {yearsExperience: r.yearsExperience}
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
