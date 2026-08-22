/**
 * The golden reference: a real Annual Benefit Statement.
 *
 * The tool exists to reproduce a member's own statement. If it
 * cannot, nothing else about it matters — someone with sense
 * checks it against their paperwork first, and a page whose
 * pitch is that it shows its sources fails that check loudly.
 *
 * Sources, both redacted of anything identifying, and both in
 * the archive — see `docs/source-archive.md` for where they
 * live:
 *
 * "Annual Benefit Statement, 2015 Section, redacted" — 2015
 * Section, updated to 31/03/2025. The accrued pension and
 * pensionable earnings below are read off it.
 *
 * A ten-year projection built BY HAND from that statement in a
 * spreadsheet, row by row, before any of this code existed,
 * listed with it in the archive.
 *
 * The hand-built sheet is the oracle precisely because it was
 * NOT derived from this implementation. A fixture whose expected
 * values came from the same reasoning as the code would agree
 * with whatever the code was changed to — the trap
 * `revaluation.ts` names about back-computing CPI from the rate.
 *
 * ── What the sheet assumes, and why it matches ──────
 *
 * Pay held flat and the pension growing 1.5% a year, both in
 * today's money. That is this library run with an inflation
 * assumption of ZERO, and at zero the two agree on every row to
 * within the sheet's own rounding.
 *
 * Its cells are the document's own, transcribed. Its FIRST step
 * is the single thing adjusted, and it is adjusted in code
 * rather than by hand — see `sheetAt`. As built that step took
 * the published April 2025 Order; a projection reads no
 * published rate, so it takes the same 1.5% as every step after
 * it.
 *
 * They part company at a non-zero assumption, by a knowable
 * amount: the scheme ADDS 1.5 percentage points to CPI, so at
 * 2% CPI the pension grows 3.5% in cash against prices growing
 * 2%, and 1.035 / 1.02 is 1.47% in real terms — not 1.5%. The
 * 1.5 points are eroded by the same year's inflation because
 * they are added before the growth, not after. A flat 1.5% real
 * is the CPI→0 limit of the scheme's own rule, not a different
 * reading of it.
 */

import {describe, expect, it} from 'vitest';
import {projectPension} from '../src/pension-projection.js';
import type {PensionStatementInput} from '../src/pension-projection.js';

/** Read off the statement named above. */
const STATED_PENSION = 3417.21;
const STATEMENT_DATE = new Date(2025, 2, 31);
const PENSIONABLE_PAY = 50_901.19;

/** Well inside the published window and after the April the
 * ruler anchors on, so the walk has a full year behind it. */
const TODAY = new Date(2026, 7, 19);

/** The member joined the 2015 scheme in April 2021, so their
 * statement covers exactly four whole scheme years. */
const JOIN = new Date(2021, 3, 1);

const member = (assumedCpi: number): PensionStatementInput => ({
  kind: 'statement',
  accruedPension: STATED_PENSION,
  statementDate: STATEMENT_DATE,
  currentSalary: PENSIONABLE_PAY,
  dateOfBirth: new Date(1983, 0, 1),
  // Accruing throughout the projected window, and retiring at
  // NPA so no ERF or LRF stands between the ledger and the
  // figures under test.
  exitDate: new Date(2051, 0, 1),
  retirementDate: new Date(2051, 0, 1),
  npa: 68,
  joinDate: JOIN,
  assumedCpi,
});

/** The sheet's span: the scheme year the statement closes on,
 * through to the last row a member paying in to 71 reaches. The
 * seed row is the last figure in this file that is a matter of
 * record rather than a projection. */
const SEED_YEAR = 2025;
const LAST_SHEET_YEAR = 2054;

