/**
 * The September CPI series, and the one conversion that needs it.
 *
 * Two jobs. The series itself — published where a Treasury
 * Order exists, the caller's single assumption for every year
 * beyond it — and expressing the caller's pay in the money of
 * a given scheme year, which is that same series applied.
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
 * figure was measured or assumed. WHICH entry it is handed —
 * `cpiFor` or `assumedFor` — is the ledger's call, because only
 * the ledger knows whether the balance the rate acts on is
 * still a record.
 */

import {RevaluationRateUnavailable} from '../errors.js';
import {
  appliedOnFor,
  IN_SERVICE_REVALUATION,
} from '../revaluation.js';

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

/** Where one year's CPI figure is read from. Both readers on
 * `Prices` satisfy it, so a caller that has already chosen
 * between them passes on the choice rather than the condition. */
export type CpiSource = (schemeYearEnd: number) => CpiEntry;

/** The CPI table, and the money readings that follow from it. */
export interface Prices {
  /** September CPI for the scheme year, with its provenance. */
  cpiFor(schemeYearEnd: number): CpiEntry;
  /**
   * The same year read as the caller's ASSUMPTION, whatever the
   * table holds.
   *
   * Not a fallback and not a test seam. A ledger reads this
   * deliberately for a year whose Order would act on a balance
   * the library had already guessed at: a legislated rate on a
   * guessed base is precision in one term and a guess in the
   * other, which reads as an authority the figure has not
   * earned.
   */
  assumedFor(schemeYearEnd: number): CpiEntry;
  /** Is that year's figure an Order's, or ours? Derived from
   * `publishedTo` rather than stored, so the two cannot
   * disagree. */
  isPublished(schemeYearEnd: number): boolean;
  /** Last scheme year carrying a published figure. */
  readonly publishedTo: number;
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

/** Last scheme year a Treasury Order has set. */
const PUBLISHED_TO = Math.max(
  ...IN_SERVICE_REVALUATION.map((year) => year.yearEnd),
);

/**
 * Build the price series for one run.
 *
 * @param assumedCpi Decimal, e.g. 0.02 — the caller's single
 *   assumption for every scheme year beyond the published table,
 *   and for every year the ledger declines to read from it.
 * @param asOf The date the caller's pay is quoted at — the run
 *   date. Pay is the only thing converted, so this is the only
 *   date the module needs.
 */
export function createPrices(
  assumedCpi: number,
  asOf: Date,
): Prices {
  const assumedPct = assumedCpi * 100;

  const assumedFor = (schemeYearEnd: number): CpiEntry => ({
    schemeYearEnd, cpi: assumedPct, si: null,
  });

  const cpiFor = (schemeYearEnd: number): CpiEntry => {
    if (schemeYearEnd > PUBLISHED_TO) return assumedFor(schemeYearEnd);
    const row = IN_SERVICE_REVALUATION.find(
      (year) => year.yearEnd === schemeYearEnd,
    );
    // A year inside the published range that the table does not
    // hold is a hole in the data, never a zero: zero understates
    // silently and compounds over every year after it.
    if (row === undefined) {
      throw new RevaluationRateUnavailable(
        schemeYearEnd, PUBLISHED_TO,
      );
    }
    return {
      schemeYearEnd,
      cpi: row.septemberCpiPct,
      si: row.si,
    };
  };

  return {
    cpiFor,
    assumedFor,
    isPublished: (schemeYearEnd) => schemeYearEnd <= PUBLISHED_TO,
    publishedTo: PUBLISHED_TO,
    payAt: (todaysMoney, asAt) =>
      todaysMoney * inflationFactor(asAt, asOf, assumedCpi),
  };
}
