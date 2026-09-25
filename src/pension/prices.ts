/**
 * A run's price series: the CPI each scheme year revalues at, and
 * the conversion of the caller's pay into a given year's money.
 *
 * ── Today's money is a run, not a deflation ─────────
 *
 * Today's money is the SAME projection run with the inflation
 * assumption set to zero, so the pension revalues at 1.5% a year
 * while a member is paying in and not at all once they are
 * deferred. The model runs twice and pairs the two readings;
 * neither one is derived from the other.
 *
 * Dividing a CPI + 1.5 projection by CPI would give
 * 1.5 / (1 + cpi) — 1.47% at a 2% assumption, because the 1.5
 * points are added before the growth and then eaten into by the
 * same year's inflation. Running at zero gives 1.5% flat, which
 * is what the scheme's own rule reduces to when inflation is
 * ignored. It also leaves a stated balance exactly as stated, by
 * construction: at zero there is nothing to restate it by.
 *
 * An uplift rule reads whatever entry it is handed and carries
 * it through to its receipt; it never branches on whether the
 * figure was measured or assumed. WHICH entry is this module's
 * choice, made once per series:
 *
 * - `createPrices` hands out the assumption for every year. The
 *   today's-money run is always this series at zero: an Order is
 *   a nominal rate, and one applied inside that run puts a whole
 *   year of CPI into a reading defined to contain none
 *   (https://github.com/casomoltd/nhs-pay/issues/13).
 * - `createPublishedPrices` is the CASH run as a member's Annual
 *   Benefit Statement prints it. A year a Revaluation Order
 *   covers takes that Order, SI and all, and a past year's pay
 *   is carried into its own year's cash by the same Orders' CPI.
 *   Both halves are nominal, so the Order applies to a balance
 *   in the money it was written for. Beyond the published record
 *   it is the assumption, as above.
 */

import {invariant} from '../errors.js';
import {
  appliedOnFor,
  IN_SERVICE_REVALUATION,
  revaluationFor,
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

/** Where one year's CPI figure is read from. The uplift rule is
 * a function of phase and a series, so `upliftsFor` takes the
 * CHOICE rather than a table and a condition — WHICH series
 * stays the caller's question and never the rule's. A projection
 * makes that choice exactly once, in `openingUpliftFor`. */
export type CpiSource = (schemeYearEnd: number) => CpiEntry;

/** The CPI a projection revalues at, and the money readings
 * that follow from it. The published record itself is
 * `revaluation.ts`'s: a series here reads it through
 * `revaluationFor` and never holds a copy. */
export interface Prices {
  /**
   * The CPI a scheme year revalues at in this series: the
   * caller's assumption, or in a published-history series the
   * Order that set it, its SI carried on the entry.
   *
   * The ONLY rate a projection uses, for every uplift after its
   * seed — see the header, and `openingUpliftFor`, which is where
   * a projection reaches for it.
   */
  cpiFor: CpiSource;
  /**
   * The caller's pay, given in today's money, expressed in the
   * cash of `asAt`.
   *
   * At a zero assumption and no published history it is the
   * identity, which is exactly why the today's-money run credits
   * `pay / 54` every year without anything having to enforce it.
   */
  payAt(todaysMoney: number, asAt: Date): number;
  /** The date this run's today's-money readings are anchored
   *  at — the run date. Named so a caller converting an external
   *  figure INTO that ruler has a target to convert to, rather
   *  than assuming one. */
  readonly asOf: Date;
  /**
   * An amount stated on one date, expressed in the money of
   * another, always at the caller's assumption. In `createPrices`
   * `payAt` is this with `from` pinned to the run date; in
   * `createPublishedPrices` it is not, because past pay there
   * steps by the Orders and a fixed amount does not.
   *
   * NARROW BY INTENT, and read the header above before reaching
   * for it. It carries an EXTERNALLY FIXED cash amount — a
   * statutory cap, a target income — into another year's money.
   * NOT for figures the projection reports: those already arrive
   * in both rulers, and converting one here would produce a
   * second today's money, free to disagree with the run that
   * produced it.
   *
   * On `Prices` rather than loose, so it cannot be called with
   * an assumption that disagrees with the run's.
   */
  valueAt(amount: number, from: Date, to: Date): number;
}

/**
 * How much more a pound of `asAt` money is than a pound of
 * `from` money, under the caller's assumption.
 *
 * **Annual STEPS, never a continuous power.** Pay is a slice of
 * a scheme year and the pot moves once a year, so a ruler that
 * compounded smoothly would drift against both inside every
 * year. The steps are the days the Orders actually land, read
 * from the table: 1 April through 2022, 6 April after, so a
 * date between the two Aprils of any year is read on the right
 * side of that year's step.
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
  const valueAt = (amount: number, from: Date, to: Date): number =>
    amount * inflationFactor(to, from, assumedCpi);

  return {
    /* Frozen at the mint. A `CpiEntry` is the provenance a
       ledger row's rate is READ from rather than a copy of, so
       it reaches a consumer through `row.uplift.from` — one
       level below the freeze on the row itself, and rewritable
       there unless it defends itself. */
    cpiFor: (schemeYearEnd) => Object.freeze({
      schemeYearEnd, cpi: assumedPct, si: null,
    }),
    asOf,
    valueAt,
    /* Literally the same function with `from` pinned to the run
       date — not a second expression that happens to agree. */
    payAt: (todaysMoney, asAt) => valueAt(todaysMoney, asOf, asAt),
  };
}