/**
 * The sheet's own cells, TRANSCRIBED. Its recurrence is
 *
 *   balance(y) = balance(y-1) x uplift + 942.61
 *
 * with the published 3.2% on the first step — the April 2025
 * Order, SI 2025/252, acting on the statement figure itself —
 * and a flat 1.5% after, everything in today's money. The slice
 * is £50,901.19 over 54, rounded to the penny the way a
 * spreadsheet cell is.
 *
 * **Only the document's own figures belong here.** The whole
 * value of the oracle is that it CAN disagree with this code:
 * someone built it from the scheme's rule, by hand, before any
 * of this existed. A table computed from the model — or from the
 * model's recurrence worked through on paper and pasted in —
 * agrees with whatever the model is changed to, which is the
 * trap `revaluation.ts` names about back-computing CPI from the
 * rate. Adjust the cells in CODE, as `sheetAt` does, so the
 * adjustment is one reviewable line rather than thirty numbers
 * nobody can re-derive.
 *
 * The document's fingerprint is the check on that, and it is
 * visible: run the recurrence above and 26 of the 29 cells come
 * back to the exact penny while three sit up to 0.7p off it. A
 * program does not produce those three.
 */
const SHEET_AS_BUILT: Readonly<Record<number, number>> = {
  // The statement's own year. It is a row of the sheet like any
  // other and is asserted like any other: the walk must hand it
  // back untouched, not merely start from it.
  2025: 3417.21,
  2026: 4469.17, 2027: 5478.82, 2028: 6503.61, 2029: 7543.77,
  2030: 8599.54, 2031: 9671.14, 2032: 10758.82, 2033: 11862.81,
  2034: 12983.36, 2035: 14120.72, 2036: 15275.15, 2037: 16446.88,
  2038: 17636.20, 2039: 18843.35, 2040: 20068.61, 2041: 21312.25,
  2042: 22574.54, 2043: 23855.77, 2044: 25156.22, 2045: 26476.17,
  2046: 27815.92, 2047: 29175.77, 2048: 30556.02, 2049: 31956.97,
  2050: 33378.93,
  // Age 68, the member's Normal Pension Age, reached the
  // January inside this scheme year. A whole year's slice all
  // the same: the exit names the year, not the day.
  2051: 34822.23,
  // Past NPA. The sheet keeps paying in to 71, so these three
  // rows are only reachable by a member who does the same.
  2052: 36287.17, 2053: 37774.09, 2054: 39283.31,
};

/** Every year the sheet covers, in the sheet's own order, so no
 * loop over it can silently skip one. */
const SHEET_YEARS: readonly number[] =
  Object.keys(SHEET_AS_BUILT).map(Number);

/** The rate the sheet's first step took, and the one rate every
 * step of a projection takes instead. */
const AS_BUILT_FIRST_STEP = 0.032;
const ONE_RATE = 0.015;

/**
 * A sheet cell at the one rate — DERIVED, never transcribed.
 *
 * A projection reads no published Order, so the sheet's opening
 * step takes the same 1.5% as every step after it. In a linear
 * recurrence that substitution is one term: the balance the step
 * acts on is the statement's own figure, so it credits
 * `3.2 − 1.5` points less of exactly that figure, and the sheet
 * carries the difference forward at its own 1.5% thereafter.
 *
 * The seed row is untouched, because no step has acted on it
 * yet — it is the member's own number and the walk must hand it
 * straight back.
 *
 * Decided at https://github.com/casomoltd/nhs-pay/issues/13
 */
const sheetAt = (year: number): number =>
  year <= SEED_YEAR
    ? SHEET_AS_BUILT[year]
    : SHEET_AS_BUILT[year]
      - STATED_PENSION * (AS_BUILT_FIRST_STEP - ONE_RATE)
        * (1 + ONE_RATE) ** (year - SEED_YEAR - 1);

/** The last row a member retiring at their NPA reaches. */
const NPA_YEAR = 2051;

/** The slice the sheet credits: £50,901.19 over 54, rounded down
 * to the penny. The model credits the quotient itself. */
const SHEET_SLICE = 942.61;

/** One cell's own rounding, in pounds. A penny, which also
 * covers the three cells sitting up to 0.7p off the sheet's own
 * chain. */
const A_CELL = 0.01;

