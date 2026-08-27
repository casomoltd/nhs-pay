/**
 * Commutation — exchanging annual pension for a tax-free lump
 * sum, and the caps on how much of it may be taken.
 *
 * Separate from the projection because it IS separate: nothing
 * in `pension-projection.ts` calls into here and the ledger
 * applies no commutation. It is a choice taken AT retirement, on
 * a pension the projection has already finished producing. It
 * borrows one thing, by type only: the `Prices` the projection
 * ran with, so the allowance is carried forward at the SAME
 * assumption the pension was projected at and cannot silently
 * use another.
 *
 * ── Only one figure here is an NHS rule ─────────────
 *
 * The commutation RATE — £12 of cash per £1 of pension — is the
 * scheme's own. The three caps are statutory and bind every
 * registered pension scheme in the UK: the 25% of capital value,
 * the 20:1 factor that capital value is measured with, and the
 * Lump Sum Allowance. They are grouped apart below, and the
 * scheme's rate is passed to the solver as a parameter rather
 * than read from the module, so the statutory half can move to a
 * scheme-neutral home without a redesign.
 */

import {invariant} from './errors.js';
import type {ProjectionMoney} from './pension/money.js';
import type {Prices} from './pension/prices.js';

// ── The scheme's own rule ───────────────────────────

/**
 * Commutation: £12 lump sum per £1 of annual pension given up.
 *
 * The NHS scheme's rate. Other schemes commute at other rates,
 * which is why {@link lumpSumLimit} takes it as an argument
 * instead of reading it here.
 *
 * Source: NHSBSA Key Notes, 2015 Scheme Estimates (V2) —
 * **not archived**; see docs/how-it-works.md's source table.
 * NHSBSA states the same terms to members, publicly, at
 * <https://www.nhsbsa.nhs.uk/employee-section/
 * understanding-your-statement/maximum-lump-sum> ("reducing your
 * pension by £1 for every £12"). Named here as well as in the
 * table because the Key Notes document has no public URL, so
 * without it this constant is the one figure in the module a
 * reader cannot go and check.
 */
export const COMMUTATION_FACTOR = 12;

// ── HMRC's rules ────────────────────────────────────
// None of the three below is an NHS rule. They are limbs of one
// statutory test — Schedule 29 Finance Act 2004, paragraphs 2
// and 2C — which makes the permitted maximum the LOWER of the
// applicable amount and the member's available allowance.

/**
 * The most of a member's benefits HMRC lets them take as a
 * tax-free lump sum, as a percentage.
 *
 * Exported because it is the only part of the commutation rule
 * a member can be told directly — {@link lumpSumLimit} is the
 * cap in pounds, which answers "how much" but never "why that
 * much". A consumer explaining the swap needs this figure, and
 * a consumer that writes its own copy of it is one that can
 * drift from the library that applies it.
 *
 * THIS IS THE FORM THE STATUTE USES. Schedule 29 FA 2004
 * paragraph 2C gives the defined-benefits applicable amount as
 * `(A + (B × C)) / 4`, where A is the amount of the lump sum, B
 * is the relevant valuation factor ({@link VALUATION_FACTOR})
 * and C is the pension payable in the 12 months beginning with
 * the day the member becomes entitled to it. `A + (B × C)` IS
 * the capital value, so a quarter of it is this constant.
 *
 * Two things follow, and both are load-bearing. C is the pension
 * AFTER commutation, which is what makes the cap a fixed point
 * rather than a percentage of anything the caller already holds.
 * And the one-third-of-the-remaining-pension form that guidance
 * often quotes is this same rule solved for A: 4A = A + (B × C)
 * gives A = B × C / 3. Both reach 30P/7 at a 12:1 rate, verified
 * numerically either way. Do NOT "correct" this constant to a
 * third — it would be the same number and the wrong citation.
 *
 * Source: Schedule 29 Finance Act 2004, paragraphs 2 (the
 * permitted maximum is the LOWEST of three amounts) and 2C (the
 * defined-benefits applicable amount, which invokes B by
 * reference to s.276 rather than restating 20). Verified against
 * the Act on 27 August 2026. Paragraph 2C's formula is published
 * as an image, so its shape is corroborated by the variable
 * definitions in the surrounding text and by HMRC's own
 * 20P / (3 + 20/CF), which agrees to the penny.
 */
