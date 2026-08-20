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
import type {CpiSource, Prices} from './prices.js';
import type {AppliedUplift, MemberPhase} from './uplift.js';
import {upliftsFor} from './uplift.js';
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
   * folded into it, because the two are independent: a year can
   * have a published Order and guessed pay, and usually does.
   *
   * A row is only fully known when its uplift cites an Order
   * AND this is `none`. Saying "published" of the row because
   * the Order is published overstates it — the closing balance
   * is `opening x (1 + uplift) + earned`, and `earned` carries
   * the guess.
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
   * Pay progression is a deliberate non-feature — a painted
   * door in the consumer's assumptions drawer, whose caption
   * states this same assumption back to the reader: "pay is
   * held flat in today's money". Anything that makes a year's
   * slice differ from `pensionableEarnings / 54` in today's
   * money is that unbuilt feature arriving by accident.
   *
   * It arrived once. Quoting the figure at the statement date
   * and holding it flat in real terms FROM there handed the
   * member a 5.6% real pay rise nobody asked for. Held to a
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
 * The uplift applied at the START of scheme year `year`.
 *
 * The Order is the one labelled by the year that just ENDED —
 * SI 2016/438, applied 1 April 2016, opens the year ending 31
 * March 2017. The off-by-one is the scheme's, not ours.
 */
/** Active until the member leaves, deferred until they draw,
 * in payment after. Derived from dates; never entered. */
function phaseAt(
  year: number, exitYear: number, retireYear: number,
): MemberPhase {
  if (year <= exitYear) return 'active';
  return year < retireYear ? 'deferred' : 'inPayment';
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
 * the member is credited the whole of it. That is a
 * simplification, and it is the one that makes the model
 * uniform — see `rowFor`.
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
  cpi: CpiSource;
  first: number;
  exitYear: number;
  retireYear: number;
}): LedgerYear {
  const {year, opening, req, exitYear, retireYear} = ctx;
  const {prices, seed} = req;
  const phase = phaseAt(year, exitYear, retireYear);
  /* ONE RULE FOR LEAVING, and it is a simplification: an exit
     date names a SCHEME YEAR. The member is active for all of
     it, earns its whole 1/54 slice, and from its close the
     in-service rate stops. Both halves of that are deliberate,
     and they are the same decision.

     The regulation is finer-grained on both counts. Sch 9 para
     3 pro-rates a leaver's final year by complete months — so a
     member who served all twelve and left on 31 March collects
     the following April's in-service rate in full, CPI + 1.5
     rather than CPI — and a member who leaves part-way through
     a year earns only the months of pay they worked.

     Modelling either put a special case where the member cannot
     see one. Keeping the uplift made the quoted pension 1.5%
     higher than the point drawn beside it on the same chart at
     the same age. Keeping the pay pro-rata made the year you
     RETIRE in behave unlike every other year you might leave
     in: retiring on a January birthday credited nine twelfths
     of that year, while stopping at any 31 March credited
     twelve, and nothing on screen explained the difference.

     What the calculator draws instead is one line: what an
     Annual Benefit Statement would report at each year end, pay
     held flat, revaluation applied, no inflation. Every year on
     it is a whole year. The joining year is the one exception
     and is not an inconsistency — see `payFor`.

     The cost is stated rather than buried: for a member leaving
     on a year end, one year's 1.5 points; for one retiring
     mid-year, the months between their birthday and the
     following 31 March. Both are the calculator's to declare,
     and it does, in its methods. */
  const uplift = ctx.isFirst
    ? null
    : upliftsFor(phase, ctx.cpi)(year - 1);
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

/**
 * The first scheme year this library is projecting rather than
 * reporting: the one after the stated balance's own.
 *
 * **Exactly one published Order survives the seed** — the one
 * that acts on the stated figure itself. That Order and that
 * balance are both the scheme's own, so the pair is still
 * something a member can check against paper, and the ruler
 * holds still across it.
 *
 * Everything after is projection, and it is projection for a
 * member who has LEFT as much as for one still paying in. That
 * is the correction, and it was not obvious: a leaver's balance
 * stays fully known for as long as the Orders reach, so the
 * rule used to keep applying them. But an Order is a CASH
 * uplift, and carrying cash uplifts through a window the ruler
 * refuses to deflate makes a deferred pension appear to GROW in
 * today's money — the one thing every reader knows it does not
 * do. A member who left in 2025 read £3,660 against a statement
 * saying £3,417, with nothing having happened in between.
 *
 * Beyond the seed the uplift and the ruler both take the
 * assumption, so the CPI in each cancels and deferred reads
 * flat, which is the property that matters. The cost is
 * confined to the CASH column, where a deferred pension grows
 * at the assumption rather than at the Orders actually made.
 *
 * Analytic rather than observed mid-walk, because the ruler's
 * anchor derives from the same boundary and has to be fixed
 * BEFORE the walk begins.
 */
function firstEstimatedYear(
  seedSchemeYearEnd: number,
): number {
  return seedSchemeYearEnd + 1;
}

export function buildLedger(req: LedgerRequest): MemberLedger {
  const {seed, exitDate, retirementDate, through} = req;
  const exitYear = schemeYearEndFor(exitDate);
  const retireYear = schemeYearEndFor(retirementDate);
  const first = seed.atSchemeYearEnd + 1;

  /* A year's Order is applied only while the balance it acts on
     is still fully known. Row `year` is revalued by the entry for
     `year - 1`, so the last Order used is the one for the year
     before the first guessed slice — after that the assumption
     stands in, for the rate as well as the pay.

     Not a scruple about precision: a legislated rate applied to
     a guessed base reads as authority the figure has not earned,
     and the member checking it against their next statement is
     the one who finds out. The same boundary anchors the
     real-terms ruler, so a figure and the money it is quoted in
     change character on the same date. */
  const estimatedFrom = firstEstimatedYear(seed.atSchemeYearEnd);
  const cpi: CpiSource = (schemeYearEnd) =>
    schemeYearEnd < estimatedFrom
      ? req.prices.cpiFor(schemeYearEnd)
      : req.prices.assumedFor(schemeYearEnd);

  const years: LedgerYear[] = [];
  let opening = seed.opening;
  for (let year = first; year <= through; year++) {
    const row = rowFor({
      year,
      opening,
      isFirst: years.length === 0 && seed.basis === 'derived',
      req, cpi, first, exitYear, retireYear,
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