/**
 * How far a row may sit from the sheet, and what is doing the
 * sitting. The residual is the SHEET's rounding, not the
 * model's, and it is exactly two terms:
 *
 *   - the sheet's slice is 0.46p short of £50,901.19 / 54, every
 *     year, and the sheet compounds that shortfall at its own
 *     1.5%. This is the whole trend — 16.7p of the 16.8p seen at
 *     the last row — and the reason the gap grows with the year
 *     rather than with the balance.
 *   - each cell is written to the penny.
 *
 * Nothing else is admitted, and the slack is not permission. The
 * errors this file exists to catch are orders of magnitude
 * bigger than it: the deflator argument was worth 0.03%, which
 * is £12 at the last row against 18p here; the final-year uplift
 * 1.5%, or £588; the retirement pro-rata 0.7%.
 */
const tolerance = (year: number): number =>
  A_CELL + (PENSIONABLE_PAY / 54 - SHEET_SLICE)
    * (((1 + ONE_RATE) ** (year - SEED_YEAR) - 1) / ONE_RATE);

/** One model figure against one sheet row, with the failure
 * named: which year, what was read, what the sheet says. */
const expectSheet = (
  got: number, year: number, label = '',
): void => {
  const expected = sheetAt(year);
  expect(
    Math.abs(got - expected),
    `${label}${year}: got ${got.toFixed(2)}, `
      + `sheet ${expected.toFixed(2)}`,
  ).toBeLessThan(tolerance(year));
};

describe('the statement is reproduced, not restated', () => {
  it('hands back the stated pension for its own date', () => {
    // THE acceptance test, and the reason this file exists. A
    // member enters their statement, asks what they had on its
    // date, and is told exactly what the statement says — in
    // BOTH rulers, because the default view must not quietly
    // convert a figure the member can read off paper.
    //
    // It failed here once, by £134: the stated balance was
    // deflated across the months since it was printed, which
    // is a purchasing-power conversion applied to a record.
    const r = projectPension(member(0.02), TODAY);
    expect(r.ledger.atDate(STATEMENT_DATE))
      .toBeCloseTo(STATED_PENSION, 9);
    expect(r.todaysMoneyLedger.atDate(STATEMENT_DATE))
      .toBeCloseTo(STATED_PENSION, 9);
    expect(r.ledger.closingAt(2025)).toBeCloseTo(STATED_PENSION, 9);
  });

  it('declines every Order, the one on the stated figure'
    + ' included', () => {
    /* April 2025, SI 2025/252, legislated 3.2% for the very year
       that opens this walk, and it is not used. Nor is April
       2026's SI 2026/254 for the year after. Both steps take the
       caller's assumption: 2.0 + 1.5 = 3.5%.

       The first of those is the tempting one, and this member
       is why it is declined too. An Order is a NOMINAL rate; the
       today's-money reading is this same model at an assumption
       of zero, so applying one there would credit a member
       holding a 2025 statement with 3.2% of a thing that run is
       defined to exclude — 8.2% had they held a 2024 one.
       Nothing about the member decides the size of it.

       The exactness was not collectable anyway. The year-end
       figure the Order produces here also carries this library's
       guess at 2025/26 pay, and the statement covering that year
       is not issued until months after the Order lands. */
    const r = projectPension(member(0.02), TODAY);
    const [first, second] = r.ledger.years;
    expect(first.schemeYearEnd).toBe(2026);
    expect(first.uplift?.percent).toBeCloseTo(3.5, 9);
    expect(first.uplift?.from.si).toBeNull();
    expect(first.revalued)
      .toBeCloseTo(STATED_PENSION * 1.035, 9);
    expect(second.schemeYearEnd).toBe(2027);
    expect(second.uplift?.percent).toBeCloseTo(3.5, 9);
    expect(second.uplift?.from.si).toBeNull();
    // The rate explicitly NOT applied, named so a regression has
    // to disagree with a number that is written down.
    expect(first.revalued)
      .not.toBeCloseTo(STATED_PENSION * 1.032, 2);
  });

  it('credits pay / 54 in today\'s money, every year', () => {
    // Pay is held flat in today's money — the base case and the
    // only one built. Anything that makes a year's slice differ
    // from pay / 54 in real terms is the unbuilt pay-progression
    // feature arriving by accident, which it once did, as a
    // 5.6% real pay rise nobody asked for.
    // At a zero assumption today's money and cash are the same
    // ruler, so the invariant is directly readable off the row:
    // every year's pensionable earnings ARE the figure the
    // caller gave, and every slice is that over 54.
    const r = projectPension(member(0), TODAY);
    const rows = r.ledger.earningsRows();
    expect(rows.length).toBeGreaterThan(20);
    const whole = rows.filter((x) => x.schemeYearEnd < 2051);
    for (const row of whole) {
      expect(row.pensionableEarnings)
        .toBeCloseTo(PENSIONABLE_PAY, 9);
      expect(row.earned).toBeCloseTo(PENSIONABLE_PAY / 54, 9);
      expect(row.earningsBasis).toBe('assumed');
    }

    /* INCLUDING the year they retire in, which is the whole
       point of the rule. This member draws on their birthday,
       1 January 2051, nine complete months into scheme year
       2051 — and is credited all twelve, because an exit date
       names a scheme year rather than a day.

       Pro-rating it was defensible on its own and indefensible
       beside the rest: stopping at any 31 March credited a
       whole year, so only the year you RETIRED in was short,
       and nothing on screen said why. It is one £942.61 slice
       on a row of some £34,700. */
    const last = rows[rows.length - 1];
    expect(last.schemeYearEnd).toBe(2051);
    expect(last.pensionableEarnings)
      .toBeCloseTo(PENSIONABLE_PAY, 9);
    expect(last.earned)
      .toBeCloseTo(PENSIONABLE_PAY / 54, 9);
  });
});

