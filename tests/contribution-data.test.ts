/**
 * Contribution & award data pinned to source-cited fixtures.
 *
 * These tables are transcribed from external primary sources (NHSBSA,
 * SPPA, HSC, NHS Employers / NHS Scotland circulars). A code-vs-code
 * assertion would only prove internal consistency; each figure is
 * instead asserted against a fixture that mirrors the published table
 * with its `source` URL per row, so a bad transcription fails here.
 */

import {describe, it, expect} from 'vitest';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {parse} from 'csv-parse/sync';
import type {Nation, TaxYear} from '../src/index.js';
import {
  afcAward,
  getEmployerPensionRate,
  getPensionTiers,
} from '../src/index.js';

type CsvRow = Record<string, string>;

function parseCsv(file: string): CsvRow[] {
  return parse(fs.readFileSync(file, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

// ─── Member pension tiers vs cited source ────────

describe('member pension tiers (vs cited fixture)', () => {
  const rows = parseCsv(
    path.join(FIXTURES, 'pension-tiers.csv'),
  );

  it.each(rows)(
    '$nation $year tier $tier === source',
    (row) => {
      const tiers = getPensionTiers(
        row.year as TaxYear,
        row.nation as Nation,
      );
      const tier = tiers.find(
        (t) => t.tier === Number(row.tier),
      );
      const expectedMax =
        row.max === '' ? Infinity : Number(row.max);
      expect(tier).toBeDefined();
      expect(tier?.min).toBe(Number(row.min));
      expect(tier?.max).toBe(expectedMax);
      expect(tier?.rate).toBe(Number(row.rate));
    },
  );

  it('Wales shares the NHSBSA (England) table', () => {
    for (const year of ['2025-26', '2026-27'] as TaxYear[]) {
      expect(getPensionTiers(year, 'wales')).toEqual(
        getPensionTiers(year, 'england'),
      );
    }
  });

  it('Scotland 2025-26 tiers fail loud (unsourced)', () => {
    // NI 2025-26 (HSC) is now sourced and covered above; SPPA
    // has published only 2026/27 tiers, so Scotland 2025-26 stays
    // fail-loud rather than borrowing another year's figures.
    expect(() =>
      getPensionTiers('2025-26', 'scotland'),
    ).toThrow();
  });
});

// ─── AfC pay awards vs cited source ──────────────

describe('AfC pay awards (vs cited fixture)', () => {
  const rows = parseCsv(
    path.join(FIXTURES, 'afc-awards.csv'),
  );

  it.each(rows)('$nation $year award === source', (row) => {
    expect(
      afcAward(row.year as TaxYear, row.nation as Nation),
    ).toBe(Number(row.pct));
  });
});

// ─── Employer contribution rates vs cited source ─

describe('employer pension rates (vs cited fixture)', () => {
  const rows = parseCsv(
    path.join(FIXTURES, 'employer-rates.csv'),
  );

  it.each(rows)('$nation employer rate === source', (row) => {
    const emp = getEmployerPensionRate(row.nation as Nation);
    expect(emp.rate).toBe(Number(row.rate));
    expect(emp.adminLevy).toBe(Number(row.adminLevy));
    expect(emp.administrator).toBe(row.administrator);
  });
});