export const HMRC_LUMP_SUM_CAP_PCT = 25;

/**
 * The statutory factor turning an annual defined-benefit pension
 * into a capital value: capital value is 20 × annual pension.
 *
 * Named because it is a RULE, not arithmetic. A statutory
 * factor written as a bare `20` inside an expression is
 * invisible to a search, to a citation and to a test, and reads
 * as a coefficient someone chose.
 *
 * Reached by reference, not by repetition: Schedule 29 paragraph
 * 2C names "the relevant valuation factor" as its B rather than
 * writing 20 into the lump sum rule, so the factor and the cap
 * are one rule in two provisions and a change to s.276 would
 * move the cap without touching Schedule 29.
 *
 * Source: Finance Act 2004 s.276, "Relevant valuation factor":
 * "the relevant valuation factor in relation to any registered
 * pension scheme, or any arrangement under a registered pension
 * scheme, is 20", unless a higher one is agreed with HMRC.
 * Verified against the Act on 27 August 2026.
 */
export const VALUATION_FACTOR = 20;

/**
 * The Lump Sum Allowance: the absolute cap on tax-free pension
 * cash, in pounds.
 *
 * £268,275 since 6 April 2024, when it replaced the Lifetime
 * Allowance. FROZEN IN LAW — it is not indexed, so its real
 * value erodes every year it stands.
 *
 * "Frozen" states the LAW, not how a projection should treat it.
 * Whether to carry this figure forward in real terms is the
 * CALLER's assumption, declared through
 * {@link CommutationLimits.allowance}. Do not read this comment
 * as an instruction to hold the figure fixed in cash.
 *
 * This is the STANDARD allowance. A member holding a Lifetime
 * Allowance protection has a higher one — HMRC PTM174700 puts
 * fixed protection 2016 at £312,500, 2014 at £375,000 and 2012
 * at £450,000, with the other classes worked out per member.
 * None of them is modelled here and none is detectable from
 * what this library is given.
 *
 * Source: ITEPA 2003 s.637P, verified against the Act on
 * 27 August 2026 — <https://www.legislation.gov.uk/ukpga/2003/1/
 * part/9/chapter/15A>. Cited to the instrument rather than to
 * HMRC's Pensions Tax Manual, which is written for
 * administrators and gave the wrong section number when this
 * figure was first transcribed. Its source-archive row is in
 * docs/how-it-works.md.
 */
export const LUMP_SUM_ALLOWANCE = 268275;

// ── Which limb bound ────────────────────────────────

/**
 * The two limbs of the permitted maximum, as a const object so
 * the keys are reachable at a call site instead of a bare
 * literal repeated across modules.
 *
 * `Scheme` IS A MISLEADING NAME AND IS KNOWN TO BE. Both limbs
 * are statutory and bind every registered pension scheme in the
 * UK; the scheme's only contribution to this swap is
 * {@link COMMUTATION_FACTOR}. The name has already leaked into
 * prose that told members "the scheme stops the swap at 25%",
 * which was wrong wherever it appeared.
 *
 * It is not renamed in place on purpose. The whole statutory
 * half of this module moves to the UK-tax library
 * (casomoltd/nhs-pay#15, casomoltd/paye-calc#30), and renaming
 * here as well would spend two breaking changes on one defect.
 * When the rule lands in its new home the key should be named
 * for the statute — `Applicable`, after the applicable amount
 * in Schedule 29 paragraph 2C.
 *
 * Until then: read `Scheme` as the name of a discriminant, not
 * as an attribution, and never render it to a member.
 */
export const LUMP_SUM_CAPS = {
  Scheme: 'scheme',
  Allowance: 'allowance',
} as const;

/** Which limb of the permitted maximum bound. */
export type LumpSumCap =
  (typeof LUMP_SUM_CAPS)[keyof typeof LUMP_SUM_CAPS];