describe('the hand-built sheet, row by row', () => {
  /** The same member paying in past their Normal Pension Age,
   * which is what the sheet's last three rows assume. Every
   * earlier row is identical to `member`'s: both are active
   * throughout, and retirement touches only the year it falls
   * in. */
  const stayer = (assumedCpi: number): PensionStatementInput => ({
    ...member(assumedCpi),
    exitDate: new Date(2058, 0, 1),
    retirementDate: new Date(2058, 0, 1),
  });

  /** Every row of the sheet against one walk, named so a
   * failure says which year and by how much. Returns the count
   * checked: a silently empty loop would otherwise pass, and
   * the whole claim here is that ALL of the sheet is covered. */
  const checkSheet = (r: {
    todaysMoneyLedger: {closingAt: (y: number) => number};
  }, label = '') => {
    for (const year of SHEET_YEARS) {
      expectSheet(r.todaysMoneyLedger.closingAt(year), year, label);
    }
    return SHEET_YEARS.length;
  };

  /** 2025 to 2054 — the sheet's own span, seed row included.
   * Counted off the span rather than off the table, so a row
   * dropped from the table has to disagree with it. */
  const SHEET_ROWS = LAST_SHEET_YEAR - SEED_YEAR + 1;

  it('reproduces every row at a zero inflation assumption', () => {
    // The sheet holds pay flat and grows the pension 1.5% a
    // year, both in today's money — which IS this library with
    // the inflation assumption at zero. All thirty rows of it,
    // 2025 to 2054, to within the sheet's own rounding.
    expect(checkSheet(projectPension(stayer(0), TODAY)))
      .toBe(SHEET_ROWS);
  });

  it('drifts from the sheet only the way ROUNDING drifts',
    () => {
      /* The residual is asserted for its SHAPE, not just its
         size, because a modelling error can hide under a
         tolerance and a rounding artefact cannot fake this.

         Every row sits at or above the sheet, never below: the
         sheet's slice is the model's rounded DOWN to the penny,
         so it falls four tenths of a penny short every year and
         never over. The gap is zero at the seed, which is the
         statement's own figure, and closes on 17p thirty rows
         later.

         It does not climb SMOOTHLY, and that is what reading it
         against the DOCUMENT's own cells buys: each is written
         to the penny and three sit up to 0.7p off the sheet's
         own chain, so the drift steps back a little at those
         rows. Hence the two-cell allowance below. A table
         produced by running the model's recurrence reproduces
         that recurrence exactly, so the shape here would be a
         property of the arithmetic rather than evidence about a
         spreadsheet, and this assertion would prove nothing.
         Any real disagreement puts a row on the wrong side of
         zero, or a step of more than two cells in it. */
      const r = projectPension(stayer(0), TODAY);
      let worst = 0;
      for (const year of SHEET_YEARS) {
        const drift = r.todaysMoneyLedger.closingAt(year)
          - sheetAt(year);
        expect(drift, `${year} sits below the sheet`)
          .toBeGreaterThanOrEqual(0);
        // Rounding accumulates; it unwinds only by a cell.
        expect(drift, `${year} drift went backwards`)
          .toBeGreaterThanOrEqual(worst - 2 * A_CELL);
        worst = Math.max(worst, drift);
      }
      expect(worst).toBeLessThan(tolerance(LAST_SHEET_YEAR));
      // The seed is exact: it is the member's own figure.
      expect(r.todaysMoneyLedger.closingAt(SEED_YEAR))
        .toBeCloseTo(sheetAt(SEED_YEAR), 9);
    });

  it('quotes the NPA row as the pension for retiring at NPA',
    () => {
      /* The row the whole simplification is for. This member
         reaches 68 in January 2051 and the scheme year runs to
         31 March 2051; the sheet reports that year end, and so
         does the tool.

         Retiring at NPA exactly, so no factor stands between
         the ledger and the headline — that is what the
         retirement slider snapping to birthdays buys, and it is
         asserted here rather than assumed. */
      const r = projectPension(member(0), TODAY);
      expect(r.factorType).toBeNull();
      expect(r.factor).toBe(1);
      expectSheet(r.annualPension.real, NPA_YEAR);
      expectSheet(
        r.todaysMoneyLedger.closingAt(NPA_YEAR), NPA_YEAR,
      );
      // And the chart's point at 68 is that same figure, so the
      // headline cannot disagree with the picture under it.
      const atNpa = r.curve.find((p) => Math.floor(p.age) === 68);
      expectSheet(atNpa?.real ?? Number.NaN, NPA_YEAR);
    });

  it('reproduces it at EVERY assumption, cash aside', () => {
    /* Today's money does not depend on the inflation
       assumption, because it is the run in which that
       assumption is zero. Set 0%, 2% or 7% and the
       today's-money column is the same sheet.

       This is what settled a long argument about a third of a
       percent. While today's money was this projection divided
       by inflation, the real rate came out as 1.5 / (1 + cpi) —
       1.47% at 2%, drifting with the assumption, never quite
       the sheet. Running the model at zero instead gives 1.5%
       flat and matches to the penny, at any assumption. If this
       ever fails, a deflator has crept back in. */
    for (const cpi of [0, 0.02, 0.07]) {
      expect(
        checkSheet(projectPension(stayer(cpi), TODAY), `cpi ${cpi}, `),
      ).toBe(SHEET_ROWS);
    }

    // Cash is where the assumption lives, and it must move.
    const low = projectPension(stayer(0.01), TODAY);
    const high = projectPension(stayer(0.05), TODAY);
    expect(high.ledger.closingAt(2035))
      .toBeGreaterThan(low.ledger.closingAt(2035));
  });
});

