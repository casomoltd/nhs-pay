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
