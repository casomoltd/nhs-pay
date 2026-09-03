/**
 * Golden oracle: medical & dental scale points pinned to their pay
 * circulars. The fixtures are transcribed from the circular PDFs
 * (workspace sources), never from this repo's code — code-vs-source,
 * exactly like the AfC pay-scales.csv oracle — so a bad transcription
 * in src/circulars/* fails here instead of shipping.
 *
 * Rows match by position within a (nation, year, grade) group: the
 * group's ordered salary vector must equal the scale's, so a dropped,
 * extra, or reordered point fails even where salaries repeat. The
 * `table` column names the circular's own annex/table heading so a
 * human can filter the CSV against one printed table at a time.
 */

import {describe, it, expect} from 'vitest';
import type {Nation, ScalePoint, TaxYear} from '../src/index.js';
import {getDentalScales, getMedicalScales} from '../src/index.js';
import {parseCsv} from './helpers.js';

interface FixtureRow {
  nation: string;
  taxYear: string;
  grade: string;
  point: string;
  /** The circular's own nodal-point label, empty where the scale has
   *  no nodal axis. Read from the PDF, not from the code — but note it
   *  was promoted out of the `point` label rather than transcribed
   *  separately, so the two columns rest on ONE reading of the annex.
   *  A re-verification pass must re-read both; neither checks the
   *  other. */
  nodal_point: string;
  salary: string;
  table: string;
  source: string;
}

interface FixtureScale {
  nation: Nation;
  taxYear: TaxYear;
  grade: string;
  group: FixtureRow[];
}


/** Group fixture rows into per-grade scales, preserving row order. */
const groupScales = (rows: FixtureRow[]): FixtureScale[] => {
  const groups = new Map<string, FixtureRow[]>();
  for (const row of rows) {
    const key = `${row.nation}|${row.taxYear}|${row.grade}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }
  return [...groups.entries()].map(([key, group]) => {
    const [nation, taxYear, grade] = key.split('|');
    return {
      nation: nation as Nation,
      taxYear: taxYear as TaxYear,
      grade,
      group,
    };
  });
};

type Meta = {grade: string; points: readonly ScalePoint[]};

const families: ReadonlyArray<{
  file: string;
  resolve: (year: TaxYear, nation: Nation) => Meta[];
}> = [
  // NOTE: the `point` column is NOT the code's label. Both files use
  // it as a human-readable source reference — medical writes
  // "FY1 (nodal 1)", dental annotates the roles sharing a spine point
  // — so it documents the row and is not asserted. A mislabelled
  // point therefore still passes here; see scale-invariants.
  {file: 'medical-scales.csv', resolve: getMedicalScales},
  {file: 'dental-scales.csv', resolve: getDentalScales},
];

for (const {file, resolve} of families) {
  describe(`${file} matches the transcribed circulars`, () => {
    it.each(groupScales(parseCsv<FixtureRow>(file)))(
      '$nation $taxYear $grade',
      ({nation, taxYear, grade, group}) => {
        const meta = resolve(taxYear, nation).find(
          (m) => m.grade === grade,
        );
        if (!meta) {
          throw new Error(
            `${file}: grade "${grade}" not published for `
            + `${nation} ${taxYear}`,
          );
        }
        const got = meta.points.map((p) => p.salary);
        const want = group.map((r) => Number(r.salary));
        expect(got).toEqual(want);
        // Nodal labels, where the circular prints them. Per row,
        // because several stages share one nodal point (England's
        // CT1-CT4 and ST1-ST5 share four), so anything keyed by the
        // label alone checks only the last stage on each.
        expect(meta.points.map((p) => p.nodalPoint ?? '')).toEqual(
          group.map((r) => r.nodal_point),
        );
      },
    );
  });
}