describe('the years before the statement, estimated', () => {
  /**
   * The four rows a member would draw by hand, given the flat
   * pay that reaches their stated balance. Transcribed from
   * David's own working, not from this implementation.
   *
   * `balance` is the closing balance at each 31 March — the
   * "balance before reval" column of that working, since the
   * April uplift that follows a year end belongs to the year
   * after it.
   */
  const BY_HAND: readonly {year: number; balance: number}[] = [
    {year: 2022, balance: 835.32},
    {year: 2023, balance: 1683.17},
    {year: 2024, balance: 2543.74},
    {year: 2025, balance: 3417.21},
  ];
  const IMPLIED_PAY = 45_107.30;

  it('back-solves the flat pay that reaches the statement',
    () => {
      // To the penny of David's own working; the residue is
      // his spreadsheet rounding each cell.
      const r = projectPension(member(0), TODAY);
      expect(r.estimatedHistory?.impliedPay ?? 0)
        .toBeCloseTo(IMPLIED_PAY, 0);

      // The closed form, independently: with whole years and a
      // constant rate, W = 54 P (r - 1) / (r^n - 1). The code
      // does NOT use this — it calibrates by walking the model
      // at a pay of 1 and dividing, because the walk handles a
      // part-year join and a clamped start that the formula
      // does not. So this is a genuine second opinion.
      const rate = 1.015;
      const n = BY_HAND.length;
      const closedForm = 54 * STATED_PENSION * (rate - 1)
        / (Math.pow(rate, n) - 1);
      expect(r.estimatedHistory?.impliedPay)
        .toBeCloseTo(closedForm, 6);
    });

  it('walks the four rows by hand, to the penny', () => {
    const r = projectPension(member(0), TODAY);
    for (const {year, balance} of BY_HAND) {
      const got = r.estimatedHistory?.ledger.closingAt(year);
      expect(got, `${year}`).toBeCloseTo(balance, 1);
    }
  });

  it('lands EXACTLY on the stated balance, not near it', () => {
    // The seam. The estimate runs up to the statement and the
    // projection runs on from it, and if the two disagreed by a
    // penny the chart would step where nothing happened.
    for (const cpi of [0, 0.02, 0.05]) {
      const r = projectPension(member(cpi), TODAY);
      expect(r.estimatedHistory?.ledger.closingAt(2025))
        .toBeCloseTo(STATED_PENSION, 9);
    }
  });

  it('is absent when there is nothing to draw', () => {
    // Joining AFTER the statement's own scheme year leaves no
    // run-up at all. Inventing one would put pension on the
    // chart for years the member was not in the scheme.
    const r = projectPension(
      {...member(0), joinDate: new Date(2025, 6, 1)}, TODAY,
    );
    expect(r.estimatedHistory).toBeNull();
  });

  it('covers a part year when the join falls inside one', () => {
    // Joining in July leaves nine complete months of that
    // scheme year, and the estimate still has to land exactly
    // on the statement. This is the case the closed form does
    // not describe and the walk handles without being asked —
    // the pay scales, the 1/54 never does.
    const r = projectPension(
      {...member(0), joinDate: new Date(2024, 6, 1)}, TODAY,
    );
    expect(r.estimatedHistory?.from).toBe(2025);
    expect(r.estimatedHistory?.to).toBe(2025);
    expect(r.estimatedHistory?.ledger.closingAt(2025))
      .toBeCloseTo(STATED_PENSION, 9);
    // Nine months of pay over 54, so the implied FULL-year pay
    // is a third again more than a whole year would have
    // needed.
    expect(r.estimatedHistory?.impliedPay ?? 0)
      .toBeCloseTo(STATED_PENSION * 54 * 12 / 9, 6);
  });

  /**
   * The check that settles whether any of this is worth
   * drawing, and the reason the raw comparison misleads.
   *
   * The four pensionable-earnings figures below are from the
   * same statement, and they are CASH of their own years: each
   * carries that year's pay award inside it. Averaged raw they
   * come to £40,880, which sits a tenth below the back-solved
   * £45,107 and looks like the estimate overstating.
   *
   * Put them in one money first — the statement date's, using
   * the September CPI series this library already carries — and
   * they average £45,175. The estimate is within 0.2% of a real
   * member's real career average. Nothing in the implementation
   * knew these figures.
   */
  it('matches a real career average, once both are in the'
    + ' same money', () => {
    const cash = [
      {year: 2022, pay: 42_177},
      {year: 2023, pay: 32_954},
      {year: 2024, pay: 37_489},
      {year: 2025, pay: 50_901},
    ] as const;
    // September CPI, re-typed, setting the FOLLOWING April's
    // uplift. Same figures as `revaluation.ts`, typed again so
    // this cannot agree with the table by construction.
    const cpi: Readonly<Record<number, number>> = {
      2022: 3.1, 2023: 10.1, 2024: 6.7,
    };
    const inStatementMoney = ({year, pay}: {year: number; pay: number}) => {
      let factor = 1;
      for (const [set, pct] of Object.entries(cpi)) {
        if (Number(set) >= year) factor *= 1 + pct / 100;
      }
      return pay * factor;
    };

    const rawAverage = cash.reduce((t, r) => t + r.pay, 0)
      / cash.length;
    const realAverage = cash.reduce(
      (t, r) => t + inStatementMoney(r), 0,
    ) / cash.length;
    const implied = projectPension(member(0), TODAY)
      .estimatedHistory?.impliedPay ?? 0;

    // The trap, asserted so it cannot be re-fallen-into: raw
    // cash reads a tenth low.
    expect(rawAverage).toBeLessThan(implied * 0.93);
    // And the like-for-like comparison, which is the finding.
    expect(Math.abs(realAverage / implied - 1)).toBeLessThan(0.002);
  });
});

