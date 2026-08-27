/**
 * Commutation, and the two caps on tax-free cash.
 *
 * Magnitudes matter here more than in most suites. Every
 * lump-sum test used to run at a £5,000 or £10,000 pension — an
 * order of magnitude below the point the Lump Sum Allowance
 * starts to bind — so the function had full coverage and the
 * allowance had none. The rule this suite follows is: assert
 * each cap at a value on BOTH SIDES of its binding threshold.
 *
 * The second rule is that an expectation must not be the
 * implementation restated. Figures are pinned as literals with
 * their source, and the fixed point is checked against a
 * numeric solve rather than against its own closed form.
 */

import {describe, expect, it} from 'vitest';
import {
  COMMUTATION_FACTOR,
  HMRC_LUMP_SUM_CAP_PCT,
  LUMP_SUM_ALLOWANCE,
  LUMP_SUM_CAPS,
  VALUATION_FACTOR,
  commute,
  nhsCommutationLimits,
} from '../src/commutation.js';
import {createPrices} from '../src/pension/prices.js';
import type {ProjectionMoney} from '../src/pension/money.js';

const AT = new Date(2050, 2, 31);
const TODAY = new Date(2026, 2, 31);

const allowance = {amount: LUMP_SUM_ALLOWANCE, asAt: TODAY};

/* The series a projection at this rate would have walked with —
   the same object a caller passes from `projectPension`'s
   result, so the allowance cannot be carried forward at a rate
   the pension was never projected at. */
const limits = (assumedCpi = 0) => ({
  commutationFactor: COMMUTATION_FACTOR,
  allowance,
  prices: createPrices(assumedCpi, TODAY),
});

/** A pension reading the same in both rulers, so a test about
 *  the cap is not also a test about inflation. */
const flat = (amount: number): ProjectionMoney =>
  ({real: amount, nominal: amount, asAt: AT});

/** A pension shaped the way the projection produces one: real
 *  is the zero-CPI run at 1.5%/yr, nominal the cpi run at
 *  cpi + 1.5. Not one walk in two units. */
const projectedAt = (
  realPension: number, cpi: number, years = 24,
): ProjectionMoney => ({
  real: realPension,
  nominal: realPension * ((1 + cpi + 0.015) / 1.015) ** years,
  asAt: AT,
});

/** The today's-money limit for a pension, via the public API. */
const limitFor = (pension: number) =>
  commute(flat(pension), 1, limits()).limit.real;

/**
 * The scheme limb, solved NUMERICALLY from the statute's own
 * statement — the lump sum may not exceed a quarter of the
 * capital value, and taking it lowers the pension that value is
 * measured from:
 *
 *     L = c × (v × (P − L/f) + L)
 *
 * Iterated to its fixed point. Independent of the closed form
 * the library uses, so it tests the ALGEBRA rather than
 * restating it.
 */
function solveSchemeLimb(pension: number): number {
  const c = HMRC_LUMP_SUM_CAP_PCT / 100;
  let lump = 0;
  for (let i = 0; i < 500; i += 1) {
    lump = c * (
      VALUATION_FACTOR * (pension - lump / COMMUTATION_FACTOR)
      + lump
    );
  }
  return lump;
}

// ── the figures themselves ──────────────────────────

describe('the statutory figures', () => {
  it('are the ones HMRC publishes', () => {
    // "An individual's 'lump sum allowance' is £268,275" —
    // ITEPA 2003 s.637P, verified against the Act 26 Aug 2026.
    expect(LUMP_SUM_ALLOWANCE).toBe(268275);
    // Sch 29 FA 2004 para 2C states this as ONE THIRD of the
    // pension remaining; a quarter of the capital value
    // INCLUDING the lump sum is the same rule (see the
    // constant). Verified against the Act 26 Aug 2026.
    expect(HMRC_LUMP_SUM_CAP_PCT).toBe(25);
    // "the relevant valuation factor ... is 20" — FA 2004
    // s.276, verified against the Act 26 Aug 2026.
    expect(VALUATION_FACTOR).toBe(20);
    // £12 of cash per £1 given up: NHSBSA Key Notes, 2015
    // Scheme Estimates (V2).
    expect(COMMUTATION_FACTOR).toBe(12);
  });
});

