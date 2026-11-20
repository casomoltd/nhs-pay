/**
 * The row translators the medical and dental translation layers share:
 * small pure maps from a circular's verbatim rows to canonical points,
 * and the row selectors that pick a scale out of a circular's list. The
 * per-family selection (which scale feeds which grade) lives in the
 * `*-scales.ts` translation layers; these are the pieces generic enough
 * to be shared by both.
 */

import type {ScalePoint} from './scale-point.js';
import type {SalaryRange} from './values.js';

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

/** One point per row, labelled by the row's printed grade (the GP
 *  educator and associate adviser posts). */
export const byGrade = (
  rows: readonly {readonly grade: string; readonly salary: number}[],
): readonly ScalePoint[] =>
  rows.map((r) => ({label: r.grade, salary: r.salary}));

/** One point per row, labelled "Point n" from the printed pay point, with
 *  its years of service (Northern Ireland's 2022 SAS scales). */
export const byPayPoint = (
  rows: readonly {
    readonly payPoint: number;
    readonly salary: number;
    readonly yearsExperience: number;
  }[],
): readonly ScalePoint[] =>
  rows.map((r) => ({
    label: `Point ${r.payPoint}`,
    salary: r.salary,
    yearsExperience: r.yearsExperience,
  }));

/**
 * A scale printed by scale point with years of service (the 2022 specialty
 * doctor and specialist contracts): point 0 is "Minimum", the rest
 * "Point n", and a point's years of experience are its number.
 */
export const byScalePoint = (
  rows: readonly {readonly scalePoint: number; readonly salary: number}[],
): readonly ScalePoint[] =>
  rows.map((r) => ({
    label: r.scalePoint === 0 ? 'Minimum' : `Point ${r.scalePoint}`,
    salary: r.salary,
    yearsExperience: r.scalePoint,
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
    throw new Error(`scale-translators: no source scale for "${key}"`);
  }
  return found.salaries;
};

/**
 * The salaries of the row a circular prints under pay-scale `code`, the
 * way the translation layer selects most rows. Throws where no row carries
 * it, which happens at module load, so a code the circular does not print
 * fails every test rather than serving an empty scale.
 */
export const salariesOfCode = <T extends {
  code: string;
  salaries: readonly number[];
}>(rows: readonly T[], code: string): readonly number[] =>
  scaleSalaries(rows, (r) => r.code === code, `code ${code}`);
