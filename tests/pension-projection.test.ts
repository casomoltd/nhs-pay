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
  ProjectionPoint,
} from '../src/pension-projection.js';
import {FactorTable} from '../src/gad/factor-table.js';
import {ERF_0_420} from '../src/gad/erf-2023-06-30.js';
import {LRF_0_421} from '../src/gad/lrf-2023-06-30.js';
import {parseCsv} from './helpers.js';

// Fresh instances from the same verbatim data the module
// wires in — exercises the identical construction path.
const erf1 = new FactorTable(ERF_0_420);
const lrf1 = new FactorTable(LRF_0_421);

const gadExamples = parseCsv('gad-worked-examples.csv');

/**
 * The curve point for a whole age.
 *
 * Points sit at 31 March closes, so their ages carry the
 * fraction of a year between the birthday and that year end —
 * anything from nought to twelve months. Looking one up by
 * exact equality only ever worked while the curve was plotted
 * at birthdays.
 */
const pointAt = (
  curve: readonly ProjectionPoint[],
  wholeAge: number,
) => curve.find((p) => Math.floor(p.age) === wholeAge);

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

  /** The published CPI, re-typed; see the oracle block. */
  const CPI: Readonly<Record<number, number>> = {
    2016: -0.1, 2017: 1, 2018: 3, 2019: 2.4, 2020: 1.7,
    2021: 0.5, 2022: 3.1, 2023: 10.1, 2024: 6.7, 2025: 1.7,
    2026: 3.8,
  };
  const YEAR_END = new Date(2026, 2, 31);
  /** Pay is held FLAT IN TODAY'S MONEY — the base case, and
   * the only one built. So a year's slice in that year's own
   * cash is today's pay carried to it by the ruler, and reading
   * it back in today's money returns exactly pay / 54.
   *
   * The ruler is anchored at the record, so a year at or before
   * the anchor takes the pay unconverted and a year after it
   * takes one assumed step per 6 April. Here the anchor is the
   * 2022 statement's own April and every year under test falls
   * after it. */
  /** Pay is held FLAT IN TODAY'S MONEY, so a year's slice in
   * that year's own cash is the caller's figure carried back
   * one assumed step per uplift date between that year end and
   * the run date. Here the run date is 31 March 2026. */
  const payIn = (yearEnd: number) =>
    54_000 * Math.pow(1.02, yearEnd - 2026);

  it('a dated statement accrues from ITS date, not today',
    () => {
      // The defect this closes: a member reading a statement
      // "updated to 31/03/2025" a year later was credited with
      // none of the year since.
      const statementDate = new Date(2022, 2, 31);
      const dated = projectPension(
        {...baseInput, statementDate}, YEAR_END,
      );
      const undated = projectPension(baseInput, YEAR_END);
      expect(dated.accruedAtExit.nominal)
        .toBeGreaterThan(undated.accruedAtExit.nominal);

      // And by the right amount. The statement figure is CASH
      // at a scheme year end, so it seeds the ledger as it
      // stands — no conversion, which is the derivation
      // inverting. Four years then price by the same rule as
      // any other: revalue the pot, THEN add the slice.
      //
      // At the ASSUMED rate, not the published one, even though
      // 2023–2026 are all legislated. The 2023 slice is a guess
      // the moment it is added, so every Order after it would
      // be a legislated rate on a guessed base. Only the first
      // uplift — the one acting on the statement figure itself
      // — could have been published, and this member's
      // statement predates it.
      let expected = 5000;
      for (let year = 2023; year <= 2026; year++) {
        const rate = year === 2023 ? CPI[year - 1] + 1.5 : 3.5;
        expected = expected * (1 + rate / 100) + payIn(year) / 54;
      }
      const atToday = projectPension(
        {
          ...baseInput, statementDate,
          exitDate: YEAR_END, retirementDate: YEAR_END,
          dateOfBirth: new Date(1959, 2, 31),
        },
        YEAR_END,
      );
      expect(atToday.accruedAtExit.nominal)
        .toBeCloseTo(expected, 6);
    });

  it('reads an undated statement as the balance TODAY', () => {
    // The default is no longer a no-op, and deliberately so. A
    // bare figure is what the member is looking at now, which
    // is a mid-year position, not a scheme year end — so it is
    // carried back to the last year end and the walk re-applies
    // the uplift it already contains. No double count, and no
    // year of accrual thrown away.
    //
    // Here `today` IS a year end and the April uplift has not
    // yet landed, so the figure already IS the closing balance:
    // nothing is undone and nothing is added. Reading it as the
    // PREVIOUS year end instead would credit 2025/26's slice
    // twice — once inside the member's own figure and once from
    // the walk.
    const result = projectPension(
      {
        ...baseInput,
        exitDate: YEAR_END, retirementDate: YEAR_END,
        dateOfBirth: new Date(1959, 2, 31),
      },
      YEAR_END,
    );
    expect(result.accruedAtExit.nominal).toBeCloseTo(5000, 9);
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


  it('curve shape is deterministic: the seed, then 35–73',
    () => {
    // endAge: 1990→2057 spans 24472 days = 67.0007
    // fractional years (17 leap days beat the .25/yr
    // average), so retirement+5 tips past npa+5=72 and
    // ceils to 73.
    //
    // It starts at 34, not at today's 35: the seed is a
    // balance at a SCHEME YEAR END, and every step from there
    // to now is real history rather than a gap. Starting at
    // today withheld it — and put any leaving date already in
    // the past outside the plotted range entirely.
    const result = projectPension(input, today);
    const ages = result.curve.map((p) => p.age);
    // Whole ages throughout. The first point is the ledger's
    // own start, 31 March 2024, and it carries the age whose
    // birthday falls in that scheme year — the axis stays an
    // age while the dates behind it sit on 31 March.
    // Fractional, and the fraction is the point: each value
    // sits at a 31 March, so its age carries the months from
    // the birthday to that year end.
    expect(ages[0]).toBeCloseTo(34.25, 1);
    expect(ages[1]).toBeCloseTo(35.25, 1);
    expect(ages[ages.length - 1]).toBeCloseTo(73.24, 1);
    expect(ages.length).toBe(40);
  });

  it('draws a leaving date that has already passed', () => {
    // The regression: with the curve starting at today, a
    // member who stopped paying in last year got a "stops
    // paying in" marker at an age the chart did not reach —
    // a point floating beside the plot.
    const lastYear = new Date(2024, 0, 1);
    const result = projectPension(
      {...input, exitDate: lastYear}, today,
    );
    // Compared as DATES: at an exact birthday the 365.25-day
    // age lands a hair under the whole number, so comparing
    // ages here would fail on a rounding artefact.
    const firstDate = new Date(
      input.dateOfBirth.getFullYear()
        + Math.floor(result.curve[0].age),
      input.dateOfBirth.getMonth(),
      input.dateOfBirth.getDate(),
    );
    expect(firstDate.getTime()).toBeLessThanOrEqual(
      lastYear.getTime(),
    );
    // And the phase actually turns over inside the drawn range.
    expect(result.curve.some((p) => p.phase === 'active'))
      .toBe(true);
    expect(result.curve.some((p) => p.phase !== 'active'))
      .toBe(true);
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
    // The ledger starts at the scheme year end BEFORE the
    // join — 31 March 2015, age 25.24 — and nothing is banked
    // there. The join itself is six days later.
    expect(first.age).toBeCloseTo(25.24, 1);
    expect(first.nominal).toBe(0);
    expect(first.accrued).toBe(true);
    /* History reads LOWER in cash than in today's money: the
       pension built up in 2020 was fewer actual pounds then
       than the same entitlement is worth now. The two rulers
       meet at today and nowhere else.

       This member stated nothing, so their FACE-VALUE window
       is empty and every April is a step — including the ones
       behind us, which is what makes the assumed rate and the
       assumed ruler cancel. Clamping their invented history to
       face value instead left 3.5% a year compounding against
       a ruler that never moved: 12% of growth from nowhere
       over a ten-year career. */
    for (const p of result.curve) {
      if (p.age < 35 && p.real > 0) {
        expect(p.nominal).toBeLessThan(p.real);
      }
    }
  });

  it('today: exactly the statement pension, both ways', () => {
    // Reported directly rather than read off the curve. The
    // curve is plotted at 31 March closes, so no point falls on
    // today and the nearest one is up to a year out — which is
    // precisely how a consumer once showed a member a balance
    // from before both the year end and the April uplift.
    const result = projectPension(input, today);
    expect(result.accruedNow.nominal).toBe(5000);
    expect(result.accruedNow.real).toBe(5000);
    expect(result.accruedNow.asAt).toBe(today);
  });

  it('accrued flag flips exactly after today', () => {
    const result = projectPension(input, today);
    const flags = new Map(
      result.curve.map((p) => [Math.floor(p.age), p.accrued]),
    );
    // Age 34's point is 31 March 2024, behind today; age 35's
    // is 31 March 2025, three months ahead of it. The flag
    // tracks the point's own date, and the points now sit on
    // the scheme's calendar rather than the reader's birthday.
    expect(flags.get(34)).toBe(true);
    expect(flags.get(35)).toBe(false);
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
  it('an active point is the last STEP, not an interpolation',
    () => {
      // `today` is 1 Jan 2025, so the undated figure is carried
      // back to the 2024 year end by undoing the 8.2% applied
      // on 6 April 2024 — which the 2025 row then re-applies,
      // landing revalued exactly back on 5,000.
      //
      // Age 36's point is 31 MARCH 2026 — the close of the
      // scheme year that birthday falls in — so it carries the
      // year's revaluation AND its slice. Under the old
      // birthday sampling it landed on 1 January, between the
      // two, and reported a figure belonging to no year end at
      // all.
      const result = projectPension(input, today);
      // `today` is 1 Jan 2025 and the year closes 31 Mar 2025,
      // with no 6 April between them — so the pay for 2024/25
      // is this year's pay unscaled. The ruler steps on the
      // same days the pension does; it does not compound
      // through the year.
      const closing2025 = 5000 + 54_000 / 54;
      // Pay for 2025/26 in that year's own cash: one assumed
      // step forward from the run date, the 6 April 2025
      // uplift date.
      // The ASSUMED rate, 2 + 1.5, not Order 2025's published
      // 3.2%: by then the 2024/25 slice above is in the
      // balance and it is this library's guess, so the Order
      // would be a legislated rate on a guessed base.
      const expected = closing2025 * 1.035 + 54_000 * 1.02 / 54;

      const at36 = pointAt(result.curve, 36);
      expect(at36?.nominal).toBeCloseTo(expected, 6);
      // Today's money is its own run, not this one deflated:
      // 1.5% on the pot and the pay unconverted.
      expect(at36?.real)
        .toBeCloseTo(closing2025 * 1.015 + 54_000 / 54, 6);
    });

  it('is flat in real terms once deferred, and the exit'
    + ' figure sits on that line', () => {
    const result = projectPension(input, today);
    const at50 = pointAt(result.curve, 50);
    const at51 = pointAt(result.curve, 51);

    // Deferred revaluation is CPI exactly and the real reading
    // divides by the same assumption, so a year apart at the
    // same point in the scheme year the figure barely moves.
    //
    // Flat to the day-count convention, not beyond it: the
    // pension steps by exactly 2% on 6 April while the real
    // deflator compounds over 365.25-day years, so a leap year
    // leaves about 0.004% behind. A stepped pension read
    // against a continuous deflator saw-tooths, and pretending
    // otherwise is what an exact assertion here would do.
    expect(Math.abs((at50?.real ?? 0) / (at51?.real ?? 1) - 1))
      .toBeLessThan(1e-4);

    // And the reported exit figure is ON that line, not below
    // it. `accruedAtExit` is the closing of the scheme year the
    // exit falls in — the whole year the member is credited —
    // so the deferred line runs flat from there.
    //
    // It used to sit below, by the months between 1 January and
    // the following 31 March, because the figure was read on
    // the exit date while the model credited the whole year.
    // That gap was the inconsistency, not the finding, and the
    // reasoning recorded here for it — nine twelfths of CPI +
    // 1.5 under Sch 9 para 3 — described pro-rating, which this
    // model does not do.
    expect(result.accruedAtExit.real)
      .toBeCloseTo(at50?.real ?? 0, 6);
  });

  it('reads a deferred member\'s undated figure back to the'
    + ' year end', () => {
    // Today is past exit, so the member is deferred and the
    // uplift already in their figure is plain CPI, not CPI +
    // 1.5. Undoing the right one is what keeps the seed
    // honest: undoing the in-service rate here would understate
    // the balance by the 1.5 points.
    const late = new Date(2036, 0, 1);
    const result = projectPension(input, late);
    expect(result.accruedAtExit.nominal)
      .toBeCloseTo(5000 / 1.02, 9);
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
    /* The TODAY'S-MONEY reading is today-invariant, and it
       falls out rather than being arranged. Not one figure in
       this member's ledger is a record — no statement, so no
       published Order applies — and the run-date anchor
       appears in the pay conversion and in the deflator with
       opposite signs, so it cancels exactly. Run the tool five
       years later and today's money says the same thing.

       CASH is not, and must not be: the same pension quoted in
       2030 pounds is more pounds than in 2025 pounds. That is
       the whole content of the switch.

       Neither statement holds for a member WITH a statement.
       Their anchor is the record boundary, which moves as
       Orders are made. */
    expect(a.accruedAtExit.real)
      .toBeCloseTo(b.accruedAtExit.real, 6);
    expect(a.accruedAtExit.nominal)
      .not.toBeCloseTo(b.accruedAtExit.nominal, 0);
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
   * The published September CPI figures, RE-TYPED here on
   * purpose rather than imported. A test that reads the
   * implementation's own table agrees with whatever that table
   * is changed to, which is the one thing these numbers need
   * guarding against. Sources: the eleven Revaluation Orders,
   * cited row by row in `revaluation.ts`.
   *
   * Keyed by scheme year END, and the uplift they set is applied
   * at the START of the FOLLOWING year — SI 2016/438, applied
   * 1 April 2016, opens the year ending 31 March 2017.
   */
  const CPI: Readonly<Record<number, number>> = {
    2016: -0.1, 2017: 1, 2018: 3, 2019: 2.4, 2020: 1.7,
    2021: 0.5, 2022: 3.1, 2023: 10.1, 2024: 6.7, 2025: 1.7,
    2026: 3.8,
  };
  const SALARY = 54_000;
  const JOIN = new Date(2016, 3, 1);
  const EXIT = new Date(2026, 2, 31);
  const TODAY = new Date(2026, 2, 31);

  const oracleInput = (
    assumedCpi: number,
  ): PensionEstimationInput => ({
    kind: 'estimation',
    joinDate: JOIN,
    currentSalary: SALARY,
    // NPA falls exactly on the retirement date, so no ERF/LRF
    // stands between the accrual and the figure under test.
    dateOfBirth: new Date(1959, 2, 31),
    exitDate: EXIT,
    retirementDate: EXIT,
    npa: 67,
    assumedCpi,
  });

  it('matches a year-by-year replay of the published Orders',
    () => {
      // A member who LEFT at their statement date. Nothing is
      // added after it, so the balance never stops being the
      // scheme's own figure and every published Order applies
      // to it — which makes this the one path where a replay of
      // the Orders is the right oracle. An accruing member's
      // balance carries a guessed slice from its first year, so
      // no Order after that one is used at all.
      //
      // Deferred, so the rate is CPI floored at zero, with no
      // 1.5 added.
      const left = new Date(2017, 2, 31);
      const result = projectPension(
        {
          kind: 'statement',
          accruedPension: 5000,
          statementDate: left,
          currentSalary: SALARY,
          dateOfBirth: new Date(1959, 2, 31),
          exitDate: left,
          // NPA exactly, so no ERF/LRF stands between the
          // replay and the figure under test.
          retirementDate: new Date(2026, 2, 31),
          npa: 67,
          assumedCpi: 0.02,
        },
        TODAY,
      );

      // An independent implementation of the recurrence, in the
      // test, from the re-typed figures above. ONE published
      // Order, then the assumption: SI 2017's figure opens 2018
      // and is used because it acts on the stated balance
      // itself. Every year is DEFERRED — CPI floored at zero,
      // with no 1.5 added — including the first: leaving is the
      // moment the in-service rate stops, with no final-year
      // credit for the year just served.
      let balance = 5000 * (1 + CPI[2017] / 100);
      for (let year = 2019; year <= 2026; year++) balance *= 1.02;
      expect(result.ledger.closingAt(2026))
        .toBeCloseTo(balance, 6);
      expect(balance).toBeGreaterThan(5000);

      // In TODAY'S money the same member is flat after that one
      // published uplift, which is what deferred means and what
      // every reader expects. Carrying published Orders on
      // through a window nothing deflated made this figure
      // climb instead: £3,660 against a statement saying
      // £3,417, with nothing having happened in between.
      expect(result.todaysMoneyLedger.closingAt(2026))
        .toBeCloseTo(5000 * 1.01, 6);
      expect(result.todaysMoneyLedger.closingAt(2020))
        .toBeCloseTo(5000 * 1.01, 6);

      // And the figure off the paper is handed back untouched.
      // This is the whole decision in one assertion: a member
      // who enters their statement and asks what they had on
      // its date is told exactly what the statement says.
      expect(result.ledger.atDate(left)).toBeCloseTo(5000, 9);
      expect(result.todaysMoneyLedger.atDate(left))
        .toBeCloseTo(5000, 9);
    });

  it('revaluation never touches the year\'s own slice', () => {
    // The order the reconciliation in the module header
    // settled: revalue the pot, THEN add the slice. It shows up
    // at the smallest scale where the two disagree.
    //
    // Four years, written out term by term rather than summed,
    // because the exponents are the claim. Synthetic pay,
    // published rates, no statement figures.
    const fourYears = projectPension(
      {
        ...oracleInput(0.02),
        joinDate: new Date(2019, 3, 1),
        exitDate: new Date(2023, 2, 31),
        retirementDate: new Date(2023, 2, 31),
        dateOfBirth: new Date(1956, 2, 31),
      },
      new Date(2023, 2, 31),
    );

    // Scheme years 2020..2023. The first carries no uplift; the
    // rest open at the ASSUMED in-service rate — this member
    // gave no statement, so every slice is a guess and no Order
    // applies. The rate is incidental here: the claim under
    // test is the EXPONENTS, and they are the same whichever
    // series the years are drawn from.
    const rate = 1.035;
    /* Pay is held flat in today's money, so a year's slice in
       that year's own cash is the caller's figure carried BACK
       one assumed step per uplift date between that year end
       and the run date — here 31 March 2023, the exit itself.

       Scheme year 2023's own close takes no step, because the
       2023 Order lands on 6 April, the week after. Pre-2023
       uplifts land on 1 April and later ones on the 6th;
       reading the ruler off a hardcoded 6 April is exactly the
       five-day error this file exists to catch. */
    const pay = (y: number) => SALARY / 54 * Math.pow(1.02, y - 2023);
    // The LAST year's slice is unrevalued and the first year's
    // has been revalued three times — four slices, four
    // different ages.
    const revalueThenAdd =
      pay(2020) * rate * rate * rate
      + pay(2021) * rate * rate
      + pay(2022) * rate
      + pay(2023);
    expect(fourYears.accruedAtExit.nominal)
      .toBeCloseTo(revalueThenAdd, 6);

    // Name the rejected order explicitly, so a regression has
    // to disagree with a number that is written down. Every
    // slice would be credited with a year of revaluation it had
    // not yet earned — the 3.2% overstatement.
    const addThenRevalue =
      pay(2020) * rate * rate * rate
      + pay(2021) * rate * rate * rate
      + pay(2022) * rate * rate
      + pay(2023) * rate;
    expect(fourYears.accruedAtExit.nominal)
      .not.toBeCloseTo(addThenRevalue, 6);
  });

  it('holds today\'s money still whatever CPI is assumed',
    () => {
      /* The property this model was rebuilt to have, and the
         end of a long argument about a third of a percent.

         Today's money is not this projection divided by
         inflation — it is the SAME model run with the
         assumption set to zero. So the assumption cannot reach
         it: 0%, 2% or 9%, the today's-money figure is
         identical, and it is the figure a member gets by hand
         from "1.5% a year on a flat salary".

         While it WAS a deflated reading the real rate came out
         as 0.015 / (1 + cpi) and drifted with the assumption:
         1.5% at zero, 1.47% at two, 1.38% at nine. Defensible
         arithmetic, and not what anyone means by ignoring
         inflation. If this ever fails, a deflator has crept
         back in.

         Nothing here is in the past, so the assumption is the
         only price series in play. */
      const future = {
        ...oracleInput(0),
        exitDate: new Date(2046, 2, 31),
        retirementDate: new Date(2046, 2, 31),
        dateOfBirth: new Date(1979, 2, 31),
      };
      const calm = projectPension(future, TODAY);
      const grim = projectPension(
        {...future, assumedCpi: 0.09}, TODAY,
      );
      expect(grim.accruedAtExit.real)
        .toBeCloseTo(calm.accruedAtExit.real, 6);
      // Cash is where the assumption lives, and it must bite.
      expect(grim.accruedAtExit.nominal)
        .toBeGreaterThan(calm.accruedAtExit.nominal * 2);
    });

  it('reports two runs, not one run and a deflator', () => {
    // Cash is the scheme's own ruler: its records, uplifts and
    // statements are all cash. Today's money is the same model
    // with inflation switched off, never this one divided.
    const cpi = 0.037;
    const result = projectPension(oracleInput(cpi), TODAY);
    const {nominal, real, asAt} = result.annualPension;
    expect(asAt).toEqual(EXIT);
    // The claim the pair makes, checked against the thing it
    // claims to be.
    const zero = projectPension(oracleInput(0), TODAY);
    expect(real).toBeCloseTo(zero.annualPension.nominal, 8);
    expect(zero.annualPension.real)
      .toBeCloseTo(zero.annualPension.nominal, 12);
    /* At the RUN DATE the two nearly meet, because there is no
       future inflation left to separate them: this member
       exits and draws on the day the projection is run.

       Nearly, not exactly, and the residue is the point. Ten
       years of history compound at 1.5 / (1 + cpi) in the cash
       run against a flat 1.5% in the today's-money one, so the
       latter ends a shade AHEAD — the same third of a percent
       that a deflated reading would have shown as a shortfall
       against a member's own arithmetic. Under a quarter of a
       percent over a decade; larger, and the two runs would
       have drifted apart on something other than this. */
    expect(real / nominal).toBeGreaterThan(1);
    expect(real / nominal).toBeLessThan(1.0025);
  });
});

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
    // The point AT retirement is the transition the
    // orchestrator inserts, not a 31 March close, so it is
    // found by its exact age rather than by whole years.
    const atRet = result.curve.find(
      (p) => Math.floor(p.age) === 67,
    );
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
    expect(inPayment.length).toBeGreaterThan(1);
    // Year on year at the same point in the scheme year, an
    // in-payment pension holds its value: it steps at exactly
    // the rate the real reading divides by. Compared against
    // annualPension itself it would NOT be exact, because that
    // figure is read at the retirement date and these are read
    // at birthdays — a stepped pension against a continuous
    // deflator, again.
    for (let i = 1; i < inPayment.length; i++) {
      expect(Math.abs(
        inPayment[i].real / inPayment[i - 1].real - 1,
      )).toBeLessThan(1e-4);
    }
    // And it is the pension actually reported, not a
    // re-derivation of it: same figure to within that same
    // convention.
    expect(Math.abs(
      inPayment[0].real / result.annualPension.real - 1,
    )).toBeLessThan(1e-3);
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

// ── Cross-ruler identity ────────────────────────────

describe('cross-ruler identity on the statement path', () => {
  // A member's statement figure is cash at the statement
  // date. Read into today's money and read back out at that
  // SAME date, it must return unchanged: the two directions
  // are one policy, so the round trip is the identity.
  //
  // Before that policy had a single owner the legs disagreed
  // — inbound walked the published Orders, outbound
  // compounded the assumed rate — so the figure came back
  // scaled by the ratio between two different price series.
  const today = new Date(2026, 7, 19);
  const statementDate = new Date(2025, 2, 31);
  const ACCRUED = 12_345.67;

  const input: PensionStatementInput = {
    kind: 'statement',
    accruedPension: ACCRUED,
    statementDate,
    currentSalary: 55_000,
    dateOfBirth: new Date(1980, 0, 1),
    // Exit ON the statement date: nothing accrues after it,
    // so the only arithmetic left is the conversion itself.
    exitDate: statementDate,
    retirementDate: new Date(2047, 0, 1),
    npa: 67,
    assumedCpi: 0.02,
  };

  it('returns the member’s own figure at its own date', () => {
    const {accruedAtExit} = projectPension(input, today);
    expect(accruedAtExit.nominal).toBeCloseTo(ACCRUED, 8);
  });

  it('does not move with the CPI assumption', () => {
    // The window is entirely in the past, so every rate in it
    // is legislated. A forecast must not reach back into it.
    const at = (assumedCpi: number) =>
      projectPension({...input, assumedCpi}, today)
        .accruedAtExit.nominal;
    expect(at(0.05)).toBeCloseTo(at(0.01), 8);
  });
});

/* The seed and the walk are two halves of one rule, and this is
   the test that holds them together.

   `seedFromBalanceAt` divides a stated balance by the uplift
   already inside it; `buildLedger` multiplies that same uplift
   back on. If the two pick the rate by different rules the
   member's own figure does not survive the round trip — and for
   a long time they did, disagreeing for exactly one exit date:
   31 March of the last closed scheme year. Both halves had
   fixtures; neither had a test that they AGREE, which is why a
   1.5-point error shipped green.

   Swept rather than sampled, because the failure was one day
   wide. Each pair asks the only question that matters: give the
   library a figure, ask for it straight back, get it. */
describe('seed and walk agree at every year-end boundary', () => {
  const STATED = 3417.21;

  const accruedNow = (exitDate: Date, today: Date) =>
    projectPension({
      kind: 'statement',
      accruedPension: STATED,
      currentSalary: 54_000,
      dateOfBirth: new Date(1982, 2, 15),
      exitDate,
      retirementDate: new Date(2049, 2, 31),
      npa: 67,
      assumedCpi: 0.02,
    }, today).accruedNow.nominal;

  // Read on four different days, including a 31 March — the one
  // day `schemeYearClosedBy` and `schemeYearEndFor` coincide.
  const CLOCKS = [
    new Date(2026, 7, 20),
    new Date(2026, 3, 10),
    new Date(2027, 0, 5),
    new Date(2026, 2, 31),
  ];

  it('returns an undated stated figure unchanged, whenever the'
    + ' member leaves and whenever they ask', () => {
    for (const today of CLOCKS) {
      for (let year = 2022; year <= 2032; year += 1) {
        // Either side of the boundary and ON it. The middle
        // date is the one that used to come back 1.5 points
        // light: the year end that had just closed.
        for (const exit of [
          new Date(year, 2, 30),
          new Date(year, 2, 31),
          new Date(year, 3, 1),
        ]) {
          expect(accruedNow(exit, today)).toBeCloseTo(STATED, 6);
        }
      }
    }
  });

  it('is not quietly passing — an uplift really is undone'
    + ' and put back', () => {
    /* Guards the guard. If no uplift were ever undone the sweep
       above would hold for the wrong reason and the 1.5-point
       gap it exists to catch would be invisible. So prove the
       round trip is real: the balance the seed PLACES at the
       year end must sit strictly below the stated figure,
       because the uplift already inside that figure was divided
       back out — and the walk must then put it back exactly. */
    const today = new Date(2026, 7, 20);
    const result = projectPension({
      kind: 'statement',
      accruedPension: STATED,
      currentSalary: 54_000,
      dateOfBirth: new Date(1982, 2, 15),
      exitDate: new Date(2026, 2, 31),
      retirementDate: new Date(2049, 2, 31),
      npa: 67,
      assumedCpi: 0.02,
    }, today);
    expect(result.ledger.closingAt(2026)).toBeLessThan(STATED);
    expect(result.accruedNow.nominal).toBeCloseTo(STATED, 6);
  });
});
