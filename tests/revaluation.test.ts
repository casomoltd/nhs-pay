import {describe, expect, it} from 'vitest';
import {
  ACTIVE_REVAL_BONUS_PCT,
  IN_SERVICE_REVALUATION,
  revaluationFor,
} from '../src/revaluation.js';
import {yearlyAccrual} from '../src/pension-projection.js';

/**
 * The published-rate oracle.
 *
 * Every other accrual test in this suite is checked against
 * the scheme's rules as we understand them. This one is
 * checked against the rates the scheme actually PUBLISHED,
 * each traceable to the statutory instrument that made it.
 * That is a different and stronger thing: it can catch a
 * misreading of the rule, not just a misapplication of it.
 * Synthetic earnings throughout — the rates are public and
 * the pay is invented.
 */
describe('published in-service revaluation', () => {
  it('is CPI plus 1.5 ADDED, not compounded — every '
    + 'published year', () => {
    for (const year of IN_SERVICE_REVALUATION) {
      // Additive: 3.1 + 1.5 = 4.6, exactly as published.
      expect(year.ratePct).toBeCloseTo(
        year.septemberCpiPct + ACTIVE_REVAL_BONUS_PCT, 10,
      );
    }
  });

  it('and compounding it would NOT reproduce the published '
    + 'rates', () => {
    // The distinction this file exists to pin. Compounding
    // gives (1+cpi)(1.015), which is bigger than cpi + 1.5
    // by cpi × 1.5% — small at low inflation, and 0.15
    // points in the year CPI ran at 10.1%.
    const gaps = IN_SERVICE_REVALUATION.map((year) => {
      const cpi = year.septemberCpiPct / 100;
      const compounded =
        ((1 + cpi) * (1 + ACTIVE_REVAL_BONUS_PCT / 100) - 1)
        * 100;
      return compounded - year.ratePct;
    });
    for (const gap of gaps) expect(gap).toBeGreaterThan(0);
    // Biggest in the 10.1% year, as the arithmetic demands.
    expect(Math.max(...gaps)).toBeCloseTo(0.1515, 3);
  });

  it('revalues the pot before adding the year\'s slice, at '
    + 'the published rates', () => {
    // The loop order, re-checked against real rates rather
    // than a flat assumption. Synthetic pay, deliberately
    // uneven so an off-by-one year is visible.
    const pay = [30_000, 36_000, 42_000, 48_000, 54_000];
    expect(pay).toHaveLength(IN_SERVICE_REVALUATION.length);
    let pot = 0;
    const trace: number[] = [];
    IN_SERVICE_REVALUATION.forEach((year, i) => {
      pot = pot * (1 + year.ratePct / 100)
        + yearlyAccrual(pay[i]);
      trace.push(pot);
    });

    // First year buys exactly one slice: nothing to revalue
    // yet, and the slice earns nothing in the year it is
    // earned.
    expect(trace[0]).toBeCloseTo(30_000 / 54, 10);
    // Second year: the first slice revalued once, plus the
    // new slice unrevalued.
    expect(trace[1]).toBeCloseTo(
      (30_000 / 54) * 1.116 + 36_000 / 54, 10,
    );
    // The rejected order, named so a regression has to
    // disagree with a number written down.
    const addThenRevalue =
      ((30_000 / 54) + (36_000 / 54)) * 1.116;
    expect(trace[1]).not.toBeCloseTo(addThenRevalue, 6);
  });

  it('names an unpublished year rather than guessing', () => {
    expect(revaluationFor(2025)?.ratePct).toBe(3.2);
    expect(revaluationFor(2019)).toBeNull();
  });

  it('records the move from 1 April to 6 April', () => {
    // Changed from 2023 to manage the annual-allowance
    // interaction. Carried per year because a projection
    // that assumed a scheme-year boundary would place every
    // revaluation from 2023 on a few days early.
    expect(revaluationFor(2022)?.appliedOn)
      .toBe('2022-04-11');
    for (const year of IN_SERVICE_REVALUATION) {
      if (year.yearEnd < 2023) continue;
      expect(year.appliedOn.slice(5)).toBe('04-06');
    }
  });

  it('cites the instrument that made each rate', () => {
    // Provenance as data, not as a comment: a rate nobody
    // can trace back to an SI is a number we made up.
    for (const year of IN_SERVICE_REVALUATION) {
      expect(year.si).toMatch(/^SI \d{4}\/\d+$/);
    }
  });
});
