/**
 * The balance-forward ledger.
 *
 * Synthetic pay throughout; no figure from any member's
 * statement appears here. The published rates come from the
 * eleven Revaluation Orders in `revaluation.ts`.
 */

import {describe, expect, it} from 'vitest';
import {buildLedger} from '../src/pension/ledger.js';
import {createPrices} from '../src/pension/prices.js';
import {
  schemeYearEndDate,
  seedFromJoinDate,
  seedFromStatement,
} from '../src/pension/seed.js';

const TODAY = new Date(2026, 7, 19);
const prices = createPrices(0.02, TODAY);
const SALARY = 54_000;

/** Active throughout, retiring far enough out to stay clear.
 * The CPI assumption is a parameter because "flat" is a claim
 * only today's money can make: at 2% a deferred balance still
 * climbs in cash. */
const walk = (
  through: number, exitDate: Date, assumedCpi = 0.02,
) => buildLedger({
  seed: seedFromStatement(1000, new Date(2025, 2, 31)),
  pensionableEarnings: SALARY,
  exitDate,
  retirementDate: new Date(2045, 0, 1),
  prices: assumedCpi === 0.02
    ? prices
    : createPrices(assumedCpi, TODAY),
  drawingFor: () => null,
  through,
});

const payIn = (year: number) =>
  prices.payAt(SALARY, schemeYearEndDate(year));

describe('the recurrence', () => {
  it('revalues the pot, THEN adds the year\'s slice', () => {
    // The order the statement reconciliation settled. It is the
    // single invariant the rewrite could not lose: the other
    // order credits every slice with a year of revaluation it
    // has not yet earned, and overstated a real statement by
    // 3.2% while every internal test still passed.
    const [y2026] = walk(2026, new Date(2040, 0, 1)).years;
    // Order 2025: September CPI 1.7 + 1.5 = 3.2%.
    const revalueThenAdd = 1000 * 1.032 + payIn(2026) / 54;
    expect(y2026.closing).toBeCloseTo(revalueThenAdd, 9);

    // Name the rejected order explicitly, so a regression has
    // to disagree with a number that is written down.
    const addThenRevalue = (1000 + payIn(2026) / 54) * 1.032;
    expect(y2026.closing).not.toBeCloseTo(addThenRevalue, 6);
  });

  it('carries each closing balance into the next opening', () => {
    const rows = walk(2027, new Date(2040, 0, 1)).years;
    expect(rows).toHaveLength(2);
    expect(rows[1].opening).toBe(rows[0].closing);
    expect(rows[1].revalued).toBeCloseTo(
      rows[0].closing * (1 + rows[1].uplift!.percent / 100), 9,
    );
  });

  it('stops reading Orders once a slice has been guessed', () => {
    // The member is still accruing, so the 2026 slice is this
    // library's estimate the moment it lands. Order 2026 (CPI
    // 3.8 + 1.5 = 5.3%) would then multiply a balance already
    // containing that guess, so the assumption stands in.
    //
    // The 2025 Order is a different case and is still used: it
    // acts on the statement figure itself, which is the
    // scheme's own and checkable against paper.
    const rows = walk(2027, new Date(2040, 0, 1)).years;
    expect(rows[0].uplift?.percent).toBeCloseTo(3.2, 9);
    expect(rows[0].uplift?.from.si).toBe('SI 2025/252');
    expect(rows[1].uplift?.percent).toBeCloseTo(3.5, 9);
    expect(rows[1].uplift?.from.si).toBeNull();
  });

  it('gives a leaver the same one Order, and no more', () => {
    /* Nothing is added after the statement, so this balance
       stays fully known for as long as the Orders reach — and
       they are still not used beyond the first.

       An Order is a CASH uplift. Carrying cash uplifts through
       a window the ruler declines to deflate makes a deferred
       pension appear to GROW in today's money, which is the one
       thing every reader knows it does not do: a member who
       left in 2025 read £3,660 against a statement saying
       £3,417, with nothing having happened in between.

       2026 is the DEFERRED rate: CPI floored at zero, with no
       1.5 added. Sch 9 para 3 would give this member the
       in-service 3.2% — they served their whole final scheme
       year — and the library deliberately does not (see
       `rowFor`). The Order is still cited; only its rate
       column changes. */
    const rows = walk(2027, new Date(2025, 2, 31)).years;
    expect(rows[0].phase).toBe('deferred');
    expect(rows[0].uplift?.percent).toBeCloseTo(1.7, 9);
    expect(rows[0].uplift?.from.si).toBe('SI 2025/252');
    expect(rows[1].uplift?.from.si).toBeNull();
    expect(rows[1].uplift?.percent).toBeCloseTo(2, 9);
  });

  it('opens year N with the Order labelled N−1', () => {
    // SI 2016/438, applied 1 April 2016, opens the year ending
    // 31 March 2017. The off-by-one is the scheme's.
    const rows = walk(2026, new Date(2040, 0, 1)).years;
    expect(rows[0].uplift?.from.schemeYearEnd).toBe(2025);
    expect(rows[0].uplift?.from.si).toBe('SI 2025/252');
  });
});

