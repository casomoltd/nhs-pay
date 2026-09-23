/**
 * Shared fixture loading for the test suite. Every CSV
 * oracle lives in tests/fixtures/, so the loader takes
 * the fixture's basename — the one place the directory
 * resolution and csv-parse options are spelled out.
 */

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {parse} from 'csv-parse/sync';
import {getAfcScales} from '../src/index.js';
import type {SteppedPoint} from '../src/scale-point.js';

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

/** Parse a fixture CSV into header-keyed string rows */
export function parseCsv<Row = Record<string, string>>(
  fixture: string,
): Row[] {
  const raw = fs.readFileSync(
    path.join(FIXTURES, fixture), 'utf-8',
  );
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Row[];
  // An empty fixture is never legitimate here, and it is the one
  // failure that hides itself: `it.each([])` registers no cases and
  // the suite reports green. Fail at the read so no sweep has to
  // remember its own row-count guard.
  if (rows.length === 0) {
    throw new Error(
      `${fixture}: fixture has no rows — a sweep over it would `
      + 'silently assert nothing',
    );
  }
  return rows;
}

/** The invented member's pay ladder as its oracle states it: labels
 *  and salaries, the form an implementation that does not import this
 *  library can write. */
export interface OracleLadder {
  points: {label: string; salary: number}[];
  current: string;
}

/**
 * The oracle's ladder as the library's own published band, found by
 * matching every point. Failing to find one means the oracle priced a
 * ladder the library does not publish, and every figure built on it
 * would be checking the wrong pay.
 */
export function publishedLadder(
  oracle: OracleLadder,
  year: Parameters<typeof getAfcScales>[0],
  nation: Parameters<typeof getAfcScales>[1],
): {points: readonly SteppedPoint[]; current: SteppedPoint} {
  const band = getAfcScales(year, nation).bands.find((b) =>
    b.points.length === oracle.points.length
    && b.points.every((p, i) =>
      p.label === oracle.points[i].label
      && p.salary === oracle.points[i].salary));
  const current = band?.points.find((p) => p.label === oracle.current);
  if (band === undefined || current === undefined) {
    throw new Error(
      `no ${nation} ${year} band matches the oracle's ladder`,
    );
  }
  return {points: band.points, current};
}
