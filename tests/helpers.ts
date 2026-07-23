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
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Row[];
}