describe('phases and their rules', () => {
  it('switches to the floored rule once deferred', () => {
    // Exit in 2026; 2028 is squarely deferred, so its uplift is
    // CPI itself with no 1.5 added.
    const rows = walk(2028, new Date(2026, 2, 31)).years;
    const deferred = rows.find((r) => r.schemeYearEnd === 2028);
    expect(deferred?.phase).toBe('deferred');
    // Beyond the published table, so the assumption: 2.0%.
    expect(deferred?.uplift?.percent).toBeCloseTo(2, 9);
    expect(deferred?.uplift?.from.si).toBeNull();
    expect(deferred?.pensionableEarnings).toBeNull();
    expect(deferred?.earned).toBe(0);
  });

  it('gives a leaver the deferred rate, never a blend', () => {
    // Leaves 31 October 2026, seven complete months into the
    // scheme year that opened on 1 April 2026. Sch 9 para 3
    // would pro-rate those seven months at the in-service rate;
    // this library does not (see `rowFor`), so the uplift that
    // opens 2028 is the plain deferred one.
    const rows = walk(2028, new Date(2026, 9, 31)).years;
    const after = rows.find((r) => r.schemeYearEnd === 2028);
    // Beyond the published table, so the assumption: 2.0%, with
    // no 1.5 added and nothing apportioned.
    expect(after?.uplift?.percent).toBeCloseTo(2, 9);
    expect(after?.uplift?.from.si).toBeNull();
  });

  it('holds a full-year leaver flat in today\'s money', () => {
    // The case the calculator draws, and the reason for the
    // simplification: leaving on a 31 March must not lift the
    // balance above the closing figure that year end reports.
    const rows = walk(2030, new Date(2027, 2, 31), 0).years;
    const closing = rows.find(
      (r) => r.schemeYearEnd === 2027,
    )?.closing ?? 0;
    expect(closing).toBeGreaterThan(0);
    for (const year of rows.filter((r) => r.schemeYearEnd > 2027)) {
      expect(year.uplift?.percent).toBe(0);
      expect(year.closing).toBeCloseTo(closing, 9);
    }
  });

  it('credits the WHOLE year you leave in, whatever the day',
    () => {
      // An exit date names a scheme year; the member is active
      // for all of it. Leaving on 31 October 2026 is seven
      // complete months of the year that opened on 1 April
      // 2026, and it earns the same slice as leaving on the
      // following 31 March.
      //
      // The simplification exists so that the year you RETIRE
      // in behaves like every other year you might leave in —
      // see `rowFor`. The whole day range has to agree, so it
      // is asserted over the range rather than at one date.
      for (const day of [
        new Date(2026, 3, 1), new Date(2026, 9, 31),
        new Date(2027, 0, 1), new Date(2027, 2, 31),
      ]) {
        const rows = walk(2027, day).years;
        const exitYear = rows.find((r) => r.schemeYearEnd === 2027);
        expect(exitYear?.pensionableEarnings, `${day}`)
          .toBeCloseTo(payIn(2027), 9);
        expect(exitYear?.earned, `${day}`)
          .toBeCloseTo(payIn(2027) / 54, 9);
      }
    });

  it('still scales the year you JOIN in, and only the pay',
    () => {
      // The one partial year left, and it is not the same
      // shape: there is one join and it is handled one way. A
      // member joining on 1 October 2024 works six complete
      // months of the year ending 31 March 2025, and their own
      // statement says so. The 1/54 divisor is untouched.
      const ledger = buildLedger({
        seed: seedFromJoinDate(new Date(2024, 9, 1)),
        pensionableEarnings: SALARY,
        exitDate: new Date(2040, 0, 1),
        retirementDate: new Date(2045, 0, 1),
        prices,
        drawingFor: () => null,
        through: 2025,
      });
      const [joinYear] = ledger.years;
      expect(joinYear.schemeYearEnd).toBe(2025);
      expect(joinYear.pensionableEarnings)
        .toBeCloseTo((payIn(2025) * 6) / 12, 9);
      expect(joinYear.earned)
        .toBeCloseTo((payIn(2025) * 6) / 12 / 54, 9);
    });
});