// ── Inputs ──────────────────────────────────────────

/**
 * A cash amount and the date it is stated in.
 *
 * The pairing is the point. An amount without its date cannot be
 * moved into another ruler, and it cannot say which ruler it is
 * already in — cash at retirement and today's money are the same
 * number in different units. A function handed a bare number has
 * to assume one, and its assumption is unwritten.
 */
export interface DatedAmount {
  readonly amount: number;
  readonly asAt: Date;
}

/**
 * Everything the permitted maximum depends on besides the
 * pension itself.
 *
 * EVERY FIELD IS REQUIRED. Each selects WHICH answer you get,
 * not how it is computed, so a default would hand a
 * plausible-but-wrong figure to a caller who forgot it — with no
 * error, no type failure and no failing test. A cap is exactly
 * the kind of figure that looks right at every value except the
 * ones it exists to catch.
 */
export interface CommutationLimits {
  /**
   * The SCHEME's commutation rate — £ of lump sum per £1 of
   * pension. {@link COMMUTATION_FACTOR} for the NHS. The only
   * non-statutory input here.
   */
  readonly commutationFactor: number;
  /**
   * The lump sum allowance, and the date it is stated in.
   *
   * Modelled as a REAL-TERMS constant: the today's-money run
   * tests `amount` as given, and the cash run tests the same cap
   * carried forward to the pension's own date. That is an
   * assumption — the allowance is frozen in law — and a consumer
   * showing these figures should say so.
   */
  readonly allowance: DatedAmount;
  /**
   * The price series the pension was PROJECTED with, used to
   * carry the allowance to the pension's own date.
   *
   * PASS THE ONE FROM `projectPension`'s RESULT. Taking the
   * object rather than a bare rate removes the need to restate
   * the assumption, and gives the conversion the run's own
   * anchor — but it does not make a mismatch impossible:
   * `createPrices` is exported, so a caller can still build a
   * series the pension was never projected with. That is a
   * caller error this library cannot detect.
   */
  readonly prices: Prices;
}

/**
 * The NHS binding of {@link CommutationLimits}.
 *
 * Every field of that interface is required so a non-NHS caller
 * cannot inherit an NHS default by omitting one. That stops a
 * field being LEFT OUT; it does nothing to stop several call
 * sites each assembling the same NHS combination by hand and one
 * of them getting it subtly wrong — a different `asAt`, a
 * `createPrices` of its own, a literal `12`. Two consumers
 * already spelled the date two ways.
 *
 * So the combination is published once, here, beside the
 * constants it pairs. Pass the `prices` your own projection
 * returned; the allowance is stated at that run's anchor,
 * because these are the prices that will convert it and
 * anchoring it anywhere else converts it across a gap the
 * projection never travelled.
 */
export function nhsCommutationLimits(
  prices: Prices,
): CommutationLimits {
  return {
    commutationFactor: COMMUTATION_FACTOR,
    allowance: {amount: LUMP_SUM_ALLOWANCE, asAt: prices.asOf},
    prices,
  };
}

// ── Outputs ─────────────────────────────────────────

/**
 * The permitted maximum tax-free lump sum, and the working
 * behind it.
 *
 * A value object rather than a number because a consumer that
 * stops a control at this figure has to be able to say WHY it
 * stopped, and a UI that re-derives "was it the allowance?" from
 * a comparison keeps a second copy of the rule in the layer
 * least able to test it.
 */
export interface LumpSumLimit {
  /** The permitted maximum: the lower of the two limbs. */
  readonly amount: number;
  /**
   * Which limb set `amount`. Equal limbs report `Allowance` — at
   * the crossover the allowance is what stops it moving.
   */
  readonly binding: LumpSumCap;
  /** The applicable-amount limb, before the allowance. */
  readonly schemeMax: number;
  /**
   * The allowance actually tested against, in this ruler — so a
   * consumer cites the figure that was applied rather than the
   * statutory one it assumes was applied.
   */
  readonly allowance: number;
  /**
   * `amount` as a share of the capital value of the benefits,
   * in percentage points.
   *
   * The unit the statute states the rule in, and the one a
   * member can check the rule against — so it is reported here
   * rather than left to a consumer to re-derive from the capital
   * value, which is not a figure this library otherwise hands
   * out. It is HMRC_LUMP_SUM_CAP_PCT exactly when the scheme
   * limb binds, and LESS when the allowance does: a flat cash
   * cap is a smaller share of a larger pension. A control whose
   * ceiling is labelled 25% while the allowance binds is telling
   * the member a share they are not taking.
   */
  readonly sharePct: number;
}

