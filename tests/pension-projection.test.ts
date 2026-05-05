/**
 * Tests for NHS 2015 pension projection module.
 *
 * GAD worked examples are stored in a CSV fixture for
 * visual auditability against the source document:
 *   gad-worked-examples.csv — GAD §4/§5 examples
 *
 * Source: GAD "NHSPS 2015 E&W — Early and late
 * retirement in normal health — Factors and guidance",
 * 7 August 2019
 */

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {parse} from 'csv-parse/sync';
import {describe, expect, it} from 'vitest';
import {
  ACCRUAL_RATE,
  COMMUTATION_FACTOR,
  commute,
  lookupErf1,
  lookupLrf1,
  maxLumpSum,
  npaDate,
  periodInYearsMonths,
  projectPension,
  retirementFactor,
  revalue,
  yearlyAccrual,
} from '../src/pension-projection.js';
import type {
  PensionEstimationInput,
  PensionStatementInput,
} from '../src/pension-projection.js';

// ── CSV loading (same pattern as regression.test.ts) ─

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
const FIXTURES = path.join(__dirname, 'fixtures');

const gadExamples = parseCsv(
  path.join(FIXTURES, 'gad-worked-examples.csv'),
);

// ── GAD worked examples ─────────────────────────────

describe('GAD worked examples', () => {
  it.each(gadExamples)('$label', (row) => {
    const pension = Number(row.pension);
    const years = Number(row.yearsEarlyOrLate);
    const months = Number(row.months);
    const expectedFactor = Number(row.factor);
    const expectedResult = Number(row.expectedResult);

    const factor = row.type === 'erf'
      ? lookupErf1(years, months)
      : lookupLrf1(years, months);

    expect(factor).toBe(expectedFactor);
    expect(pension * factor).toBeCloseTo(
      expectedResult, 2,
    );
  });
});

// ── ERF rounding — rounds UP to next month ──────────

describe('ERF rounding — rounds UP to next month', () => {
  /**
   * GAD §2.3: When the period to NPA includes part of
   * a month, round UP to the next complete month.
   */
  it('3yr 8mo 14d → 3yr 9mo → ERF1[3][9]', () => {
    const retirement = new Date(2026, 9, 1);
    const npd = new Date(2030, 5, 15);
    const result = retirementFactor(retirement, npd);
    expect(result.type).toBe('erf');
    expect(result.factor).toBe(lookupErf1(3, 9));
  });

  it('exact months (0 days) → no rounding', () => {
    const npd = new Date(2030, 5, 15);
    const retirement = new Date(2026, 5, 15);
    const result = retirementFactor(retirement, npd);
    expect(result.type).toBe('erf');
    expect(result.factor).toBe(lookupErf1(4, 0));
  });
});

// ── LRF rounding — rounds DOWN to complete months ───

describe(
  'LRF rounding — rounds DOWN to complete months',
  () => {
    /**
     * GAD §3.4: When the period beyond NPA includes
     * part of a month, round DOWN to the last
     * complete month.
     */
    it('5yr 4mo 15d → 5yr 4mo → LRF1[5][4]', () => {
      const npd = new Date(2025, 0, 1);
      const retirement = new Date(2030, 4, 16);
      const result = retirementFactor(retirement, npd);
      expect(result.type).toBe('lrf');
      expect(result.factor).toBe(lookupLrf1(5, 4));
    });

    it('exact NPA date → factor 1, type none', () => {
      const npd = new Date(2030, 5, 15);
      const result = retirementFactor(npd, npd);
      expect(result.type).toBe('none');
      expect(result.factor).toBe(1);
    });
  },
);

// ── yearlyAccrual ───────────────────────────────────

describe('yearlyAccrual', () => {
  it('£54,000 → £1,000.00', () => {
    expect(yearlyAccrual(54000)).toBeCloseTo(1000.00, 2);
  });

  it('£35,000 → £648.15 (to 2dp)', () => {
    expect(yearlyAccrual(35000)).toBeCloseTo(648.15, 2);
  });

  it('uses 1/54 accrual rate', () => {
    expect(ACCRUAL_RATE).toBeCloseTo(1 / 54, 10);
  });
});

// ── revaluation ─────────────────────────────────────

describe('revaluation', () => {
  it('in-service (CPI 2% + 1.5%): £1,000 × 1.035³', () => {
    const result = revalue(1000, 0.035, 3);
    expect(result).toBeCloseTo(
      1000 * Math.pow(1.035, 3), 2,
    );
  });

  it('deferred (CPI 2% only): £1,000 × 1.02³', () => {
    const result = revalue(1000, 0.02, 3);
    expect(result).toBeCloseTo(
      1000 * Math.pow(1.02, 3), 2,
    );
  });

  it('zero years → unchanged', () => {
    expect(revalue(5000, 0.03, 0)).toBe(5000);
  });

  it('single year → simple multiplication', () => {
    expect(revalue(1000, 0.025, 1))
      .toBeCloseTo(1025, 2);
  });
});

// ── commutation ─────────────────────────────────────

describe('commutation', () => {
  it('full commutation (fraction=1): max lump sum', () => {
    const result = commute(10000, 1);
    expect(result.lumpSum).toBeCloseTo(42857.14, 2);
    expect(result.pensionGivenUp)
      .toBeCloseTo(42857.14 / 12, 2);
    expect(result.residualPension)
      .toBeCloseTo(10000 - 42857.14 / 12, 2);
  });

  it('partial commutation (fraction=0.5): half', () => {
    const result = commute(10000, 0.5);
    expect(result.lumpSum)
      .toBeCloseTo(42857.14 / 2, 2);
  });

  it('no commutation (fraction=0): lump sum = 0', () => {
    const result = commute(10000, 0);
    expect(result.lumpSum).toBe(0);
    expect(result.residualPension).toBe(10000);
    expect(result.pensionGivenUp).toBe(0);
  });

  it('12:1 ratio preserved', () => {
    expect(COMMUTATION_FACTOR).toBe(12);
    const result = commute(5000, 1);
    expect(result.lumpSum / result.pensionGivenUp)
      .toBeCloseTo(12, 5);
  });
});