// ── the limbs, either side of the threshold ─────────

describe('which limb binds', () => {
  it('below the threshold the scheme limb binds', () => {
    const limit = limitFor(62000);
    expect(limit.binding).toBe(LUMP_SUM_CAPS.Scheme);
    expect(limit.amount).toBeLessThan(LUMP_SUM_ALLOWANCE);
  });

  it('at the threshold the two limbs meet', () => {
    // 268275 x 7/30: the pension at which a 12:1 scheme limb
    // reaches the allowance exactly.
    const limit = limitFor(62597.5);
    expect(limit.amount).toBeCloseTo(268275, 6);
    expect(limit.schemeMax).toBeCloseTo(268275, 6);
  });

  it('above the threshold the allowance binds', () => {
    const limit = limitFor(62600);
    expect(limit.binding).toBe(LUMP_SUM_CAPS.Allowance);
    expect(limit.amount).toBe(268275);
    expect(limit.schemeMax).toBeGreaterThan(268275);
  });

  it('a consultant-level pension is capped, not scaled', () => {
    // The case that surfaced the defect. The scheme limb alone
    // would allow £309,290.74 — the library used to return it.
    const limit = limitFor(72167.84);
    expect(limit.schemeMax).toBeCloseTo(309290.74, 2);
    expect(limit.amount).toBe(268275);
  });
});

describe('the share of benefits the maximum represents', () => {
  it('is the statutory 25% while the scheme limb binds', () => {
    expect(limitFor(50000).sharePct)
      .toBeCloseTo(HMRC_LUMP_SUM_CAP_PCT, 6);
  });

  it('is LESS than 25% once the allowance binds, because a flat '
    + 'cash cap is a smaller share of a larger pension', () => {
    const limit = limitFor(79665);
    expect(limit.binding).toBe(LUMP_SUM_CAPS.Allowance);
    // £268,275 of a £1,414,450 capital value.
    expect(limit.sharePct).toBeCloseTo(18.966, 2);
    expect(limit.sharePct).toBeLessThan(HMRC_LUMP_SUM_CAP_PCT);
  });

  it('agrees with the capital value computed independently', () => {
    for (const pension of [30000, 62597.5, 79665, 120000]) {
      const {amount, sharePct} = limitFor(pension);
      const capitalValue =
        VALUATION_FACTOR * (pension - amount / COMMUTATION_FACTOR)
        + amount;
      expect(sharePct)
        .toBeCloseTo((amount / capitalValue) * 100, 9);
    }
  });

  it('falls as the pension rises, once capped', () => {
    expect(limitFor(200000).sharePct)
      .toBeLessThan(limitFor(100000).sharePct);
  });
});

// ── the algebra, against an independent solve ───────

describe('the scheme limb', () => {
  it('matches a numeric solve of the statutory form, across '
    + 'the realistic range', () => {
    for (let pension = 1000; pension <= 200000; pension += 1000) {
      expect(limitFor(pension).schemeMax)
        .toBeCloseTo(solveSchemeLimb(pension), 6);
    }
  });

  it('is 4.2857x the pension at a 12:1 rate', () => {
    // 30/7, the closed form's answer, stated independently.
    expect(limitFor(10000).schemeMax).toBeCloseTo(42857.14, 2);
  });
});

// ── the invariant the defect violated ───────────────

describe('invariants', () => {
  it('the maximum never exceeds the allowance, at any pension '
    + 'a member could bring', () => {
    for (let pension = 0; pension <= 200000; pension += 500) {
      expect(limitFor(pension).amount)
        .toBeLessThanOrEqual(LUMP_SUM_ALLOWANCE);
    }
  });

  it('£0 pension yields £0', () => {
    expect(limitFor(0).amount).toBe(0);
  });

  it('rejects a fraction outside 0-1 as caller input', () => {
    expect(() => commute(flat(10000), 1.5, limits()))
      .toThrow(RangeError);
    expect(() => commute(flat(10000), -0.1, limits()))
      .toThrow(RangeError);
  });

  it('rejects a non-positive commutation rate', () => {
    expect(() => commute(flat(10000), 1, {
      ...limits(), commutationFactor: 0,
    })).toThrow(RangeError);
  });

  it('carries the allowance at the run\'s own rate, so a caller '
    + 'cannot commute at a rate it never projected at', () => {
    // The limits take the projection's Prices, not a loose
    // number, so there is no second place the assumption lives.
    const cpi = 0.03;
    const money = projectedAt(120000, cpi);
    expect(
      commute(money, 1, limits(cpi)).limit.nominal.amount,
    ).not.toBeCloseTo(
      commute(money, 1, limits(0)).limit.nominal.amount, 0,
    );
  });
});

