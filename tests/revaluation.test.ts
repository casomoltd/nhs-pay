import {describe, expect, it} from 'vitest';
import {
  ACTIVE_REVAL_BONUS_PCT,
  IN_SERVICE_REVALUATION,
  revaluationFor,
} from '../src/revaluation.js';
import {activeRatePct} from '../src/pension/uplift.js';
import {yearlyAccrual} from '../src/pension-projection.js';
import {parseCsv} from './helpers.js';

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
  it('runs unbroken from the scheme\'s first revaluation', () => {
    // A HOLE IN THE MIDDLE IS THE DANGEROUS SHAPE, and until this
    // ran nothing caught it. A reader walking this table by year
    // cannot tell a missing row from a real one: `appliedOnFor`
    // synthesises 6 April for a year it does not hold, which is
    // wrong for any year up to 2022 — wrong-number-no-noise.
    //
    // The 2015 Scheme opened 1 April 2015, so the first uplift
    // was applied in April 2016 and every year since has one.
    const years = IN_SERVICE_REVALUATION.map((y) => y.yearEnd);
    expect(years[0]).toBe(2016);
    expect(years).toEqual(
      years.map((_, i) => 2016 + i),
    );
  });

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
    // 2022 is the row to get wrong: 11 April is the date the
    // Pensions Increase Order took effect that year, a
    // different instrument, and it is the figure a search
    // turns up. SI 2022/215 commences on 1 April, and that is
    // when this scheme's pot moves.
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

/**
 * The rows, against the Orders that made them.
 *
 * The block above checks this table against ITSELF: `ratePct`
 * against `septemberCpiPct + 1.5`, and `appliedOn`'s month-day
 * against the very rule the rows were typed under. Both columns
 * were transcribed into one file by one hand, so a whole table
 * read off the WRONG document — the Pensions Increase orders,
 * say, which floor a negative CPI and landed on 11 April in
 * 2022 — passes every one of them.
 *
 * So the figures are pinned to a fixture transcribed from each
 * Order's own operative words, code-vs-source in the pattern
 * `gad-*.csv` and `scale-fixture.test.ts` use. `source` quotes
 * the words a human can check one row at a time.
 *
 * **2016–2021, and the window is not arbitrary.** These are the
 * six rows added with no fixture behind them, and they are also
 * the years an Order settles alone: through 2022 the NHS applied
 * its uplift on the Order's own commencement date. From 2023 the
 * scheme moved application to 6 April while the Orders still
 * commence on 1 April, so `appliedOn` there is a scheme fact
 * rather than an Order one and those rows need their own source
 * — see the header, and docs/source-archive.md (SA-33, SA-39,
 * SA-40).
 *
 * The Orders are cited by SI number and not archived, which is
 * this library's standing convention for them: legislation.gov.uk
 * resolves an SI number without a link from here.
 *
 * `ratePct` is deliberately NOT a column. Restating it beside
 * the prices figure would rebuild the tautology inside the
 * fixture; instead the rule is applied FORWARD to the Order's
 * own figure, which is the direction the module header demands.
 */
interface OrderRow {
  schemeYearEnd: string;
  pricesChangePct: string;
  appliedOn: string;
  si: string;
  source: string;
}

const orders = parseCsv<OrderRow>('revaluation-orders.csv');

describe('the Treasury Orders behind 2016–2021', () => {
  it('pins the six rows that had no fixture', () => {
    // Named here so that widening the fixture is a deliberate
    // edit rather than a silent one, and so a dropped row fails
    // instead of shrinking the sweep below to nothing.
    expect(orders.map((r) => Number(r.schemeYearEnd)))
      .toEqual([2016, 2017, 2018, 2019, 2020, 2021]);
  });

  it.each(orders)('$schemeYearEnd — $si', (row) => {
    const year = revaluationFor(Number(row.schemeYearEnd));
    expect(year).not.toBeNull();
    // The prices figure, the day the pot moves, and the
    // instrument that made it — each off the Order itself.
    expect(year?.septemberCpiPct)
      .toBe(Number(row.pricesChangePct));
    expect(year?.appliedOn).toBe(row.appliedOn);
    expect(year?.si).toBe(row.si);
    // And the applied rate as the RULE over that external
    // figure, never as a second column typed beside it.
    expect(year?.ratePct).toBeCloseTo(
      activeRatePct(Number(row.pricesChangePct)), 10,
    );
  });

  it('every row cites the words it was read from', () => {
    for (const row of orders) {
      // The operative words themselves, and the instrument's own
      // title. 2016 is the odd one — it is the "(Prices) Order",
      // and later years drop the qualifier — so the title is
      // matched up to that point and no further.
      expect(row.source).toContain('per cent');
      expect(row.source)
        .toContain('Public Service Pensions Revaluation');
    }
  });
});
