/**
 * The caller's CPI assumption, and the one conversion that
 * needs it.
 *
 * Two jobs. The assumption itself, read as a `CpiEntry` for any
 * scheme year, and expressing the caller's pay in the money of
 * a given scheme year, which is that same rate applied.
 *
 * ── There is no deflator here any more ──────────────
 *
 * Today's money is NOT this projection divided by inflation. It
 * is the SAME projection run with the inflation assumption set
 * to zero, so the pension revalues at 1.5% a year while a
 * member is paying in and not at all once they are deferred.
 * `pension-projection.ts` runs the model twice and pairs the
 * two readings; neither one is derived from the other.
 *
 * That is a real difference, not a restatement of the same
 * arithmetic. Dividing a CPI + 1.5 projection by CPI gives
 * 1.5 / (1 + cpi) — 1.47% at a 2% assumption, because the 1.5
 * points are added before the growth and then eaten into by
 * the same year's inflation. Running at zero gives 1.5% flat.
 * The second is what the scheme's own rule reduces to when
 * inflation is ignored, and it is what the tool means by
 * today's money.
 *
 * Deleting the deflator deleted a great deal with it: an anchor
 * date, a face-value window, and the rule that a stated balance
 * must not be restated. At a zero assumption there is nothing
 * to restate, so that property now holds by construction rather
 * than by a clamp — which is why three separate attempts at
 * placing the anchor all failed and this does not.
 *
 * An uplift rule reads whatever entry it is handed and carries
 * it through to its receipt; it never branches on whether the
 * figure was measured or assumed. A PROJECTION is always handed
 * `assumedFor`: an Order is a nominal rate, and the
 * today's-money run is this same model at an assumption of
 * zero, so an Order applied inside it puts a whole year of CPI
 * into a reading defined to contain none. So there is one rate
 * here and it is the assumption.
 *
 * Reading the published record itself is a different question,
 * and `revaluation.ts` answers it: `revaluationFor` for one
 * year, `publishedInflationBetween` for a window, both beside
 * the table they read.
 */

import {appliedOnFor} from '../revaluation.js';

/** One year of the September CPI series, and where it came from. */
export interface CpiEntry {
  /** Scheme year END, e.g. 2016 for the 2015/16 year. */
  readonly schemeYearEnd: number;
  /** Percentage points. Negative is legal: September 2015 was
   * -0.1, which is the scheme's very first uplift. */
  readonly cpi: number;
  /** The Order that published this figure; null when it is the
   * caller's assumption. Never an empty string.
   *
   * This one nullable field IS the published-versus-assumed
   * distinction — not a variant of uplift, not a flag on a ledger
   * row. A year either has the Order that set it or it does not,
   * which leaves pro-rating free to vary independently of it. */
  readonly si: string | null;
}

/** Where one year's CPI figure is read from. The uplift rule is
 * a function of phase and a series, so `upliftsFor` takes the
 * CHOICE rather than a table and a condition — WHICH series
 * stays the caller's question and never the rule's. A projection
 * makes that choice exactly once, in `openingUpliftFor`. */
export type CpiSource = (schemeYearEnd: number) => CpiEntry;

/** The rate a projection revalues at, and the money readings
 * that follow from it. Two members and no third: reading the
 * published record is `revaluation.ts`'s job, and a reader here
 * would be a second answer to a question already answered. */
export interface Prices {
  /**
   * A scheme year read as the caller's ASSUMPTION, whatever the
   * published table holds for it.
   *
   * Not a fallback and not a test seam. This is the ONLY rate a
   * projection uses, for every uplift after its seed and for
   * published years as readily as unpublished ones — see the
   * header, and `openingUpliftFor`, which is where a projection
   * reaches for it.
   */
  assumedFor(schemeYearEnd: number): CpiEntry;
  /**
   * The caller's pay, given in today's money, expressed in the
   * cash of `asAt`.
   *
   * The only conversion left in this module. At a zero
   * assumption it is the identity, which is exactly why the
   * today's-money run credits `pay / 54` every year without
   * anything having to enforce it.
   */
  payAt(todaysMoney: number, asAt: Date): number;
}

/**
 * How much more a pound of `asAt` money is than a pound of
 * `from` money, under the caller's assumption.
 *
 * **Annual STEPS, never a continuous power.** Pay is a slice of
 * a scheme year and the pot moves once a year, so a ruler that
 * compounded smoothly would drift against both inside every
 * year. The steps are the days the Orders actually land, read
 * from the table: 1 April through 2022, 6 April after. Reading
 * them off a hardcoded 6 April put a five-day window either
 * side of every pre-2023 April and counted a step that had not
 * happened.
 *
 * Symmetric, so a year behind the run date is divided by
 * exactly what a year ahead is multiplied by, and a caller
 * converting out and back lands where it started.
 */
export function inflationFactor(
  asAt: Date,
  from: Date,
  assumedCpi: number,
): number {
  const ahead = asAt >= from;
  const steps = ahead
    ? aprilsBetween(from, asAt)
    : aprilsBetween(asAt, from);
  return Math.pow(1 + assumedCpi, ahead ? steps : -steps);
}

/**
 * How many uplift dates fall in `(from, to]` — the days the pot
 * moves, read from the table so that a pre-2023 Order counts on
 * 1 April and a later one on the 6th. Whole steps, never a
 * fraction: the pension does not move on any other day, so
 * neither does the ruler used to read it.
 */
function aprilsBetween(from: Date, to: Date): number {
  let count = 0;
  for (
    let year = from.getFullYear();
    year <= to.getFullYear();
    year++
  ) {
    const applied = appliedOnFor(year);
    if (applied > from && applied <= to) count += 1;
  }
  return count;
}

/**
 * Build the price series for one run.
 *
 * @param assumedCpi Decimal, e.g. 0.02 — the caller's single
 *   assumption, and the rate behind every uplift a projection
 *   applies.
 * @param asOf The date the caller's pay is quoted at — the run
 *   date. Pay is the only thing converted, so this is the only
 *   date the module needs.
 */
export function createPrices(
  assumedCpi: number,
  asOf: Date,
): Prices {
  const assumedPct = assumedCpi * 100;

  return {
    assumedFor: (schemeYearEnd) => ({
      schemeYearEnd, cpi: assumedPct, si: null,
    }),
    payAt: (todaysMoney, asAt) =>
      todaysMoney * inflationFactor(asAt, asOf, assumedCpi),
  };
}