describe('the seed is the only input-shaped difference', () => {
  it('starts a join-date walk at zero with no uplift', () => {
    const ledger = buildLedger({
      seed: seedFromJoinDate(new Date(2024, 9, 1)),
      pensionableEarnings: SALARY,
      exitDate: new Date(2040, 0, 1),
      retirementDate: new Date(2045, 0, 1),
      prices,
      drawingFor: () => null,
      through: 2025,
    });
    const [firstYear] = ledger.years;
    expect(firstYear.schemeYearEnd).toBe(2025);
    expect(firstYear.opening).toBe(0);
    expect(firstYear.uplift).toBeNull();
    // Joined 1 October: six months of that scheme year.
    expect(firstYear.pensionableEarnings)
      .toBeCloseTo((payIn(2025) * 6) / 12, 9);
  });

  it('rejects a statement date that is not a year end', () => {
    expect(() => seedFromStatement(1000, new Date(2025, 5, 30)))
      .toThrow();
  });
});

describe('the ledger is a read model', () => {
  it('freezes every row against rewriting history', () => {
    const [row] = walk(2026, new Date(2040, 0, 1)).years;
    expect(() => {
      (row as {closing: number}).closing = 99;
    }).toThrow();
  });

  it('holds the balance flat between steps', () => {
    const ledger = walk(2027, new Date(2040, 0, 1));
    const june = ledger.atDate(new Date(2026, 5, 1));
    const july = ledger.atDate(new Date(2026, 6, 1));
    expect(june).toBe(july);
  });
});

describe('a row says whether its earnings are known', () => {
  it('marks an accruing year as assumed, not published', () => {
    // The trap: the Order that opened the year IS published, so
    // it is tempting to call the row known. The closing balance
    // is opening x (1 + uplift) + earned, and `earned` comes
    // from the one pay figure the caller gave. Two axes.
    const [row] = walk(2026, new Date(2040, 0, 1)).years;
    expect(row.uplift?.from.si).toBe('SI 2025/252');
    expect(row.earningsBasis).toBe('assumed');
  });

  it('has nothing to guess once the member has left', () => {
    const rows = walk(2028, new Date(2026, 2, 31)).years;
    const deferred = rows.find((r) => r.schemeYearEnd === 2028);
    expect(deferred?.earned).toBe(0);
    expect(deferred?.earningsBasis).toBe('none');
  });
});

describe('the base case: pay held flat in today\'s money', () => {
  // The assumption the consumer's own painted door states back
  // to the reader — "pay is held flat in today's money" — and
  // therefore the one the library must not quietly improve on.
  // Pay progression is an unbuilt feature; anything that makes a
  // slice differ from pay/54 in today's money is that feature
  // arriving by accident.
  //
  // It arrived once: quoting pay at the statement date and
  // holding it flat in REAL terms from there handed the member a
  // 5.6% real pay rise. This is the assertion that catches it.
  it('gives every year the same slice, to the penny', () => {
    // Read off the TODAY'S-MONEY walk, where it is directly
    // visible rather than recovered through a deflator: at a
    // zero assumption the conversion is the identity, so a
    // year's slice either IS pay / 54 or the base case has
    // been lost.
    const todays = createPrices(0, TODAY);
    const rows = buildLedger({
      seed: seedFromStatement(1000, new Date(2025, 2, 31)),
      pensionableEarnings: SALARY,
      exitDate: new Date(2040, 0, 1),
      retirementDate: new Date(2045, 0, 1),
      prices: todays,
      drawingFor: () => null,
      through: 2032,
    }).years.filter((row) => row.pensionableEarnings !== null);
    expect(rows.length).toBeGreaterThan(5);
    for (const row of rows) {
      expect(row.earned).toBeCloseTo(SALARY / 54, 9);
    }
  });

  it('tracks the assumption in cash, exactly and only', () => {
    // The cash walk expresses that same flat pay in each
    // year's own money, so its slice DOES move with the
    // assumption — by the conversion and by nothing else.
    // Anything left over is pay progression, an unbuilt
    // feature, arriving by accident.
    const sliceUnder = (assumedCpi: number) => {
      const p = createPrices(assumedCpi, TODAY);
      const row = buildLedger({
        seed: seedFromStatement(1000, new Date(2025, 2, 31)),
        pensionableEarnings: SALARY,
        exitDate: new Date(2040, 0, 1),
        retirementDate: new Date(2045, 0, 1),
        prices: p,
        drawingFor: () => null,
        through: 2030,
      }).years[3];
      const end = schemeYearEndDate(row.schemeYearEnd);
      return {earned: row.earned, expected: p.payAt(SALARY, end) / 54};
    };
    for (const cpi of [0, 0.01, 0.05]) {
      const {earned, expected} = sliceUnder(cpi);
      expect(earned).toBeCloseTo(expected, 9);
    }
    expect(sliceUnder(0).earned).toBeCloseTo(SALARY / 54, 9);
  });
});
