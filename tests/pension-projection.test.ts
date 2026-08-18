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

import {describe, expect, it} from 'vitest';
import {
  ACCRUAL_RATE,
  COMMUTATION_FACTOR,
  commute,
  factorProvenance,
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
import {yearsBetween} from '../src/dates.js';
import {parseCsv} from './helpers.js';

// Fresh instances from the same verbatim data the module
// wires in — exercises the identical construction path.
const erf1 = new FactorTable(ERF_0_420);
const lrf1 = new FactorTable(LRF_0_421);

const gadExamples = parseCsv('gad-worked-examples.csv');

// ── Factor provenance ───────────────────────────────

describe('factorProvenance', () => {
  // Identity with the transcription's own record proves the
  // accessor reads the IN-FORCE table — swap the issue import
  // and this follows without edits.
  it('erf → the 0-420 issue record', () => {
    expect(factorProvenance('erf'))
      .toBe(ERF_0_420.provenance);
  });

  it('lrf → the 0-421 issue record', () => {
    expect(factorProvenance('lrf'))
      .toBe(LRF_0_421.provenance);
  });

  it('carries the citation facts a page renders', () => {
    const erf = factorProvenance('erf');
    expect(erf.tableRef).toBe('0-420');
    expect(erf.guidanceRef).toBe('ERF1');
    expect(erf.issued).toBe('2023-06-30');
    expect(factorProvenance('lrf').issued)
      .toBe('2023-06-30');
  });
});

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
    expect(result.annualPension.real)
      .toBeLessThan(result.revaluedAtRetirement.real);
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

  it('a dated statement accrues from ITS date, not today',
    () => {
      // The defect this closes: a member reading a statement
      // "updated to 31/03/2025" a year later was credited
      // with none of the year since.
      // 2022-03-31 to 2026-03-31 is 1461 days — exactly
      // four whole years, so no fractional tail.
      const today = new Date(2026, 2, 31);
      const statementDate = new Date(2022, 2, 31);
      const dated = projectPension(
        {...baseInput, statementDate}, today,
      );
      const undated = projectPension(baseInput, today);
      expect(dated.accruedAtExit.real)
        .toBeGreaterThan(undated.accruedAtExit.real);

      // And by the right amount. Two steps, both explicit:
      // the statement's CASH figure read into today's money,
      // then four years priced by the same rule as any other
      // — revalue the pot, then add the slice.
      //
      // The first step prices a PAST window, so it uses the
      // Treasury Order figures rather than the assumed rate:
      // the September CPIs behind the 2022, 2023, 2024 and
      // 2025 uplifts, quoted from their SIs rather than read
      // back out of the code.
      //
      // Four factors for four years, and nothing else. The
      // 2026 order applies on 6 April, six days after this
      // window closes, and the pot does not move in them —
      // revaluation is a step, so the 359 days since the 2025
      // uplift earn exactly nothing.
      const base = 5000 * 1.031 * 1.101 * 1.067 * 1.017;
      const slice = 54000 / 54;
      let expected = base;
      for (let i = 0; i < 4; i++) {
        expected = expected * 1.015 + slice;
      }
      const atToday = projectPension(
        {
          ...baseInput, statementDate,
          exitDate: today, retirementDate: today,
          dateOfBirth: new Date(1959, 2, 31),
        },
        today,
      );
      expect(atToday.accruedAtExit.real)
        .toBeCloseTo(expected, 6);
    });

  it('an undated statement is unchanged — the default is'
    + ' a no-op', () => {
    const today = new Date(2026, 2, 31);
    expect(
      projectPension(
        {...baseInput, statementDate: today}, today,
      ).accruedAtExit.real,
    ).toBeCloseTo(
      projectPension(baseInput, today).accruedAtExit.real,
      10,
    );
  });
});

// ── projectPension — fixed today (exact values) ─────

