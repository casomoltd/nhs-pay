/**
 * End-to-end regression tests using artefact-derived
 * golden values. Covers scales, pension tiers, regions,
 * take-home, and the merge layer in one pass.
 */

import {describe, it, expect} from 'vitest';
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
  getPensionTiers,
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

// ─── Annual-allowance taper (VSM golden values) ──

// nhsTakeHome wires the DB pension input (16 × accrual) into
// TakeHomePay so the tapered annual allowance bites for
// high-earning scheme members. Salaries are real VSM pay
// points from the SSRB report (see the `source` column); the
// member rate is derived from nhs-pay's own tier table, never
// hardcoded. The mid-taper case is cross-checked against
// HMRC's PAAC tool (paye-calc docs/verification.md).
const aaCases = parseCsv(
  path.join(FIXTURES, 'aa-taper-vsm.csv'),
);

describe(
  'regression: annual-allowance taper',
  () => {
    it.each(aaCases)('$label', (tc) => {
      const salary = Number(tc.salary);
      const taxYear = tc.taxYear as TaxYear;
      const expectedAvailable =
        Number(tc.expectedAvailableAa);

      const rate = pensionTierRate(
        salary,
        getPensionTiers(taxYear, 'england'),
      );
      const thp = nhsTakeHome(
        salary,
        rate / 100,
        taxYear,
      );

      const checks: [string, number, number][] = [
        [
          'tierRate',
          rate,
          Number(tc.expectedTierRate),
        ],
        [
          'availableAnnualAllowance',
          thp.availableAnnualAllowance,
          expectedAvailable,
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

      // A tapered allowance must leave an excess; a full
      // allowance must not — checks the wiring drives the
      // charge, not just the headline figure.
      const tapered = expectedAvailable < 60000;
      if (tapered && thp.annualAllowanceExcess <= 0) {
        failures.push(
          'annualAllowanceExcess: expected > 0,'
          + ` got ${thp.annualAllowanceExcess}`,
        );
      }
      if (!tapered && thp.annualAllowanceExcess !== 0) {
        failures.push(
          'annualAllowanceExcess: expected 0,'
          + ` got ${thp.annualAllowanceExcess}`,
        );
      }

      if (failures.length > 0) {
        throw new Error(
          `${tc.label}:\n  `
          + `${failures.join('\n  ')}`,
        );
      }
    });

    it('no DB input or charge when opted out', () => {
      // pensionRate 0 skips the DB accrual wiring, so there
      // is no pension saving and no AA charge — even though
      // the high salary still tapers the (unused) allowance.
      const thp = nhsTakeHome(279163, 0, '2025-26');
      expect(thp.pensionInput).toBe(0);
      expect(thp.annualAllowanceExcess).toBe(0);
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

      // Verify pension tier lookup (nation-aware)
      const lookupRate = pensionTierRate(
        gross, getPensionTiers(taxYear, nation),
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
