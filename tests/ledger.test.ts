/**
 * The balance-forward ledger.
 *
 * Synthetic pay throughout; no figure from any member's
 * statement appears here. No published rate either: a
 * projection revalues at the caller's assumption on every row,
 * so the rates below are that assumption and nothing else.
 */

import {describe, expect, it} from 'vitest';
import {buildLedger} from '../src/pension/ledger.js';
import type {LedgerYear} from '../src/pension/ledger.js';
import {createPrices} from '../src/pension/prices.js';
import {
  factorProvenance,
  yearlyAccrual,
} from '../src/pension-projection.js';
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
    // The assumption, at the active rate: 2.0 + 1.5 = 3.5%. The
    // 2025 Order legislated 3.2% for this very year and does not
    // appear, which is the rule the sweep below states.
    const revalueThenAdd = 1000 * 1.035 + payIn(2026) / 54;
    expect(y2026.closing).toBeCloseTo(revalueThenAdd, 9);

    // Name the rejected order explicitly, so a regression has
    // to disagree with a number that is written down.
    const addThenRevalue = (1000 + payIn(2026) / 54) * 1.035;
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

  it('reads no published rate, on any row of any walk', () => {
    /* THE rule, held as a property rather than a fixture. Every
       uplift after the seed is the caller's assumption: for a
       year the table plainly covers as readily as one it does
       not, for the row acting on a member's own stated figure as
       readily as one built on a guessed slice, and for a leaver
       as readily as someone still paying in.

       An Order is a NOMINAL rate, and today's money is this same
       model at an assumption of zero. One applied inside that
       run puts a whole year of CPI into a reading defined to
       hold none, sized by whichever September CPI attached to
       the statement the member happened to type in.

       Swept, not sampled. The exception a reader is tempted to
       carve out is a SINGLE row — the one acting on the stated
       figure, which looks checkable and is not — so a fixture
       aimed at any other row would never see it come back.

       The application DATE is the table's: 1 April through 2022,
       6 April after. When the pot moves is a different question
       from what it moves by. */
    const THROUGH = 2040;
    /** Every year a statement might close on, from the scheme's
     * first uplift to the last one published. */
    const STATED_YEARS = Array.from(
      {length: 2026 - 2016 + 1}, (_, i) => 2016 + i,
    );
    /** Three exits per seed: leaving the moment the statement
     * closes, leaving mid-year later on, and still paying in at
     * the end of the walk. */
    const exitsFor = (stated: number) => [
      new Date(stated, 2, 31),
      new Date(2030, 9, 31),
      new Date(2040, 0, 1),
    ];

    const phases = new Set<string>();
    let rows = 0;
    for (const stated of STATED_YEARS) {
      for (const exitDate of exitsFor(stated)) {
        const ledger = buildLedger({
          seed: seedFromStatement(1000, new Date(stated, 2, 31)),
          pensionableEarnings: SALARY,
          exitDate,
          retirementDate: new Date(2035, 0, 1),
          prices,
          drawingFor: () => null,
          through: THROUGH,
        });
        for (const row of ledger.years) {
          const where = `stated ${stated}, exit `
            + `${exitDate.getFullYear()}, year ${row.schemeYearEnd}`;
          expect(row.uplift, where).not.toBeNull();
          expect(row.uplift?.from.si, where).toBeNull();
          /* The RATE as well as the label, because either can be
             right while the other is the Order's. A reader
             handing back the table's September CPI for a
             published year while still calling the figure
             unsourced leaves `si` null on every row here and
             passes — and gives a member with a 2024 statement
             8.2% on their first step, which is the whole defect
             this sweep exists to stop.

             2.0% is the caller's assumption, with the scheme's
             1.5 points added while they are paying in. */
          expect(row.uplift?.percent, where)
            .toBeCloseTo(row.phase === 'active' ? 3.5 : 2, 9);
          phases.add(row.phase);
          rows += 1;
        }
      }
    }
    // The sweep covered the ground it claims to: a silently
    // short loop would otherwise pass for the wrong reason.
    expect(phases).toEqual(
      new Set(['active', 'deferred', 'inPayment']),
    );
    /* The sweep's size, counted from its own shape rather than
       typed as a floor: a walk seeded at 31 March `stated` opens
       at `stated + 1` and runs to THROUGH, so it holds
       `THROUGH - stated` rows, and every seed is walked against
       every exit. Σ(2040 − stated) × 3 = 627, pinned both ways
       so neither a short walk nor a trimmed sweep can pass. */
    const expectedRows = STATED_YEARS.reduce(
      (total, stated) =>
        total + (THROUGH - stated) * exitsFor(stated).length,
      0,
    );
    expect(expectedRows).toBe(627);
    expect(rows).toBe(expectedRows);

    // And the estimation route, which has no stated figure for
    // an Order to act on at all. Its first row carries no
    // uplift; every row after is the assumption like the rest.
    const fromJoin = buildLedger({
      seed: seedFromJoinDate(new Date(2016, 3, 1)),
      pensionableEarnings: SALARY,
      exitDate: new Date(2030, 9, 31),
      retirementDate: new Date(2035, 0, 1),
      prices,
      drawingFor: () => null,
      through: 2040,
    }).years;
    expect(fromJoin[0].uplift).toBeNull();
    for (const row of fromJoin.slice(1)) {
      expect(row.uplift?.from.si, `join, year ${row.schemeYearEnd}`)
        .toBeNull();
    }
  });

  it('opens year N with the rate labelled N−1', () => {
    // SI 2016/438, applied 1 April 2016, opens the year ending
    // 31 March 2017. The off-by-one is the scheme's, and it is
    // independent of where the rate comes from: an entry is
    // labelled by the year that just closed, and the pot moves
    // on that year's own April — the 6th from 2023, read off the
    // table rather than assumed.
    const rows = walk(2026, new Date(2040, 0, 1)).years;
    expect(rows[0].uplift?.from.schemeYearEnd).toBe(2025);
    expect(rows[0].uplift?.appliedOn).toEqual(new Date(2025, 3, 6));
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
  /* Every level, not just the row.
   *
   * The contract is "rebuilt from source on every call, never
   * stored, every row frozen" — and a freeze one level short is
   * the shape that reads as kept and is not. `row.uplift.from`
   * is the case: a `CpiEntry` is the provenance a rate is READ
   * from, so a caller holding a row holds the source figure
   * itself, and `row.uplift.from.cpi = 99` used to succeed in
   * silence while the assertion beside it passed.
   *
   * Enumerated rather than sampled, because one assertion on
   * one field is exactly what missed it. */
  const withDrawing = () => buildLedger({
    seed: seedFromStatement(1000, new Date(2025, 2, 31)),
    pensionableEarnings: SALARY,
    exitDate: new Date(2030, 0, 1),
    retirementDate: new Date(2030, 0, 1),
    prices,
    drawingFor: () => ({
      on: new Date(2030, 0, 1),
      factor: 0.9,
      kind: 'erf',
      provenance: factorProvenance('erf'),
    }),
    through: 2031,
  });

  it('freezes every row against rewriting history', () => {
    const ledger = walk(2027, new Date(2040, 0, 1));
    const row = ledger.years[1];
    expect(row.uplift).not.toBeNull();
    const writes: ReadonlyArray<[string, () => void]> = [
      ['the reader', () => {
        (ledger as {years: unknown}).years = [];
      }],
      ['the row list', () => {
        (ledger.years as LedgerYear[]).push(row);
      }],
      ['a row', () => {
        (row as {closing: number}).closing = 99;
      }],
      ['its uplift', () => {
        (row.uplift as {percent: number}).percent = 99;
      }],
      ['the CPI entry the rate was read from', () => {
        (row.uplift as {from: {cpi: number}}).from.cpi = 99;
      }],
    ];
    for (const [what, write] of writes) {
      expect(write, what).toThrow();
    }
  });

  it('freezes the drawing and the citation it carries', () => {
    // The provenance object is the FACTOR TABLE'S own, shared by
    // every projection in the process — so a write through one
    // member's row would restate everyone else's source.
    const drawn = withDrawing().years.find(
      (r) => r.drawing !== null,
    )?.drawing;
    expect(drawn).toBeDefined();
    expect(() => {
      (drawn as {factor: number}).factor = 99;
    }).toThrow();
    expect(() => {
      (drawn as {provenance: {issued: string}})
        .provenance.issued = '1999-01-01';
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
  it('marks an accruing year\'s earnings as assumed', () => {
    // `earningsBasis` is the only knownness a projected row
    // carries: the rate on every row is the caller's assumption,
    // so `uplift.from.si` says nothing about any of them. The
    // pay is the one term that could still have come from the
    // scheme, and it never does — the library has no route to a
    // member's year-by-year earnings, only the single figure
    // they gave.
    const [row] = walk(2026, new Date(2040, 0, 1)).years;
    expect(row.uplift?.from.si).toBeNull();
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
  // The way in is quoting pay at the statement date and holding
  // it flat in REAL terms from there, which hands the member a
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

  it('reads its slice off the exported accrual rate', () => {
    // ONE CONSTANT, TWO PUBLIC READERS. `yearlyAccrual` and a
    // row's own `earned` are the two ways a consumer reaches
    // 1/54; while the walk divided by a bare 54 they were two
    // sources for one scheme figure and nothing said so.
    // Exact, because both are the same multiplication.
    const [row] = walk(2026, new Date(2040, 0, 1)).years;
    expect(row.pensionableEarnings).not.toBeNull();
    expect(row.earned)
      .toBe(yearlyAccrual(row.pensionableEarnings ?? 0));
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