describe('projectPension — fixed today', () => {
  /**
   * With an injected `today` on the member's birthday,
   * curve pointDates (built via the same local-midnight
   * Date constructor) hit phase boundaries exactly, so
   * zero-arithmetic points admit exact toBe assertions
   * and mid-phase points a tight formula mirror.
   */
  const today = new Date(2025, 0, 1);
  const input: PensionStatementInput = {
    kind: 'statement',
    accruedPension: 5000,
    currentSalary: 54000,
    dateOfBirth: new Date(1990, 0, 1),
    exitDate: new Date(2035, 0, 1),
    retirementDate: new Date(2057, 0, 1),
    npa: 67,
    assumedCpi: 0.02,
  };

  function pointDateFor(age: number): Date {
    const dob = input.dateOfBirth;
    return new Date(
      dob.getFullYear() + age,
      dob.getMonth(),
      dob.getDate(),
    );
  }

  it('curve shape is deterministic: ages 35–73', () => {
    // endAge: 1990→2057 spans 24472 days = 67.0007
    // fractional years (17 leap days beat the .25/yr
    // average), so retirement+5 tips past npa+5=72 and
    // ceils to 73. Statement path: the accrual origin is
    // today, so the curve starts at the current age — an
    // ABS figure carries no join history to draw.
    const result = projectPension(input, today);
    const ages = result.curve.map((p) => p.age);
    expect(ages[0]).toBe(35);
    expect(ages[ages.length - 1]).toBe(73);
    expect(ages.length).toBe(39);
  });

  it('estimation curve starts at the JOIN age — the'
    + ' built-up history is on the curve', () => {
    const estimation: PensionEstimationInput = {
      kind: 'estimation',
      joinDate: new Date(2015, 3, 1),
      currentSalary: 54000,
      dateOfBirth: new Date(1990, 0, 1),
      exitDate: new Date(2035, 0, 1),
      retirementDate: new Date(2057, 0, 1),
      npa: 67,
      assumedCpi: 0.02,
    };
    const result = projectPension(estimation, today);
    const first = result.curve[0];
    // Joined 1 Apr 2015 aged 25.25 → floor 25; nothing
    // banked at the origin itself.
    expect(first.age).toBe(25);
    expect(first.nominal).toBe(0);
    expect(first.accrued).toBe(true);
    // History reads LOWER in cash than in today's money:
    // the pension built up in 2020 was fewer actual pounds
    // then than the same entitlement is worth now. The two
    // rulers meet at today and nowhere else.
    for (const p of result.curve) {
      if (p.age < 35 && p.real > 0) {
        expect(p.nominal).toBeLessThan(p.real);
      }
    }
  });

  it('point at today: exactly the statement pension,'
    + ' nominal and real', () => {
    const result = projectPension(input, today);
    const now = result.curve.find((p) => p.age === 35);
    expect(now?.nominal).toBe(5000);
    expect(now?.real).toBe(5000);
  });

  it('accrued flag flips exactly after today', () => {
    const result = projectPension(input, today);
    const flags = new Map(
      result.curve.map((p) => [p.age, p.accrued]),
    );
    expect(flags.get(35)).toBe(true);
    expect(flags.get(36)).toBe(false);
  });

  /**
   * A DRIFT check, not an oracle: `expected` below re-spells
   * simulateAccrual's own partial-year arithmetic, so the two
   * agree by construction and this can only catch one of them
   * changing. It earns its place by pinning the fractional-year
   * branch, which the closed-form oracle deliberately avoids.
   * Correctness of the model itself is checked in
   * `accrual — independent oracles`.
   *
   * The 1.5% is the scheme's in-service revaluation above CPI
   * (NHS 2015 Scheme design document, cited in the module
   * header), re-typed rather than imported so that changing the
   * library's constant fails here.
   */
  it('active-phase point mirrors the accrual formula', () => {
    const result = projectPension(input, today);
    const p = yearsBetween(today, pointDateFor(36));
    // In today's money the pot earns 1.5%: CPI is absent from
    // the accrual and buys only the cash reading.
    const expected = 5000 * (1 + 0.015 * p)
      + yearlyAccrual(54000) * p;
    const at36 = result.curve.find((x) => x.age === 36);
    expect(at36?.real).toBeCloseTo(expected, 8);
    expect(at36?.nominal).toBeCloseTo(
      expected * Math.pow(1.02, p), 8,
    );
  });

  it('deferred-phase point holds its value exactly —'
    + ' CPI revaluation is flat in today\'s money', () => {
    const result = projectPension(input, today);
    const at50 = result.curve.find((x) => x.age === 50);
    expect(at50?.real).toBe(result.accruedAtExit.real);
    // Same entitlement, more actual pounds: cash climbs
    // over the years deferred at exactly CPI.
    const yrs = yearsBetween(
      input.exitDate, pointDateFor(50),
    );
    expect(at50?.nominal).toBeCloseTo(
      revalue(result.accruedAtExit.nominal, 0.02, yrs), 6,
    );
  });

  it('statement with today past exit: accruedAtExit is'
    + ' exactly the statement pension', () => {
    const late = new Date(2036, 0, 1);
    const result = projectPension(input, late);
    expect(result.accruedAtExit.real).toBe(5000);
  });

  it('estimation accruedAtExit is today-invariant', () => {
    const estimation: PensionEstimationInput = {
      kind: 'estimation',
      joinDate: new Date(2015, 3, 1),
      currentSalary: 40000,
      dateOfBirth: new Date(1985, 5, 15),
      exitDate: new Date(2045, 5, 15),
      retirementDate: new Date(2052, 5, 15),
      npa: 67,
      assumedCpi: 0.02,
    };
    const a = projectPension(estimation, today);
    const b = projectPension(
      estimation, new Date(2030, 5, 15),
    );
    // Today's money is today-invariant; the CASH reading is
    // not, and must not be — it is scaled from whenever
    // "today" is, so moving the clock moves it by design.
    expect(a.accruedAtExit.real).toBe(b.accruedAtExit.real);
    expect(a.accruedAtExit.nominal)
      .not.toBe(b.accruedAtExit.nominal);
  });
});

