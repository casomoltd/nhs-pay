/**
 * End-to-end regression tests using artefact-derived
 * golden values. Covers scales, pension tiers, regions,
 * take-home, and the merge layer in one pass.
 */

import {describe, it} from 'vitest';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {parse} from 'csv-parse/sync';
import type {TaxYear, TaxRegion} from '../src/index.js';
import {
  nhsTakeHome,
  getAfcScales,
  pensionTierRate,
} from '../src/index.js';

// ─── CSV parsing ─────────────────────────────────

type CsvRow = Record<string, string>;

function parseCsv(filePath: string): CsvRow[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
);
const FIXTURES = path.join(
  __dirname, 'fixtures',
);

// ─── NHS pension (employer basis) ────────────────

const nhsCases = parseCsv(
  path.join(
    FIXTURES,
    'nhs-pension-calculations.csv',
  ),
);

describe(
  'regression: NHS pension (employer)',
  () => {
    it.each(nhsCases)('$label', (tc) => {
      const rate = Number(tc.pensionPercent);
      const thp = nhsTakeHome(
        Number(tc.gross),
        rate / 100,
        tc.taxYear as TaxYear,
        tc.region as TaxRegion,
      );

      const checks: [string, number, number][] = [
        [
          'pension',
          thp.pensionDeduction,
          Number(tc.expectedPension),
        ],
        [
          'taxableGross',
          thp.taxableGross,
          Number(tc.expectedTaxableGross),
        ],
        [
          'incomeTax',
          thp.incomeTax,
          Number(tc.expectedIncomeTax),
        ],
        [
          'NI',
          thp.nationalInsurance,
          Number(tc.expectedNI),
        ],
        [
          'net',
          thp.net,
          Number(tc.expectedNet),
        ],
      ];

      const failures = checks
        .filter(
          ([, actual, expected]) =>
            Math.abs(actual - expected) >= 0.005,
        )
        .map(
          ([field, actual, expected]) =>
            `${field}: expected ${expected}`
            + `, got ${actual}`,
        );

      if (failures.length > 0) {
        throw new Error(
          `${tc.label}:\n  `
          + `${failures.join('\n  ')}`,
        );
      }
    });
  },
);

// ─── Band take-home (artefact golden values) ─────

const bandCases = parseCsv(
  path.join(FIXTURES, 'band-take-home.csv'),
);

describe(
  'regression: band take-home',
  () => {
    it.each(bandCases)('$label', (tc) => {
      const taxYear = tc.taxYear as TaxYear;
      // expectedGross is already FTE-adjusted
      const actualGross = Number(tc.expectedGross);
      const expectedRate =
        Number(tc.expectedPensionRate);

      // Verify pension tier lookup matches
      const scales = getAfcScales(taxYear);
      const lookupRate = pensionTierRate(
        actualGross,
        scales.pensionTiers,
      );
      const rateDiff = Math.abs(
        lookupRate - expectedRate,
      );
      if (rateDiff >= 0.05) {
        throw new Error(
          `${tc.label}: pension rate expected `
          + `${expectedRate}%, got ${lookupRate}%`,
        );
      }

      const thp = nhsTakeHome(
        actualGross,
        expectedRate / 100,
        taxYear,
      );

      const checks: [string, number, number][] = [
        [
          'pension',
          thp.pensionDeduction,
          Number(tc.expectedPension),
        ],
        [
          'incomeTax',
          thp.incomeTax,
          Number(tc.expectedTax),
        ],
        [
          'NI',
          thp.nationalInsurance,
          Number(tc.expectedNI),
        ],
        [
          'net',
          thp.net,
          Number(tc.expectedNet),
        ],
      ];

      // Artefact values are rounded to nearest £
      const failures = checks
        .filter(
          ([, actual, expected]) =>
            Math.abs(actual - expected) >= 1,
        )
        .map(
          ([field, actual, expected]) =>
            `${field}: expected ${expected}`
            + `, got ${actual}`,
        );

      if (failures.length > 0) {
        throw new Error(
          `${tc.label}:\n  `
          + `${failures.join('\n  ')}`,
        );
      }
    });
  },
);
