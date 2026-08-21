/**
 * The years BEFORE a statement, estimated for illustration.
 *
 * A member hands over one figure — the pension accrued by their
 * statement's date — and their join date. Everything between
 * the two is unknown: this library has no route to anyone's
 * year-by-year earnings. Without this the chart can only begin
 * at the statement, and the join date — which the form asks for,
 * visibly — does nothing at all.
 *
 * This fills that gap the only honest way available. It asks
 * what FLAT pensionable pay, in today's money, would have
 * produced exactly the balance the member states, over exactly
 * the years they say they were in the scheme — and then walks
 * that pay forward as the illustration.
 *
 * ── What it is and is not ───────────────────────────
 *
 * It is **for plotting**. It gives the built-up arm a shape and
 * a starting point, and it is drawn in the same line as the
 * rest because it is the same pension. What makes it honest is
 * the disclosure beside it, not a different colour.
 *
 * It is **not a reconstruction of anyone's career**. Real
 * earnings are not flat: the statement this was checked against
 * runs £42k, £33k, £37k, £51k across four years, and no single
 * figure produces that shape. What the estimate gets right is
 * the ENDPOINT, exactly, and the trajectory approximately.
 *
 * It is **not an input to the projection**. Nothing after the
 * statement reads it; the forward figures use the pay the
 * member actually gave. A pension projected from a pay derived
 * from that same pension would be arguing in a circle.
 *
 * ── Why it is calibrated by a walk, not a formula ───
 *
 * Closed form exists. With flat pay, a constant rate `r` and
 * `n` whole years, the balance is
 *
 *     P = (W / 54) x (r^n - 1) / (r - 1)
 *
 * and inverting gives `W = 54 P (r - 1) / (r^n - 1)`. That is
 * the oracle the tests check this against, and it is exact for
 * the case it describes.
 *
 * The code does not use it, because the cases it does not
 * describe are ordinary. A member joining in September has a
 * seven-twelfths first year. A join date before April 2015 is
 * clamped to the scheme's own start. The first row of any walk
 * carries no uplift. Each is a special case in the formula and
 * none in a walk.
 *
 * So the calibration exploits the one structural fact that
 * makes a walk enough: **the ledger is exactly LINEAR in pay.**
 * Every slice is `pay x months / 12 / 54`, and everything after
 * is multiplication by uplift factors and addition. Walk once
 * at a pay of 1, read the closing balance, and that is the
 * whole accumulation factor; the pay that hits any target is
 * one division. One walk, exact, and no second copy of the
 * recurrence to drift out of step with the first.
 *
 * ── Checked against a real statement ────────────────
 *
 * The estimate lands within 0.2% of a real member's own career
 * average, once both are expressed in the same money — see
 * `tests/golden-abs.test.ts`. That check matters more than it
 * looks, because the naive comparison FAILS: the earnings
 * printed on a statement are each year's cash, carrying that
 * year's pay award inside them, so averaging them raw mixes
 * 2021 pounds with 2025 pounds and reads low by a tenth.
 */

import {buildLedger} from './ledger.js';
import type {MemberLedger} from './ledger.js';
import type {Prices} from './prices.js';
import {schemeYearEndDate, seedFromJoinDate} from './seed.js';

/** An illustrative run-up to a stated balance. */
export interface EstimatedHistory {
  /**
   * The flat pensionable pay that reproduces the stated
   * balance, in the money of the run it belongs to.
   *
   * Reportable, and worth reporting: it is the one number a
   * reader can sanity-check the illustration against. Wildly
   * below the pay they entered usually means the join date is
   * earlier than their 2015-scheme service really began.
   */
  readonly impliedPay: number;
  /** The walked years, ending exactly on the stated balance. */
  readonly ledger: MemberLedger;
  /** First and last scheme year covered, inclusive. */
  readonly from: number;
  readonly to: number;
}

/**
 * Estimate the years from `joinDate` up to a stated balance.
 *
 * Null when there is nothing to draw — a member who joined in
 * or after the statement's own scheme year has no run-up, and
 * inventing one would put pension on the chart before they had
 * any.
 */
export function estimateHistory({
  joinDate,
  statedBalance,
  statementSchemeYearEnd,
  prices,
}: {
  joinDate: Date;
  statedBalance: number;
  statementSchemeYearEnd: number;
  prices: Prices;
}): EstimatedHistory | null {
  const seed = seedFromJoinDate(joinDate);
  const first = seed.atSchemeYearEnd + 1;
  if (first > statementSchemeYearEnd || statedBalance <= 0) {
    return null;
  }

  const walk = (pensionableEarnings: number) => buildLedger({
    seed,
    pensionableEarnings,
    // Accruing throughout, and drawing far enough out that no
    // retirement factor lands inside the window.
    exitDate: schemeYearEndDate(statementSchemeYearEnd),
    retirementDate: schemeYearEndDate(statementSchemeYearEnd + 60),
    prices,
    drawingFor: () => null,
    through: statementSchemeYearEnd,
  });

  // The accumulation factor, read off the model itself rather
  // than re-derived: pay of 1 in, whole factor out.
  const perPound = walk(1).closingAt(statementSchemeYearEnd);
  // Finite AND positive, spelt out: `<= 0` alone lets NaN
  // through, and a NaN factor would divide into an implied pay
  // that renders as a real figure rather than an absent one.
  if (!Number.isFinite(perPound) || perPound <= 0) return null;

  const impliedPay = statedBalance / perPound;
  return {
    impliedPay,
    ledger: walk(impliedPay),
    from: first,
    to: statementSchemeYearEnd,
  };
}