// ── maxLumpSum ──────────────────────────────────────

describe('maxLumpSum', () => {
  /**
   * Formula: (20 × pension) / (3 + 20/12)
   */
  it('£10,000 pension → £42,857.14 max lump', () => {
    const result = maxLumpSum(10000);
    const expected = (20 * 10000) / (3 + 20 / 12);
    expect(result).toBeCloseTo(expected, 2);
    expect(result).toBeCloseTo(42857.14, 2);
  });

  it('£0 pension → £0 max lump', () => {
    expect(maxLumpSum(0)).toBe(0);
  });
});

// ── periodInYearsMonths ─────────────────────────────

describe('periodInYearsMonths', () => {
  it('exact years', () => {
    const result = periodInYearsMonths(
      new Date(2020, 0, 1),
      new Date(2025, 0, 1),
    );
    expect(result).toEqual(
      {years: 5, months: 0, days: 0},
    );
  });

  it('years and months', () => {
    const result = periodInYearsMonths(
      new Date(2020, 0, 1),
      new Date(2023, 6, 1),
    );
    expect(result).toEqual(
      {years: 3, months: 6, days: 0},
    );
  });

  it('years, months and days', () => {
    const result = periodInYearsMonths(
      new Date(2020, 0, 15),
      new Date(2023, 6, 20),
    );
    expect(result).toEqual(
      {years: 3, months: 6, days: 5},
    );
  });
});

// ── npaDate ─────────────────────────────────────────

describe('npaDate', () => {
  it('adds NPA years to date of birth', () => {
    const dob = new Date(1990, 5, 15);
    const result = npaDate(dob, 67);
    expect(result.getFullYear()).toBe(2057);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(15);
  });

  it('handles NPA 65', () => {
    const dob = new Date(1955, 0, 1);
    const result = npaDate(dob, 65);
    expect(result.getFullYear()).toBe(2020);
  });
});

// ── projectPension — statement path ─────────────────

describe('projectPension — statement path', () => {
  const baseInput: PensionStatementInput = {
    kind: 'statement',
    accruedPension: 5000,
    currentSalary: 54000,
    dateOfBirth: new Date(1990, 0, 1),
    exitDate: new Date(2035, 0, 1),
    retirementDate: new Date(2057, 0, 1),
    npa: 67,
    assumedCpi: 0.02,
  };

  it('returns correct factor type for on-time', () => {
    const result = projectPension(baseInput);
    expect(result.factorType).toBe('none');
    expect(result.factor).toBe(1);
    expect(result.isEstimation).toBe(false);
  });

  it('early retirement shows reduction', () => {
    const earlyInput: PensionStatementInput = {
      ...baseInput,
      retirementDate: new Date(2053, 0, 1),
    };
    const result = projectPension(earlyInput);
    expect(result.factorType).toBe('erf');
    expect(result.factor).toBeLessThan(1);
    expect(result.annualPension)
      .toBeLessThan(result.revaluedAtRetirement);
  });

  it('curve has correct number of points', () => {
    const result = projectPension(baseInput);
    expect(result.curve.length).toBeGreaterThan(0);
    const ages = result.curve.map((p) => p.age);
    expect(Math.max(...ages))
      .toBeGreaterThanOrEqual(72);
  });

  it('nominal vs real values diverge over time', () => {
    const result = projectPension(baseInput);
    const lastPoint = result.curve[
      result.curve.length - 1
    ];
    expect(lastPoint.nominal)
      .toBeGreaterThan(lastPoint.real);
  });

  it('accrued points marked correctly', () => {
    const result = projectPension(baseInput);
    const accruedPoints = result.curve.filter(
      (p) => p.accrued,
    );
    const projectedPoints = result.curve.filter(
      (p) => !p.accrued,
    );
    expect(accruedPoints.length).toBeGreaterThan(0);
    expect(projectedPoints.length).toBeGreaterThan(0);
  });
});

// ── projectPension — estimation path ────────────────

describe('projectPension — estimation path', () => {
  const baseInput: PensionEstimationInput = {
    kind: 'estimation',
    joinDate: new Date(2015, 3, 1),
    currentSalary: 40000,
    dateOfBirth: new Date(1985, 5, 15),
    exitDate: new Date(2045, 5, 15),
    retirementDate: new Date(2052, 5, 15),
    npa: 67,
    assumedCpi: 0.02,
  };

  it('estimates accrual from join date', () => {
    const result = projectPension(baseInput);
    expect(result.accruedAtExit).toBeGreaterThan(0);
    expect(result.isEstimation).toBe(true);
  });

  it('carries estimation flag', () => {
    const result = projectPension(baseInput);
    expect(result.isEstimation).toBe(true);
  });

  it('produces positive pension values', () => {
    const result = projectPension(baseInput);
    expect(result.annualPension).toBeGreaterThan(0);
    expect(result.revaluedAtRetirement)
      .toBeGreaterThan(0);
  });

  it('curve contains expected age range', () => {
    const result = projectPension(baseInput);
    const ages = result.curve.map((p) => p.age);
    expect(Math.max(...ages))
      .toBeGreaterThanOrEqual(72);
  });
});