// ── the engine vs an independent oracle ─────────────

/**
 * Everything else in this file checks the engine against
 * ITSELF: relational invariants, or a formula that re-spells
 * the same loop. Those catch drift, not a wrong model. These
 * three check it against something derived separately.
 *
 * What they still cannot do is prove the MODEL is the
 * scheme's. That is not a property any oracle in this repo
 * can settle — it needs a real Total Reward Statement, which
 * is a release gate, not a unit test.
 */
describe('accrual — independent oracles', () => {
  /**
   * The scheme's in-service revaluation above CPI: CPI +
   * 1.5% while you are paying in (NHS 2015 Scheme design
   * document, cited in the module header), which is a flat
   * 1.5% once the projection's ruler is today's money.
   *
   * Re-typed here ON PURPOSE rather than imported. A test
   * that reads the implementation's own constant agrees
   * with whatever that constant is changed to, which is the
   * one thing this number needs guarding against.
   */
  const IN_SERVICE_REAL_RATE = 0.015;

  /**
   * 1 Jan 2000 to 1 Jan 2020 is 7305 days, which is exactly
   * 20 × 365.25 — so yearsBetween returns a whole 20 and
   * simulateAccrual's fractional-year branch never runs.
   * Any other 20-year span leaves a tail that the loop
   * accrues linearly and the closed form compounds, and the
   * two then differ for a legitimate reason.
   */
  const YEARS = 20;
  const SALARY = 54000;
  const oracleInput = (
    assumedCpi: number,
  ): PensionEstimationInput => ({
    kind: 'estimation',
    joinDate: new Date(2000, 0, 1),
    currentSalary: SALARY,
    dateOfBirth: new Date(2020 - 67, 0, 1),
    exitDate: new Date(2020, 0, 1),
    // Drawn exactly at NPA, so no ERF/LRF stands between
    // the accrual and the figure under test.
    retirementDate: new Date(2020, 0, 1),
    npa: 67,
    assumedCpi,
  });

  it('matches the closed-form geometric series', () => {
    // n slices of pay/54, each compounding for the years
    // that follow it, is a geometric series summing to
    // slice × ((1+r)^n − 1) / r. Derived from the scheme's
    // definition, not from reading simulateAccrual.
    const slice = SALARY / 54;
    const expected = slice
      * (Math.pow(1 + IN_SERVICE_REAL_RATE, YEARS) - 1)
      / IN_SERVICE_REAL_RATE;

    const result = projectPension(
      oracleInput(0.02), new Date(2000, 0, 1),
    );
    expect(result.accruedAtExit.real)
      .toBeCloseTo(expected, 6);
    // Guard the oracle itself: a series that summed to the
    // slices alone would mean revaluation had gone missing.
    expect(expected).toBeGreaterThan(slice * YEARS);
  });

  it('revaluation never touches the year\'s own slice', () => {
    // The order the reconciliation in the module header
    // settled: revalue the pot, THEN add the slice. It is
    // invisible to the closed form above (both orders are
    // geometric series) and shows up here, at the smallest
    // scale where the two disagree.
    //
    // Synthetic pay, published rate, no statement figures.
    //
    // Four years, not one: 2000-01-01 to 2004-01-01 is 1461
    // days, exactly 4 × 365.25, so the fractional-year
    // branch stays out of it (the same reason the span
    // above is twenty years).
    const slice = SALARY / 54;
    const r = 1 + IN_SERVICE_REAL_RATE;
    const fourYears = projectPension(
      {
        ...oracleInput(0.02),
        exitDate: new Date(2004, 0, 1),
        retirementDate: new Date(2004, 0, 1),
        dateOfBirth: new Date(2004 - 67, 0, 1),
      },
      new Date(2000, 0, 1),
    );
    // The LAST year's slice is unrevalued and the first
    // year's has compounded three times — four slices, four
    // different ages. Written out term by term rather than
    // summed, because the exponents are the claim.
    const revalueThenAdd = slice
      * (Math.pow(r, 3) + Math.pow(r, 2) + r + 1);
    expect(fourYears.accruedAtExit.real)
      .toBeCloseTo(revalueThenAdd, 6);

    // Name the rejected order explicitly, so a regression
    // has to disagree with a number that is written down.
    // It is the same series shifted one exponent up — every
    // slice credited with a year of revaluation it had not
    // yet earned, which is the 3.2% overstatement.
    const addThenRevalue = revalueThenAdd * r;
    expect(fourYears.accruedAtExit.real)
      .not.toBeCloseTo(addThenRevalue, 6);
  });

  it('CPI cannot reach the today\'s-money figure', () => {
    // The scheme's promise is quoted AGAINST CPI, so in
    // today's money it is CPI-free. If any assumption about
    // inflation moved this number, the two rulers would be
    // measuring different pensions.
    // `today` is injected, and must be: left to the wall
    // clock this scenario's exit date is in the PAST, where
    // the cash reading scales by a NEGATIVE exponent and
    // more inflation means fewer actual pounds. True, and
    // the opposite of what the last assertion expects.
    const today = new Date(2000, 0, 1);
    const calm = projectPension(oracleInput(0), today);
    const grim = projectPension(oracleInput(0.09), today);
    expect(grim.accruedAtExit.real)
      .toBe(calm.accruedAtExit.real);
    expect(grim.annualPension.real)
      .toBe(calm.annualPension.real);
    // ...and it must reach the cash figure, or the cash
    // ruler would be the real one wearing a different name.
    expect(grim.accruedAtExit.nominal)
      .toBeGreaterThan(calm.accruedAtExit.nominal);
  });

  it('cash is today\'s money scaled by CPI, exactly —'
    + ' the identity the two rulers rest on', () => {
    const cpi = 0.03;
    const today = new Date(2000, 0, 1);
    const result = projectPension(oracleInput(cpi), today);
    // Stated in the module header as the reason ONE
    // projection can serve both rulers. Checked at the exit
    // date and at every curve point, not just asserted.
    expect(result.accruedAtExit.nominal).toBeCloseTo(
      result.accruedAtExit.real
        * Math.pow(1 + cpi, YEARS),
      6,
    );
    for (const point of result.curve) {
      const years = yearsBetween(
        today, pointDateFor2000(point.age),
      );
      expect(point.nominal).toBeCloseTo(
        point.real * Math.pow(1 + cpi, years), 6,
      );
    }
  });

  /** Curve points land on the birthday, per buildCurve. */
  function pointDateFor2000(age: number): Date {
    return new Date(2020 - 67 + age, 0, 1);
  }
});

