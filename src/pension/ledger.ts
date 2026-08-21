/**
 * The member's pension as a balance-forward periodic ledger.
 *
 *   closing(N) = [closing(N−1) × (1 + uplift(N)) + earned(N)]
 *                × factor(N) − cash(N)
 *
 * One uniform row per scheme year. `factor` is 1 and `cash` is 0
 * on every row but the retirement one, so there is no branch in
 * the recurrence — only a multiplier that is usually the
 * identity, the same trick as an uplift of zero.
 *
 * **The order is load-bearing.** The pot is revalued FIRST and
 * the year's slice added after, so a slice earns no revaluation
 * in the scheme year it is earned. The other order overstates a
 * real statement by 3.2% while every internal test still passes.
 *
 * This is a READ MODEL, not a book of record: it is rebuilt from
 * source on every call, never stored, and every row is frozen at
 * construction.
 */

import {invariant} from '../errors.js';
import {periodInYearsMonths} from '../dates.js';
import type {FactorProvenance} from '../gad/factor-table.js';
import type {Prices} from './prices.js';
import type {AppliedUplift, MemberPhase} from './uplift.js';
import {openingUpliftFor, phaseAt} from './uplift.js';
import type {LedgerSeed} from './seed.js';
import {
  schemeYearEndDate,
  schemeYearEndFor,
  schemeYearStartDate,
} from './seed.js';

/** The retirement event, recorded on the year it falls in. */
export interface AppliedDrawing {
  /** The retirement date itself — drawing is date-based, by
   * years and months from NPA, not annual. */
  readonly on: Date;
  readonly factor: number;
  readonly kind: 'erf' | 'lrf';
  /** Which issue of which table the factor came from. */
  readonly provenance: FactorProvenance;
  /** Pension given up and cash taken, or null if none was. */
  readonly commuted: {
    readonly pensionGivenUp: number;
    readonly lumpSum: number;
  } | null;
}

/** One scheme year, accounted for the way the scheme accounts
 * for it. Every field is nominal £/yr unless said otherwise. */
export interface LedgerYear {
  /** Scheme year END — 2026 for 2025/26. The same key the
   * revaluation table uses, so a row joins by value. */
  readonly schemeYearEnd: number;
  readonly phase: MemberPhase;
  /** Nominal pensionable pay for this year, or null when not
   * accruing. In a partial year this is the PAY scaled by months
   * worked — the 1/54 divisor is never pro-rated. */
  readonly pensionableEarnings: number | null;
  /** pensionableEarnings / 54, or 0. */
  readonly earned: number;
  /**
   * Whether this year's earnings are the scheme's own figure or
   * ours. Sits BESIDE the uplift's provenance rather than
   * folded into it, because the two answer different questions:
   * this one is about the PAY, `uplift.from.si` about the RATE.
   *
   * It is the only knownness a projected row carries. Every
   * uplift after the seed is the caller's assumption, so
   * `uplift.from.si` is null on every row and no row is the
   * scheme's own record — the seed is the last figure that was.
   *
   * Always `assumed` where anything was earned: the library has
   * no route to a member's actual year-by-year pay, so every
   * non-zero figure derives from the single pay the caller gave,
   * held flat in real terms. `none` where the member was not
   * accruing, which is the only case with nothing to be wrong
   * about. A statement's own earnings history would add a
   * `given` here, and is the reason this field exists now.
   */
  readonly earningsBasis: 'assumed' | 'none';
  /** Brought INTO this year — last year's closing balance,
   * untouched. The whole banked pot, not a slice. */
  readonly opening: number;
  /** Applied at the START of this year, to the WHOLE opening
   * balance. Null for the first year of membership. */
  readonly uplift: AppliedUplift | null;
  /** opening × (1 + uplift), before this year's slice. */
  readonly revalued: number;
  /** The retirement transform, on the one row where it happens. */
  readonly drawing: AppliedDrawing | null;
  /** (revalued + earned) × factor − pension given up. Before the
   * drawing row an accrued ENTITLEMENT; after it, a pension IN
   * PAYMENT — the same money, with `drawing` the dated record of
   * the moment it changed character. */
  readonly closing: number;
}

