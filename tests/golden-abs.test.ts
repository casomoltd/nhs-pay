/**
 * The golden reference: a real Annual Benefit Statement.
 *
 * The tool exists to reproduce a member's own statement. If it
 * cannot, nothing else about it matters — someone with sense
 * checks it against their paperwork first, and a page whose
 * pitch is that it shows its sources fails that check loudly.
 *
 * Sources, both redacted of anything identifying:
 *
 * NHS Annual Benefit Statement, 2015 Section, updated to
 * 31/03/2025 — the accrued pension and pensionable earnings
 * below are read off it.
 *   https://drive.google.com/file/d/1UJ8FIXC-6JbLOHIHZ3fbvqBLyTG-noL3/view
 *
 * A ten-year projection built BY HAND from that statement in a
 * spreadsheet, row by row, before any of this code existed.
 *   https://docs.google.com/spreadsheets/d/1S6CamxFiVqVDsy9rrSd2Lwke38y1N3Pu4x7fhZHoRkA/edit
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
 * assumption of ZERO, and at zero the two agree to the penny on
 * every row.
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

/**
 * The sheet's own rows, transcribed. Its recurrence is
 *
 *   balance(y) = balance(y-1) x uplift + pay / 54
 *
 * with the published 3.2% on the first step — the April 2025
 * Order, which acts on the statement figure itself — and a flat
 * 1.5% after, everything in today's money.
 */
