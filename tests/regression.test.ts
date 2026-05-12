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
import type {
  TaxYear, TaxRegion, Nation, HcasZoneId,
} from '../src/index.js';
import {
  nhsTakeHome,
  getAfcScales,
  pensionTierRate,
  nationToTaxRegion,
  calculateHcasSupplement,
  isHcasZoneId,
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
      const nation =
        (tc.nation || 'england') as Nation;
      const hcasZone = tc.hcasZone || '';
      const fte = Number(tc.fte);
      const expectedGross =
        Number(tc.expectedGross);
      const expectedRate =
        Number(tc.expectedPensionRate);

      // Look up salary from nation-aware scales
      const scales =
        getAfcScales(taxYear, nation);
      const band = scales.bands.find(
        (b) => b.band === tc.band,
      );
      if (!band) {
        throw new Error(
          `${tc.label}: band ${tc.band}`
          + ' not found',
        );
      }
      const pt = band.points.find(
        (p) => p.label === tc.point,
      );
      if (!pt) {
        throw new Error(
          `${tc.label}: point ${tc.point}`
          + ' not found',
        );
      }

      // Derive gross: base × FTE + HCAS
      let gross = Math.round(pt.salary * fte);
      if (isHcasZoneId(hcasZone)) {
        const ZONE_PROP: Record<
          HcasZoneId,
          keyof typeof scales.hcas
        > = {
          'inner-london': 'innerLondon',
          'outer-london': 'outerLondon',
          'fringe': 'fringe',
        };
        gross += calculateHcasSupplement(
          gross,
          scales.hcas[ZONE_PROP[hcasZone]],
        );
      }

      // Verify derived gross matches fixture
      if (gross !== expectedGross) {
        throw new Error(
          `${tc.label}: gross expected`
          + ` ${expectedGross}, got ${gross}`,
        );
      }

      // Verify pension tier lookup
      const lookupRate = pensionTierRate(
        gross, scales.pensionTiers,
      );
      const rateDiff = Math.abs(
        lookupRate - expectedRate,
      );
      if (rateDiff >= 0.05) {
        throw new Error(
          `${tc.label}: pension rate expected`
          + ` ${expectedRate}%,`
          + ` got ${lookupRate}%`,
        );
      }

      // Verify take-home components
      const taxRegion =
        nationToTaxRegion(nation);
      const thp = nhsTakeHome(
        gross,
        expectedRate / 100,
        taxYear,
        taxRegion,
      );

      const checks: [
        string, number, number,
      ][] = [
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