/** Named indices into the ledger, not stored copies of it. */
export interface MemberLedger {
  readonly years: readonly LedgerYear[];
  /** Closing balance in force at `date`, in this walk's own
   * money. Flat between steps, which is the whole point.
   *
   * ONE ruler per ledger: a walk is either the cash projection
   * or the today's-money one, and it reports in the money it
   * was built in. Pairing the two is the orchestrator's job —
   * see `pension-projection.ts` — because neither walk can see
   * the other. */
  atDate(date: Date): number;
  /** Closing balance at the end of a scheme year. Years at or
   * before the seed's own year return the seed balance: the
   * walk starts after it, so there is no row, but there is
   * still an answer. */
  closingAt(schemeYearEnd: number): number;
  /** The ACCRUED entitlement at `date`, before any retirement
   * factor. Distinct from `atDate`, which reports the pension
   * actually in force: on the row carrying the drawing those
   * two differ by the ERF or LRF, and asking "what had they
   * built up" must not be answered with the reduced figure. */
  accruedAt(date: Date): number;
  /** The statement-shaped view: the years a member can lay
   * beside the paper. */
  earningsRows(): readonly LedgerYear[];
}

export interface LedgerRequest {
  readonly seed: LedgerSeed;
  /**
   * Pensionable pay in TODAY'S MONEY, held flat.
   *
   * **This is the base case and the only one built.** Every
   * year's slice is the same figure in today's money; what
   * varies is only its expression in each year's own cash,
   * because a nominal model that froze pay in CASH while
   * revaluing the pot above CPI would count inflation twice.
   *
   * Pay progression is a deliberate non-feature — issue #11.
   * Anything that makes a year's slice differ from
   * `pensionableEarnings / 54` in today's money is that unbuilt
   * feature arriving by accident: quote the figure at the
   * statement date and hold it flat in real terms FROM there,
   * and the member collects a 5.6% real pay rise. Held to a
   * date, `earnings in today's money are pay / 54, every year`
   * is the invariant that catches it.
   */
  readonly pensionableEarnings: number;
  /** Last day of service. */
  readonly exitDate: Date;
  readonly retirementDate: Date;
  readonly prices: Prices;
  /** Built once, against the balance standing at retirement. */
  readonly drawingFor: (revalued: number) => AppliedDrawing | null;
  /** Last scheme year to walk. */
  readonly through: number;
}

/** Complete months from `from` to `to`, capped at a scheme year. */
function completeMonths(from: Date, to: Date): number {
  if (to <= from) return 0;
  const {years, months} = periodInYearsMonths(from, to);
  return Math.min(12, years * 12 + months);
}

/**
 * Nominal pay for a year, scaled where the year is partial.
 * The 1/54 divisor is never pro-rated — only the pay is.
 *
 * **Only the JOINING year can be partial.** A member joining in
 * October earns two thirds of that year's pay and their
 * statement says so; there is one join and it is handled one
 * way, so nothing is inconsistent about counting it.
 *
 * Leaving is different: an exit date names a SCHEME YEAR and
 * the member is credited the whole of it, unearned months
 * included. That is a simplification the library should not be
 * making — see `rowFor` and issue #12.
 */
function payFor({
  year, prices, first, accruingFrom, annualPay,
}: {
  year: number;
  prices: Prices;
  first: number;
  accruingFrom: Date | null;
  annualPay: number;
}): number {
  // Today's money in, this year's cash out. One conversion, so
  // the figure cannot pick up growth on the way. At a zero
  // assumption it is the identity, which is what makes the
  // today's-money run credit pay / 54 every year.
  const whole = prices.payAt(annualPay, schemeYearEndDate(year));
  let months = 12;
  if (year === first && accruingFrom !== null) {
    months = completeMonths(
      accruingFrom, schemeYearStartDate(year + 1),
    );
  }
  return (whole * months) / 12;
}

/** One row: revalue the pot, add the year's slice, then apply
 * the retirement transform if this is the year it falls in. */