/**
 * One reading per ruler.
 *
 * Named rather than left inline because it is public API: a
 * consumer writing a caption helper should not have to spell
 * `CommutationResult['limit']` to type its argument.
 */
export interface LumpSumLimits {
  readonly real: LumpSumLimit;
  readonly nominal: LumpSumLimit;
}

/** Commutation, in both rulers, from one call. */
export interface CommutationResult {
  readonly pensionGivenUp: ProjectionMoney;
  readonly residualPension: ProjectionMoney;
  readonly lumpSum: ProjectionMoney;
  /**
   * The full working behind each ruler's maximum — which limb
   * bound it, and both limbs' figures.
   *
   * TWO limits, not one flag, because the rulers can genuinely
   * disagree about which limb stopped the lump sum. They are not
   * one walk in different units: `real` is the model run at zero
   * CPI, growing 1.5% a year, while the allowance is carried
   * forward at CPI — so the pension's real-to-cash ratio and the
   * allowance's are different numbers. Around the crossover
   * there is a band where the allowance binds in today's money
   * and the scheme limb still binds in cash. A consumer shows
   * the limit for the ruler it is displaying; one flag for both
   * would caption one column with the other's reason.
   *
   * The maximum itself is `limit.<ruler>.amount`. It is not also
   * reported as a pair: two shapes for one number is two places
   * an edit can change it.
   */
  readonly limit: LumpSumLimits;
}

// ── The permitted maximum ───────────────────────────

/**
 * The permitted maximum tax-free lump sum: the LOWER of the
 * scheme's 25%-of-capital-value limb and the lump sum allowance.
 *
 * One statutory test, not two rules bolted together, so the
 * `min` below is the rule rather than a convenience.
 *
 * The scheme limb is a fixed point, not a percentage of anything
 * the caller already holds: the cap is on the lump sum as a
 * share of the CAPITAL VALUE of the benefits, and taking a lump
 * sum lowers the pension that value is measured from. With `c`
 * the cap, `v` the valuation factor and `f` the commutation
 * factor, capital value is `v × residual + lumpSum`, and solving
 *
 *     L = c × (v × (P − L/f) + L)
 *
 * for L gives the expression below. Written from the named
 * constants rather than from its rearrangement — the familiar
 * `(20P) / (3 + 20/f)` is this same solution with `c = 0.25`
 * already substituted in, which hides the one number a reader
 * would want to check.
 *
 * Module-private, and deliberately so: it solves ONE ruler, so
 * both money arguments must already be in that ruler. Exporting
 * it would put a pair of bare, ruler-less numbers on the public
 * API — the very thing {@link DatedAmount} exists to prevent.
 * Consumers get both rulers' limits from {@link commute}.
 */