describe('stopping paying in holds the year-end figure', () => {
  /** The same member, stopping at the 31 March 2027 year end —
   * the age-44 notch on the calculator's exit slider. */
  const leaver = (assumedCpi: number): PensionStatementInput => ({
    ...member(assumedCpi),
    exitDate: new Date(2027, 2, 31),
  });

  it('quotes the exit year\'s closing balance, not the next'
    + ' April\'s', () => {
    /* The number a member reads off the row they just moved,
       and the one this whole file is calibrated to: the sheet's
       "balance before reval" for the year they stop.

       Sch 9 para 3 would give them one more in-service uplift —
       they served all twelve months of 2026-27 — which is this
       row plus 1.5%, and the sheet carries it as its "balance
       after reval" column. The library deliberately reports the
       lower figure (see `rowFor` in `ledger.ts`), because the
       calculator draws this member's curve through that year
       end and a headline 1.5% above the point beneath it is a
       page that fails its own arithmetic. */
    const r = projectPension(leaver(0), TODAY);
    expectSheet(r.todaysMoneyLedger.closingAt(2027), 2027);
    expectSheet(r.accruedAtExit.real, 2027);
    // Retiring at NPA, so no factor stands between the two.
    expectSheet(r.revaluedAtRetirement.real, 2027);
    expectSheet(r.annualPension.real, 2027);
    // The figure explicitly NOT reported, named so a regression
    // has to disagree with a number that is written down.
    expect(r.annualPension.real)
      .not.toBeCloseTo(sheetAt(2027) * 1.015, 1);
  });

  it('is flat in today\'s money for every year after', () => {
    const r = projectPension(leaver(0), TODAY);
    const after = r.todaysMoneyLedger.years.filter(
      (y) => y.schemeYearEnd > 2027,
    );
    expect(after.length).toBeGreaterThan(20);
    for (const year of after) {
      expect(year.uplift?.percent).toBe(0);
      expectSheet(year.closing, 2027, `year ${year.schemeYearEnd}, `);
    }
  });

  it('keeps only CPI in cash terms — the 1.5 stops at the exit',
    () => {
      const r = projectPension(leaver(0.02), TODAY);
      const opening2028 = r.ledger.years.find(
        (y) => y.schemeYearEnd === 2028,
      );
      // 2.0, not 3.5: leaving is the moment the in-service
      // bonus stops, with no credit for the year just served.
      expect(opening2028?.uplift?.percent).toBeCloseTo(2, 9);
    });

  it('agrees with the curve at the age it is drawn', () => {
    // The consistency the calculator's chart depends on: the
    // headline and the point plotted at the same scheme year
    // end are one number, not two.
    const r = projectPension(leaver(0), TODAY);
    const atExit = r.curve.find((p) => Math.floor(p.age) === 44);
    expect(atExit?.real).toBeCloseTo(r.annualPension.real, 9);
  });
});