function rowFor(ctx: {
  year: number;
  opening: number;
  isFirst: boolean;
  req: LedgerRequest;
  first: number;
  exitYear: number;
  retireYear: number;
}): LedgerYear {
  const {year, opening, req, exitYear, retireYear} = ctx;
  const {prices, seed} = req;
  const phase = phaseAt(year, exitYear, retireYear);
  /* ONE RULE FOR LEAVING: an exit date names a SCHEME YEAR.
     The member is active for all of it, earns its whole 1/54
     slice, and from its close the in-service rate stops. Both
     halves are the same decision.

     It is a simplification the LIBRARY makes on the consumer's
     behalf, which is the wrong way round — SI 2015/94 Sch 9
     para 3 is finer on both counts and no caller can reach it.
     See docs/how-it-works.md, "An exit date names a scheme
     year, not a day", for what it costs, and issue #12 for what
     a fix takes. */

  /* The rate is `openingUpliftFor`'s answer, never assembled
     here: the seed inverts this exact step, and the two must ask
     one function rather than each name the phase, the year and
     the series for themselves. */
  const uplift = ctx.isFirst
    ? null
    : openingUpliftFor(
        year - 1, req.exitDate, req.retirementDate, prices,
      );
  const revalued = uplift === null
    ? opening
    : opening * (1 + uplift.percent / 100);

  const pensionableEarnings = phase === 'active'
    ? payFor({
      year, prices, first: ctx.first,
      accruingFrom: seed.accruingFrom,
      annualPay: req.pensionableEarnings,
    })
    : null;
  const earned = pensionableEarnings === null
    ? 0
    : pensionableEarnings / 54;

  const drawing = year === retireYear
    ? req.drawingFor(revalued + earned)
    : null;
  const factor = drawing?.factor ?? 1;
  const givenUp = drawing?.commuted?.pensionGivenUp ?? 0;

  // The one nonsense the shape still permits. An invariant
  // rather than three row subtypes: nothing about a row's
  // BEHAVIOUR differs by phase, so there is nothing to dispatch
  // and subtypes would override nothing.
  invariant(
    phase === 'active' || pensionableEarnings === null,
    `${phase} year ${year} carries pensionable earnings`,
  );

  return Object.freeze({
    schemeYearEnd: year,
    phase,
    pensionableEarnings,
    earned,
    earningsBasis: earned === 0 ? 'none' : 'assumed',
    opening,
    uplift: uplift === null ? null : Object.freeze(uplift),
    revalued,
    drawing: drawing === null ? null : Object.freeze(drawing),
    closing: (revalued + earned) * factor - givenUp,
  });
}

export function buildLedger(req: LedgerRequest): MemberLedger {
  const {seed, exitDate, retirementDate, through} = req;
  const exitYear = schemeYearEndFor(exitDate);
  const retireYear = schemeYearEndFor(retirementDate);
  const first = seed.atSchemeYearEnd + 1;

  const years: LedgerYear[] = [];
  let opening = seed.opening;
  for (let year = first; year <= through; year++) {
    const row = rowFor({
      year,
      opening,
      isFirst: years.length === 0 && seed.basis === 'derived',
      req, first, exitYear, retireYear,
    });
    years.push(row);
    opening = row.closing;
  }

  return readerOver(Object.freeze(years), seed);
}

/**
 * The read side, over rows already walked.
 *
 * Separated from the walk because they are different jobs: one
 * produces the record, the other answers questions of it. Also
 * keeps each honest about its own complexity.
 */
function readerOver(
  frozen: readonly LedgerYear[],
  seed: LedgerSeed,
): MemberLedger {

  /** The earliest date this ledger can answer for: the close of
   * the year its seed sits at. */
  const startsAt = schemeYearEndDate(seed.atSchemeYearEnd);

  /**
   * Asked about a date BEFORE the ledger begins, answer at the
   * beginning instead — the balance is the seed's, and the seed
   * is a figure at a stated date.
   *
   * Returning the seed against the DATE ASKED made leaving
   * earlier look worth more: the cash figure was unchanged but
   * deflated over a longer window, so a member who left in
   * January 2024 read £3,849 in today's money where one who
   * left in January 2025 read £3,607, off the same statement.
   * Monotonic nonsense, and in the one regime where it shows —
   * a statement issued after the member had already left.
   */
  const answerableAt = (date: Date): Date =>
    date < startsAt ? startsAt : date;

  /** Replay the steps up to `date`. `preDrawing` reads the row
   * carrying the retirement event at its pre-factor value. */
  const walkTo = (date: Date, preDrawing: boolean): number => {
    let value = seed.opening;
    for (const row of frozen) {
      if (row.uplift !== null && row.uplift.appliedOn <= date) {
        value = row.revalued;
      }
      if (schemeYearEndDate(row.schemeYearEnd) <= date) {
        value = preDrawing
          ? row.revalued + row.earned
          : row.closing;
      }
    }
    return value;
  };

  return Object.freeze({
    years: frozen,
    atDate: (date: Date) => walkTo(answerableAt(date), false),
    accruedAt: (date: Date) => walkTo(answerableAt(date), true),
    closingAt(schemeYearEnd: number): number {
      if (schemeYearEnd <= seed.atSchemeYearEnd) {
        return seed.opening;
      }
      const row = frozen.find(
        (r) => r.schemeYearEnd === schemeYearEnd,
      );
      invariant(
        row !== undefined,
        `scheme year ${schemeYearEnd} is beyond the walk`,
      );
      return row.closing;
    },
    earningsRows: () =>
      frozen.filter((row) => row.pensionableEarnings !== null),
  });
}