/**
 * The price series of a cash run read the way an Annual Benefit
 * Statement is: the published record wherever it exists, the
 * caller's assumption beyond it.
 *
 * ONE per-year answer, `publishedCpiFor`, serves both halves, so
 * the pot and the pay can never disagree about which years are
 * published:
 *
 * - a year's uplift is its Order's CPI, SI on the entry;
 * - pay is carried between the run date and any other date, in
 *   either direction, by the CPI of each Order landing between
 *   them, on the days the pot moves. The promotional curve that
 *   built the pay path measures growth ABOVE general pay, so the
 *   general half is still missing, and prices stand in for it.
 *   That reads pay as having kept pace with prices, which the pay
 *   awards of these years did not exactly do: it is the one
 *   estimate here, and the Orders themselves are the record.
 *
 * `valueAt` stays the assumption's: it carries an externally
 * fixed amount between dates, which is not pay.
 */
export function createPublishedPrices(
  assumedCpi: number,
  asOf: Date,
): Prices {
  const assumed = createPrices(assumedCpi, asOf);
  const cpiFor = (schemeYearEnd: number) =>
    publishedCpiFor(schemeYearEnd, assumedCpi * 100);
  return {
    ...assumed,
    cpiFor,
    payAt: (todaysMoney, asAt) =>
      todaysMoney * pricesBetween(asOf, asAt, cpiFor),
  };
}

/**
 * The CPI a scheme year revalues at when the published record is
 * read: its Order where one was made, the assumption after the
 * record ends. A year before the scheme's first Order, or a gap
 * inside the record, has no honest answer and is refused.
 */
function publishedCpiFor(
  schemeYearEnd: number,
  assumedPct: number,
): CpiEntry {
  const order = revaluationFor(schemeYearEnd);
  if (order !== null) {
    return Object.freeze({
      schemeYearEnd, cpi: order.septemberCpiPct, si: order.si,
    });
  }
  const first = IN_SERVICE_REVALUATION[0];
  const last = IN_SERVICE_REVALUATION.at(-1);
  invariant(first !== undefined && last !== undefined,
    'the Revaluation Order table is empty');
  if (schemeYearEnd < first.yearEnd) {
    throw new Error(`No Revaluation Order for ${schemeYearEnd}: `
      + `the scheme's first is ${first.si}, for ${first.yearEnd}`);
  }
  if (schemeYearEnd <= last.yearEnd) {
    throw new Error(`No Revaluation Order recorded for `
      + `${schemeYearEnd}, inside the published record`);
  }
  return Object.freeze({schemeYearEnd, cpi: assumedPct, si: null});
}

/**
 * How much more a pound of `to` money is than a pound of `from`
 * money, stepping on the days the pot moves by each step's own
 * CPI. Symmetric, like `inflationFactor`.
 */
function pricesBetween(from: Date, to: Date, cpiFor: CpiSource): number {
  const ahead = to >= from;
  const [lo, hi] = ahead ? [from, to] : [to, from];
  let factor = 1;
  for (let year = lo.getFullYear(); year <= hi.getFullYear(); year++) {
    const applied = appliedOnFor(year);
    if (applied > lo && applied <= hi) {
      factor *= 1 + cpiFor(year).cpi / 100;
    }
  }
  return ahead ? factor : 1 / factor;
}
