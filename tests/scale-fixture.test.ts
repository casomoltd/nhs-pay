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
import type {
  DocumentSource, Nation, PayYear, ScalePoint,
} from '../src/index.js';
import {
  HSC_TC8_05_2025,
  MD_W_01_2025,
  MD_W_01_2026,
  PC_MD_1_2026_R2,
  PCS_DD_2025_01,
  PCS_DD_2026_01,
  PCS_DD_2026_02,
  getDentalScales,
  getMedicalScales,
} from '../src/index.js';
import {PCS_DD_2025_01_ADDENDUM} from '../src/sources.js';
import {parseCsv} from './helpers.js';

/**
 * The fixture's `source` column as a human writes it, mapped to the
 * record the library should be carrying.
 *
 * A lookup rather than a string comparison against `source.reference`,
 * so the CSV keeps naming documents the way the PDFs do and the test
 * still asserts IDENTITY — the exact record, not a phrase that happens
 * to match. An unrecognised value throws rather than skipping: a typo
 * in the column would otherwise silently assert nothing.
 */
const FIXTURE_SOURCES: Record<string, DocumentSource> = {
  'PC(M&D) 1/2026 R2': PC_MD_1_2026_R2,
  'HSC(TC8) 05/2025': HSC_TC8_05_2025,
  'PCS(DD)2025/01': PCS_DD_2025_01,
  'PCS(DD)2025/01 addendum': PCS_DD_2025_01_ADDENDUM,
  'PCS(DD)2026/01': PCS_DD_2026_01,
  'PCS(DD)2026/02': PCS_DD_2026_02,
  'M&D(W) 01/2025': MD_W_01_2025,
  'M&D(W) 01/2026': MD_W_01_2026,
};

function expectedSource(reference: string): DocumentSource {
  const source = FIXTURE_SOURCES[reference];
  if (!source) {
    throw new Error(
      `scale-fixture: no DocumentSource registered for "${reference}" — `
      + 'add it to FIXTURE_SOURCES or fix the CSV',
    );
  }
  return source;
}

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
  taxYear: PayYear;
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
      taxYear: taxYear as PayYear,
      grade,
      group,
    };
  });
};

type Meta = {
  grade: string;
  points: readonly ScalePoint[];
  source: DocumentSource;
};

const families: ReadonlyArray<{
  file: string;
  resolve: (year: PayYear, nation: Nation) => Meta[];
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
        // Provenance is asserted, not merely carried. Every row in a
        // group names the same document, and the scale must carry that
        // one — which is what makes Scotland's split circulars a
        // checkable claim rather than a comment: its training grades
        // cite PCS(DD)2026/01 and its consultants PCS(DD)2026/02, in
        // the same nation and year.
        const references = [...new Set(group.map((r) => r.source))];
        expect(references).toHaveLength(1);
        expect(meta.source).toBe(expectedSource(references[0]));
      },
    );
  });
}