const SHEET: Readonly<Record<number, number>> = {
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

/** The last row a member retiring at their NPA reaches. */
const NPA_YEAR = 2051;

/** The spreadsheet rounds each cell; the residual against an
 * unrounded walk is pennies and is not a disagreement. */
const A_FEW_PENCE = 0.1;

/**
 * How far a row may sit from the sheet: a penny or two early
 * on, growing to about 17p by 2054.
 *
 * The residual is the SHEET's, not the model's. Each of its
 * cells is rounded to the nearest penny and the next row grows
 * that rounded figure by 1.5%, so thirty compoundings of a
 * half-penny truncation are worth a sixth of a pound by the
 * last row. `driftIsTheSheetRounding` below pins that it
 * behaves like rounding — one-directional and tiny — rather
 * than like a modelling error.
 *
 * One part in 100,000, so it stays two orders of magnitude
 * tighter than any of the errors this file exists to catch:
 * the deflator argument was worth 0.03%, the final-year uplift
 * 1.5%, the retirement pro-rata 0.7%.
 */
const tolerance = (expected: number) =>
  Math.max(A_FEW_PENCE, Math.abs(expected) * 1e-5);

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

  it('applies the Order that acts on the stated figure', () => {
    // April 2025, SI 2025/252: September CPI 1.7 + 1.5 = 3.2%.
    // It is used because the balance it multiplies is the
    // member's own, off the paper — the result is still
    // checkable, so the precision is earned.
    const r = projectPension(member(0.02), TODAY);
    const first = r.ledger.years[0];
    expect(first.schemeYearEnd).toBe(2026);
    expect(first.uplift?.percent).toBeCloseTo(3.2, 9);
    expect(first.uplift?.from.si).toBe('SI 2025/252');
    expect(first.revalued)
      .toBeCloseTo(STATED_PENSION * 1.032, 9);
  });

  it('declines the Order that acts on a guessed balance', () => {
    // April 2026, SI 2026/254, is legislated and known —
    // and not used. By then the balance carries this
    // library's estimate of 2025/26 pay, because the statement
    // covering that year is not issued until months later. A
    // precise rate on a guessed base is authority the figure
    // has not earned; the assumption stands in instead.
    const r = projectPension(member(0.02), TODAY);
    const second = r.ledger.years[1];
    expect(second.schemeYearEnd).toBe(2027);
    expect(second.uplift?.from.si).toBeNull();
    expect(second.uplift?.percent).toBeCloseTo(3.5, 9);
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
       and nothing on screen said why. It is £942.61 against the
       sheet's £34,822.23 for that row. */
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
    for (const [year, expected] of Object.entries(SHEET)) {
      const got = r.todaysMoneyLedger.closingAt(Number(year));
      expect(
        Math.abs(got - expected),
        `${label}${year}: got ${got.toFixed(2)}, sheet ${expected}`,
      ).toBeLessThan(tolerance(expected));
    }
    return Object.keys(SHEET).length;
  };

  /** 2025 to 2054 — the sheet's own span, seed row included. */
  const SHEET_ROWS = 30;

  it('reproduces every row at a zero inflation assumption', () => {
    // The sheet holds pay flat and grows the pension 1.5% a
    // year, both in today's money — which IS this library with
    // the inflation assumption at zero. All thirty rows of it,
    // 2025 to 2054, to the penny.
    expect(checkSheet(projectPension(stayer(0), TODAY)))
      .toBe(SHEET_ROWS);
  });

  it('drifts from the sheet only the way ROUNDING drifts',
    () => {
      /* The residual is asserted for its SHAPE, not just its
         size, because a modelling error can hide under a
         tolerance and a rounding artefact cannot fake this.

         Every row sits at or above the sheet, never below: the
         sheet rounds each cell and then grows the rounded
         figure, so it loses a fraction of a penny per year and
         never gains one. The gap is zero at the seed, which is
         the statement's own figure, and closes on 17p thirty
         rows later. Any real disagreement would put a row on
         the wrong side of this, or a step in it. */
      const r = projectPension(stayer(0), TODAY);
      let worst = 0;
      for (const [year, expected] of Object.entries(SHEET)) {
        const drift = r.todaysMoneyLedger.closingAt(Number(year))
          - expected;
        expect(drift, `${year} sits below the sheet`)
          .toBeGreaterThanOrEqual(0);
        // Monotone: rounding accumulates, it does not unwind.
        expect(drift, `${year} drift went backwards`)
          .toBeGreaterThanOrEqual(worst - A_FEW_PENCE / 5);
        worst = Math.max(worst, drift);
      }
      expect(worst).toBeLessThan(0.2);
      // The seed is exact: it is the member's own figure.
      expect(r.todaysMoneyLedger.closingAt(2025))
        .toBeCloseTo(SHEET[2025], 9);
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
      expect(r.factorType).toBe('none');
      expect(r.factor).toBe(1);
      expect(r.annualPension.real)
        .toBeCloseTo(SHEET[NPA_YEAR], A_FEW_PENCE);
      expect(r.todaysMoneyLedger.closingAt(NPA_YEAR))
        .toBeCloseTo(SHEET[NPA_YEAR], A_FEW_PENCE);
      // And the chart's point at 68 is that same figure, so the
      // headline cannot disagree with the picture under it.
      const atNpa = r.curve.find((p) => Math.floor(p.age) === 68);
      expect(atNpa?.real).toBeCloseTo(SHEET[NPA_YEAR], A_FEW_PENCE);
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
       they served all twelve months of 2026-27 — and that is
       £5,561.00, the sheet's "balance after reval" cell for the
       same row. The library deliberately reports the lower
       figure (see `rowFor` in `ledger.ts`), because the
       calculator draws this member's curve through that year
       end and a headline 1.5% above the point beneath it is a
       page that fails its own arithmetic. */
    const r = projectPension(leaver(0), TODAY);
    expect(r.todaysMoneyLedger.closingAt(2027))
      .toBeCloseTo(SHEET[2027], A_FEW_PENCE);
    expect(r.accruedAtExit.real)
      .toBeCloseTo(SHEET[2027], A_FEW_PENCE);
    // Retiring at NPA, so no factor stands between the two.
    expect(r.revaluedAtRetirement.real)
      .toBeCloseTo(SHEET[2027], A_FEW_PENCE);
    expect(r.annualPension.real)
      .toBeCloseTo(SHEET[2027], A_FEW_PENCE);
    // The figure explicitly NOT reported, named so a regression
    // has to disagree with a number that is written down.
    expect(r.annualPension.real)
      .not.toBeCloseTo(SHEET[2027] * 1.015, 1);
  });

  it('is flat in today\'s money for every year after', () => {
    const r = projectPension(leaver(0), TODAY);
    const after = r.todaysMoneyLedger.years.filter(
      (y) => y.schemeYearEnd > 2027,
    );
    expect(after.length).toBeGreaterThan(20);
    for (const year of after) {
      expect(year.uplift?.percent).toBe(0);
      expect(year.closing).toBeCloseTo(SHEET[2027], A_FEW_PENCE);
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
