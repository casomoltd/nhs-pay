import {describe, expect, it} from 'vitest';
import {
  ACTIVE_REVAL_BONUS_PCT,
  IN_SERVICE_REVALUATION,
  publishedInflationBetween,
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
      return {year, gap: compounded - year.ratePct};
    });
    for (const {year, gap} of gaps) {
      // Never agrees, and the SIGN follows the prices figure
      // rather than the bonus: compounding runs high when
      // prices rose and LOW in the one year they fell. A test
      // that only demanded gap > 0 encoded the assumption
      // that prices always rise, and 2016 disproves it.
      expect(gap).not.toBeCloseTo(0, 6);
      expect(Math.sign(gap))
        .toBe(Math.sign(year.septemberCpiPct));
    }
    const sizes = gaps.map((g) => g.gap);
    // Biggest in the 10.1% year, as the arithmetic demands.
    expect(Math.max(...sizes)).toBeCloseTo(0.1515, 3);
    // And smallest in 2016, the only year prices fell.
    expect(Math.min(...sizes)).toBeCloseTo(-0.0015, 4);
  });

  it('revalues the pot before adding the year\'s slice, at '
    + 'the published rates', () => {
    // The loop order, re-checked against real rates rather
    // than a flat assumption. Synthetic pay, deliberately
    // uneven so an off-by-one year is visible.
    const pay = IN_SERVICE_REVALUATION.map(
      (_, i) => 30_000 + i * 3_000,
    );
    // The two literals below are the first two published
    // years. Pinned by name so this stays a number written
    // down rather than one read back out of the table it is
    // testing — and so prepending a year fails HERE, saying
    // why, instead of silently re-basing the oracle.
    expect(IN_SERVICE_REVALUATION[0].yearEnd).toBe(2016);
    expect(IN_SERVICE_REVALUATION[1].ratePct).toBe(2.5);
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
      (30_000 / 54) * 1.025 + 33_000 / 54, 10,
    );
    // The rejected order, named so a regression has to
    // disagree with a number written down.
    const addThenRevalue =
      ((30_000 / 54) + (33_000 / 54)) * 1.025;
    expect(trace[1]).not.toBeCloseTo(addThenRevalue, 6);
  });

  it('names an unpublished year rather than guessing', () => {
    expect(revaluationFor(2025)?.ratePct).toBe(3.2);
    // The table now runs unbroken from the scheme's first
    // uplift, so "not held" means only the two ends: a year
    // before the scheme revalued anything, and one whose
    // order has yet to be made.
    expect(revaluationFor(2015)).toBeNull();
    expect(revaluationFor(2027)).toBeNull();
  });

  it('records the move from 1 April to 6 April', () => {
    // Changed from 2023 to manage the annual-allowance
    // interaction. Carried per year because a projection
    // that assumed a scheme-year boundary would place every
    // revaluation from 2023 on a few days early.
    // Both halves, which only became checkable once the
    // table was complete: this row used to read 2022-04-11,
    // the date the Pensions Increase Order took effect that
    // year, not this instrument's. SI 2022/215 commences on
    // 1 April.
    expect(revaluationFor(2022)?.appliedOn)
      .toBe('2022-04-01');
    for (const year of IN_SERVICE_REVALUATION) {
      expect(year.appliedOn.slice(5))
        .toBe(year.yearEnd < 2023 ? '04-01' : '04-06');
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

describe('publishedInflationBetween', () => {
  it('compounds the orders applied inside the window', () => {
    // 6 Apr 2025 (1.7%) and 6 Apr 2026 (3.8%) both fall
    // after a 31/03/2025 statement.
    const {factor} = publishedInflationBetween(
      new Date('2025-03-31T00:00:00Z'),
      new Date('2026-08-17T00:00:00Z'),
    );
    expect(factor).toBeCloseTo(1.017 * 1.038, 10);
  });

  it('takes the uplift DATE, not the scheme year', () => {
    // A statement dated three days after the 2025 order is
    // already revalued: counting the 2025 year again would
    // apply it twice.
    const {factor} = publishedInflationBetween(
      new Date('2025-04-09T00:00:00Z'),
      new Date('2026-01-01T00:00:00Z'),
    );
    expect(factor).toBe(1);
  });

  it('reports how far the record reaches', () => {
    const {publishedTo} = publishedInflationBetween(
      new Date('2025-03-31T00:00:00Z'),
      new Date('2026-08-17T00:00:00Z'),
    );
    // Local parts, not `toISOString`: the orders are built as
    // local dates to match the rest of the library, and under
    // BST a UTC render of local midnight lands the day before.
    expect([
      publishedTo.getFullYear(),
      publishedTo.getMonth() + 1,
      publishedTo.getDate(),
    ]).toEqual([2026, 4, 6]);
  });

  it('is inert over a window with no order in it', () => {
    const from = new Date('2026-05-01T00:00:00Z');
    const {factor, publishedTo} = publishedInflationBetween(
      from, new Date('2026-08-17T00:00:00Z'),
    );
    expect(factor).toBe(1);
    expect(publishedTo).toBe(from);
  });

  it('is a STEP: the days around an order earn nothing', () => {
    // A statement dated 31 March is six days from its first
    // uplift and gains nothing in them; a reader four months
    // past the last April is looking at a figure that has not
    // moved. Both windows below span the SAME two orders, so
    // both must price identically - if the gaps were
    // apportioned they could not.
    const tight = publishedInflationBetween(
      new Date(2025, 3, 5), new Date(2026, 3, 6),
    );
    const loose = publishedInflationBetween(
      new Date(2025, 2, 31), new Date(2026, 7, 18),
    );
    expect(tight.factor).toBe(loose.factor);
  });

  it('prices a past period by record, not by forecast', () => {
    // The defect this exists to stop. A statement figure
    // restated in today's money at an assumed 2% reported a
    // FORECAST as history; measured against a real
    // 31/03/2025 statement the two rulers differ by ~2.7%,
    // and every projected figure inherits it.
    const {factor} = publishedInflationBetween(
      new Date('2025-03-31T00:00:00Z'),
      new Date('2026-08-17T00:00:00Z'),
    );
    const assumed = Math.pow(1.02, 1.38);
    expect(factor).toBeGreaterThan(assumed);
  });
});