function lumpSumLimit(
  {pension, allowance, commutationFactor}: {
    /** In one ruler. */
    readonly pension: number;
    /** In the SAME ruler as `pension` — the reason this takes a
     *  record rather than two same-typed positionals, where a
     *  transposition would compile and read plausibly. */
    readonly allowance: number;
    readonly commutationFactor: number;
  },
): LumpSumLimit {
  if (commutationFactor <= 0) {
    throw new RangeError(
      `Commutation factor must be positive, got `
      + `${commutationFactor}`,
    );
  }
  if (pension < 0 || allowance < 0) {
    throw new RangeError(
      `Pension and allowance must be non-negative, got `
      + `${pension} and ${allowance}`,
    );
  }
  const cap = HMRC_LUMP_SUM_CAP_PCT / 100;
  const schemeMax =
    (VALUATION_FACTOR * cap * pension)
    / (1 - cap + (VALUATION_FACTOR * cap) / commutationFactor);
  // One comparison decides both the figure and the reason, so
  // the two cannot drift into disagreeing.
  const boundByAllowance = allowance <= schemeMax;
  const amount = boundByAllowance ? allowance : schemeMax;

  /* The statute caps the lump sum at a quarter of the capital
     value of the benefits crystallised. This solves that
     as a fixed point, so checking the SOLVED form would prove
     only that the rearrangement agrees with itself; checking the
     ORIGINAL form proves the rearrangement is right. This is the
     one guard here that could fail without the line above it
     already being obviously wrong.

     The tolerance is not slack: at the scheme limb the two sides
     are EQUAL, and float leaves them differing by up to ~6e-11
     in either direction across the realistic range. */
  const capitalValue =
    VALUATION_FACTOR * (pension - amount / commutationFactor)
    + amount;
  invariant(
    amount - cap * capitalValue <= Math.abs(capitalValue) * 1e-9,
    `Lump sum ${amount} exceeds ${HMRC_LUMP_SUM_CAP_PCT}% of `
    + `capital value ${capitalValue} — the fixed point is wrong`,
  );

  return {
    amount,
    sharePct: capitalValue === 0
      ? 0
      : (amount / capitalValue) * 100,
    binding: boundByAllowance
      ? LUMP_SUM_CAPS.Allowance
      : LUMP_SUM_CAPS.Scheme,
    schemeMax,
    allowance,
  };
}

// ── Commutation ─────────────────────────────────────

/**
 * Commutation at a fraction of the permitted maximum, reported
 * in both rulers.
 *
 * Takes the pension as a {@link ProjectionMoney} rather than a
 * bare number so the ruler travels with the money. A dateless
 * figure cannot say which ruler it is in, and the allowance is a
 * cash amount tested on a date — so the two could only be
 * compared by assuming, which is the defect this signature
 * removes.
 *
 * ERF/LRF is applied BEFORE commutation (§1.18), so `pension` is
 * the pension at retirement after any factor.
 */
export function commute(
  pension: ProjectionMoney,
  fraction: number,
  limits: CommutationLimits,
): CommutationResult {
  if (!(fraction >= 0 && fraction <= 1)) {
    // A caller's mistake, not a library bug, so not `invariant`:
    // see the note at the top of errors.ts.
    throw new RangeError(
      `Commutation fraction must be 0–1, got ${fraction}`,
    );
  }
  const {allowance, prices, commutationFactor} = limits;

  // The allowance is a real-terms constant: the today's-money
  // run tests its stated value, the cash run tests the same cap
  // carried to the pension's own date.
  const today = lumpSumLimit({
    pension: pension.real,
    // Into the ruler the today's-money reading is anchored in —
    // the run date. Usually the identity, because that is where
    // a caller states the allowance; not assumed to be.
    allowance: prices.valueAt(
      allowance.amount, allowance.asAt, prices.asOf,
    ),
    commutationFactor,
  });
  const cash = lumpSumLimit({
    pension: pension.nominal,
    allowance: prices.valueAt(
      allowance.amount, allowance.asAt, pension.asAt,
    ),
    commutationFactor,
  });

  /* Takes the object, not two same-typed positional numbers: a
     transposition would swap the rulers silently. */
  const pair = (
    m: {nominal: number; real: number},
  ): ProjectionMoney => ({...m, asAt: pension.asAt});

  const lumpSum = pair({
    real: today.amount * fraction,
    nominal: cash.amount * fraction,
  });
  const pensionGivenUp = pair({
    real: lumpSum.real / commutationFactor,
    nominal: lumpSum.nominal / commutationFactor,
  });

  return {
    lumpSum,
    pensionGivenUp,
    residualPension: pair({
      real: pension.real - pensionGivenUp.real,
      nominal: pension.nominal - pensionGivenUp.nominal,
    }),
    limit: {real: today, nominal: cash},
  };
}
