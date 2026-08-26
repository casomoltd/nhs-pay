/**
 * Commutation — exchanging annual pension for a tax-free lump
 * sum, and the caps on how much of it may be taken.
 *
 * Separate from the projection because it IS separate: nothing
 * in `pension-projection.ts` calls into here, the ledger applies
 * no commutation, and the whole cluster depends on nothing but
 * `invariant`. It is a choice taken AT retirement, on a pension
 * the projection has already finished producing.
 *
 * Two rules meet here and only one of them is the NHS scheme's.
 * The commutation RATE (£12 per £1) is the scheme's own. The cap
 * on tax-free cash is statutory and applies to every registered
 * pension scheme — see the note on HMRC_LUMP_SUM_CAP_PCT.
 */

import {invariant} from './errors.js';

/** Commutation: £12 lump sum per £1 pension */
export const COMMUTATION_FACTOR = 12;

/**
 * The most of a member's benefits HMRC lets them take as a
 * tax-free lump sum, as a percentage.
 *
 * Exported because it is the only part of the commutation rule
 * a member can be told directly — {@link maxLumpSum} is the cap
 * in pounds, which answers "how much" but never "why that
 * much". A consumer explaining the swap needs this figure, and
 * a consumer that writes its own copy of it is one that can
 * drift from the library that applies it.
 */
export const HMRC_LUMP_SUM_CAP_PCT = 25;

/** Commutation options (separate from projection) */
export interface CommutationResult {
  pensionGivenUp: number;
  residualPension: number;
  lumpSum: number;
  maxLumpSum: number;
}

// ── Commutation ─────────────────────────────────────

/**
 * Maximum tax-free lump sum under the HMRC cap.
 *
 * The cap is on the lump sum as a share of the CAPITAL VALUE of
 * the benefits, and taking a lump sum lowers the pension that
 * value is measured from — so the answer is a fixed point, not
 * a percentage of anything the caller already holds. With `c`
 * the cap and `f` the commutation factor, capital value is
 * `20 × residual + lumpSum`, and solving
 *
 *     L = c × (20 × (P − L/f) + L)
 *
 * for L gives the expression below. Written from
 * {@link HMRC_LUMP_SUM_CAP_PCT} rather than from its
 * rearrangement — the familiar `(20P) / (3 + 20/f)` is this
 * same solution with `c = 0.25` already substituted in, which
 * hides the one number a reader would want to check.
 */
export function maxLumpSum(
  adjustedPension: number,
): number {
  const cap = HMRC_LUMP_SUM_CAP_PCT / 100;
  return (
    (20 * cap * adjustedPension)
    / (1 - cap + (20 * cap) / COMMUTATION_FACTOR)
  );
}

/**
 * Calculate commutation at a given fraction of max.
 * ERF/LRF is applied BEFORE commutation (§1.18).
 */
export function commute(
  adjustedPension: number,
  fraction: number,
): CommutationResult {
  invariant(
    fraction >= 0 && fraction <= 1,
    `Commutation fraction must be 0–1, got ${fraction}`,
  );
  const max = maxLumpSum(adjustedPension);
  const lumpSum = max * fraction;
  const pensionGivenUp = lumpSum / COMMUTATION_FACTOR;
  const residualPension = adjustedPension - pensionGivenUp;

  return {
    pensionGivenUp,
    residualPension,
    lumpSum,
    maxLumpSum: max,
  };
}