// ── curve ↔ at-retirement equivalence ───────────────

describe('curve — at-retirement equivalence', () => {
  /**
   * The in-payment segment of the curve must grow from
   * exactly the annualPension the projection reports —
   * one producer for the at-retirement value. Exact
   * equality (toBe): the expected values re-apply the
   * same exported functions to the reported result, so
   * any drift between the curve's at-retirement base
   * and annualPension breaks these bit-for-bit.
   */
  const base: PensionStatementInput = {
    kind: 'statement',
    accruedPension: 5000,
    currentSalary: 54000,
    dateOfBirth: new Date(1990, 0, 1),
    exitDate: new Date(2035, 0, 1),
    retirementDate: new Date(2057, 0, 1),
    npa: 67,
    assumedCpi: 0.02,
  };

  function pointDateFor(age: number): Date {
    const dob = base.dateOfBirth;
    return new Date(
      dob.getFullYear() + age,
      dob.getMonth(),
      dob.getDate(),
    );
  }

  it('on-time (factor 1): point at retirement equals'
    + ' annualPension exactly', () => {
    const result = projectPension(base);
    expect(result.factorType).toBe('none');
    const atRet = result.curve.find((p) => p.age === 67);
    expect(atRet).toBeDefined();
    expect(atRet?.real).toBe(result.annualPension.real);
  });

  it('early (ERF applied): in-payment points hold'
    + ' annualPension exactly — a CPI-linked pension is'
    + ' flat in today\'s money', () => {
    const early: PensionStatementInput = {
      ...base,
      retirementDate: new Date(2053, 0, 1),
    };
    const result = projectPension(early);
    expect(result.factorType).toBe('erf');
    const inPayment = result.curve.filter(
      (p) => pointDateFor(p.age) > early.retirementDate,
    );
    expect(inPayment.length).toBeGreaterThan(0);
    for (const point of inPayment) {
      expect(point.real).toBe(result.annualPension.real);
    }
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
    expect(result.accruedAtExit.real).toBeGreaterThan(0);
    expect(result.isEstimation).toBe(true);
  });

  it('carries estimation flag', () => {
    const result = projectPension(baseInput);
    expect(result.isEstimation).toBe(true);
  });

  it('produces positive pension values', () => {
    const result = projectPension(baseInput);
    expect(result.annualPension.real).toBeGreaterThan(0);
    expect(result.revaluedAtRetirement.real)
      .toBeGreaterThan(0);
  });

  it('curve contains expected age range', () => {
    const result = projectPension(baseInput);
    const ages = result.curve.map((p) => p.age);
    expect(Math.max(...ages))
      .toBeGreaterThanOrEqual(72);
  });
});
