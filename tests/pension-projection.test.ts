/**
 * Tests for NHS 2015 pension projection module.
 *
 * Worked-example oracles live in a CSV fixture for visual
 * auditability (each row's source column names its oracle
 * layer): gad-worked-examples.csv.
 *
 * Factor values: GAD Consolidated Factor Spreadsheet
 * (2023-03 workbook), issued 30 June 2023 — tables
 * 0-420/0-421. Methodology: GAD 7 Aug 2019 guidance.
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
  maxLumpSum,
  projectPension,
  retirementFactor,
  revalue,
  yearlyAccrual,
} from '../src/pension-projection.js';
import type {
  PensionEstimationInput,
  PensionStatementInput,
} from '../src/pension-projection.js';
import {FactorTable} from '../src/gad/factor-table.js';
import {ERF_0_420} from '../src/gad/erf-2023-06-30.js';
import {LRF_0_421} from '../src/gad/lrf-2023-06-30.js';

// Fresh instances from the same verbatim data the module
// wires in — exercises the identical construction path.
const erf1 = new FactorTable(ERF_0_420);
const lrf1 = new FactorTable(LRF_0_421);

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

    const table = row.type === 'erf' ? erf1 : lrf1;
    const factor = table.factorFor({years, months, days: 0});

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
   * Expected factors pinned from Table 0-420.
   */
  it('3yr 8mo 14d → 3yr 9mo → 0.825', () => {
    const retirement = new Date(2026, 9, 1);
    const npd = new Date(2030, 5, 15);
    const result = retirementFactor(retirement, npd);
    expect(result.type).toBe('erf');
    expect(result.factor).toBe(0.825);
  });

  it('exact months (0 days) → no rounding → 0.815', () => {
    const npd = new Date(2030, 5, 15);
    const retirement = new Date(2026, 5, 15);
    const result = retirementFactor(retirement, npd);
    expect(result.type).toBe('erf');
    expect(result.factor).toBe(0.815);
  });

  it('month-end: retiring 31 Jan, NPA 1 Mar → 1mo 1d'
    + ' rounds up to 2mo → 0.991', () => {
    const retirement = new Date(2027, 0, 31);
    const npd = new Date(2027, 2, 1);
    const result = retirementFactor(retirement, npd);
    expect(result.type).toBe('erf');
    expect(result.factor).toBe(0.991);
  });

  it('12yr 11mo + days rounds up into the single-cell'
    + ' 13yr row → 0.559', () => {
    const npd = new Date(2040, 0, 20);
    const retirement = new Date(2027, 1, 1);
    const result = retirementFactor(retirement, npd);
    expect(result.type).toBe('erf');
    expect(result.factor).toBe(0.559);
  });

  it('beyond 13yr 0mo throws — the 2023 table prints'
    + ' no such cell', () => {
    const npd = new Date(2041, 0, 20);
    const retirement = new Date(2027, 1, 1);
    expect(() => retirementFactor(retirement, npd))
      .toThrow(/ERF1 out of range/);
  });
});

// ── LRF rounding — rounds DOWN to complete months ───

describe(
  'LRF rounding — rounds DOWN to complete months',
  () => {
    /**
     * GAD §3.4: When the period beyond NPA includes
     * part of a month, round DOWN to the last
     * complete month. Factors pinned from Table 0-421.
     */
    it('5yr 4mo 15d → 5yr 4mo → 1.269', () => {
      const npd = new Date(2025, 0, 1);
      const retirement = new Date(2030, 4, 16);
      const result = retirementFactor(retirement, npd);
      expect(result.type).toBe('lrf');
      expect(result.factor).toBe(1.269);
    });

    it('exact NPA date → factor 1, type none', () => {
      const npd = new Date(2030, 5, 15);
      const result = retirementFactor(npd, npd);
      expect(result.type).toBe('none');
      expect(result.factor).toBe(1);
    });

    it('10yr 0mo + days rounds down to the single-cell'
      + ' 10yr row → 1.646', () => {
      const npd = new Date(2025, 0, 1);
      const retirement = new Date(2035, 0, 20);
      const result = retirementFactor(retirement, npd);
      expect(result.type).toBe('lrf');
      expect(result.factor).toBe(1.646);
    });

    it('10yr 1mo throws — the 2023 table prints no'
      + ' such cell', () => {
      const npd = new Date(2025, 0, 1);
      const retirement = new Date(2035, 1, 1);
      expect(() => retirementFactor(retirement, npd))
        .toThrow(/LRF1 out of range/);
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