// ── commutation ─────────────────────────────────────

describe('commute', () => {
  it('full commutation takes the permitted maximum', () => {
    const result = commute(flat(10000), 1, limits());
    expect(result.lumpSum.real).toBeCloseTo(42857.14, 2);
    expect(result.pensionGivenUp.real)
      .toBeCloseTo(42857.14 / 12, 2);
    expect(result.residualPension.real)
      .toBeCloseTo(10000 - 42857.14 / 12, 2);
  });

  it('partial commutation takes its share', () => {
    expect(commute(flat(10000), 0.5, limits()).lumpSum.real)
      .toBeCloseTo(42857.14 / 2, 2);
  });

  it('no commutation leaves the pension whole', () => {
    const result = commute(flat(10000), 0, limits());
    expect(result.lumpSum.real).toBe(0);
    expect(result.residualPension.real).toBe(10000);
  });

  it('holds the 12:1 rate at every fraction', () => {
    for (const fraction of [0.25, 0.5, 0.75, 1]) {
      const r = commute(flat(72167.84), fraction, limits());
      expect(r.lumpSum.real / r.pensionGivenUp.real)
        .toBeCloseTo(12, 5);
    }
  });

  it('above the threshold the maximum IS the allowance, and '
    + 'the pension given up follows from it', () => {
    const result = commute(flat(72167.84), 1, limits());
    expect(result.lumpSum.real).toBe(268275);
    expect(result.pensionGivenUp.real)
      .toBeCloseTo(268275 / 12, 2);
    expect(result.limit.real.binding)
      .toBe(LUMP_SUM_CAPS.Allowance);
  });

  it('carries the pension date onto every figure', () => {
    const result = commute(flat(50000), 0.5, limits());
    for (const money of [
      result.lumpSum, result.pensionGivenUp,
      result.residualPension,
    ]) {
      expect(money.asAt).toBe(AT);
    }
  });
});

// ── the two rulers ──────────────────────────────────

describe('the two rulers', () => {
  /**
   * A pension shaped the way the projection actually produces
   * one: `real` is the model at ZERO cpi, growing 1.5% a year;
   * `nominal` is the same model at cpi, growing cpi + 1.5. The
   * two are not one walk in different units, which is the whole
   * reason a lump-sum cap needs care.
   */
  it('the today\'s-money maximum does not move when the CPI '
    + 'assumption does', () => {
    // The property the indexed model was chosen for: the cap is
    // a real-terms constant, so the today's-money column is
    // invariant to an assumption it does not depend on.
    const at = (cpi: number) =>
      commute(projectedAt(72167.84, cpi), 1, limits(cpi))
        .limit.real.amount;
    const base = at(0);
    for (const cpi of [0.01, 0.02, 0.05, 0.1, 0.2]) {
      expect(at(cpi)).toBe(base);
    }
  });

  it('the cash maximum is the allowance carried to the '
    + 'pension\'s own date', () => {
    /* Stated independently of the library's own arithmetic:
       24 April uplifts fall in (2026-03-31, 2050-03-31], so the
       cap is the allowance compounded 24 times. Asserting it
       against `prices.valueAt` would be the expression `commute`
       already runs, and a miscounted step would pass. */
    const cpi = 0.02;
    const money = projectedAt(120000, cpi);
    expect(
      commute(money, 1, limits(cpi)).limit.nominal.amount,
    ).toBeCloseTo(LUMP_SUM_ALLOWANCE * 1.02 ** 24, 6);
  });

  it('states the allowance in the today\'s-money ruler, not '
    + 'wherever the caller happened to date it', () => {
    /* Every other test states the allowance AT the run date, so
       the conversion is the identity and a regression that
       ignored `asAt` would pass the whole suite. Here it is
       dated two years earlier: the real limb must carry it
       forward to the run date, or the cap is a figure in the
       wrong year's money presented as today's. */
    const cpi = 0.02;
    const staleAllowance = {
      amount: LUMP_SUM_ALLOWANCE,
      asAt: new Date(2024, 3, 6),
    };
    const {limit} = commute(flat(200000), 1, {
      commutationFactor: COMMUTATION_FACTOR,
      allowance: staleAllowance,
      prices: createPrices(cpi, TODAY),
    });
    /* ONE April uplift falls in (2024-04-06, 2026-03-31]: the
       6 April 2025 one. The 2024 uplift lands exactly on the
       opening bound and a step must fall strictly after it, and
       the 2026 one is five days past the close. A fractional-
       year deflator would count ~1.96 years here and give a
       different figure — which is why the conversion goes
       through the library's step counter rather than Math.pow
       over a duration. */
    expect(limit.real.allowance)
      .toBeCloseTo(LUMP_SUM_ALLOWANCE * 1.02, 6);
    expect(limit.real.allowance)
      .toBeGreaterThan(LUMP_SUM_ALLOWANCE);
  });

  it('reports each ruler\'s limb separately, because they can '
    + 'genuinely disagree', () => {
    /* The pension grows at cpi + 1.5 over a zero-cpi run, but
       the allowance is carried at cpi — different ratios, so
       around the crossover the allowance binds in today's money
       while the scheme limb still binds in cash. Reporting one
       flag would caption one column with the other's reason. */
    const cpi = 0.02;
    const disagreed = [62600, 62900].map((real) =>
      commute(projectedAt(real, cpi), 1, limits(cpi)).limit,
    );
    for (const limit of disagreed) {
      expect(limit.real.binding).toBe(LUMP_SUM_CAPS.Allowance);
      expect(limit.nominal.binding).toBe(LUMP_SUM_CAPS.Scheme);
    }
  });

  it('agrees on the limb well away from the crossover', () => {
    const cpi = 0.02;
    for (const real of [20000, 40000, 100000, 150000]) {
      const {limit} = commute(
        projectedAt(real, cpi), 1, limits(cpi),
      );
      expect(limit.real.binding).toBe(limit.nominal.binding);
    }
  });
});

/*
 * The composer exists because required fields stop a caller
 * OMITTING the allowance and do nothing to stop two call sites
 * pairing the constants differently. These tests pin the
 * pairing, so a change to it is a decision rather than a drift.
 */
describe('nhsCommutationLimits', () => {
  const prices = createPrices(0.02, TODAY);

  it('pairs the scheme rate with the statutory allowance', () => {
    const limits = nhsCommutationLimits(prices);
    expect(limits.commutationFactor).toBe(COMMUTATION_FACTOR);
    expect(limits.allowance.amount).toBe(LUMP_SUM_ALLOWANCE);
  });

  it('dates the allowance at the run\'s own anchor', () => {
    /* Not "today": these are the prices that will carry the
       allowance forward, so any other anchor converts it across
       a gap the projection never travelled. */
    const asOf = new Date(2019, 3, 1);
    const limits = nhsCommutationLimits(createPrices(0.02, asOf));
    expect(limits.allowance.asAt).toStrictEqual(asOf);
  });

  it('hands back the same prices it was given', () => {
    expect(nhsCommutationLimits(prices).prices).toBe(prices);
  });

  it('agrees with a correctly hand-built record', () => {
    const pension: ProjectionMoney = {
      real: 79665, nominal: 128000, asAt: AT,
    };
    const byHand = commute(pension, 1, {
      commutationFactor: COMMUTATION_FACTOR,
      allowance: {amount: LUMP_SUM_ALLOWANCE, asAt: prices.asOf},
      prices,
    });
    const composed = commute(pension, 1, nhsCommutationLimits(prices));
    expect(composed).toStrictEqual(byHand);
  });
});
