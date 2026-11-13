/**
 * A member's pension input period: one tax year's defined benefits per
 * arrangement, at its start and its end, in cash, in the shape paye-calc's
 * `definedBenefitInput` reads (HMRC PTM053301,
 * https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm053301).
 * What counts as one arrangement, and what each holds on a date, are the
 * scheme's facts, so they are decided here and not by a caller.
 */
import {
  refuseBeforePensionInputPeriods, taxYearEndDate, taxYearEndFor,
  taxYearStartDate,
} from '@casomoltd/paye-calc';
import type {
  ArrangementValues, PensionInputPeriod, TaxYearEnd,
} from '@casomoltd/paye-calc';
import {dayBefore} from '../dates.js';
import {invariant} from '../errors.js';
import {isoToDate} from '../iso-date.js';
import type {MemberLedger} from '../pension/ledger.js';
import type {Prices} from '../pension/prices.js';
import {pointsToDecimal} from '../pension/prices.js';
import {schemeYearClosedBy, schemeYearEndFor} from '../pension/scheme-year.js';
import {refuseElectionMismatch} from './service.js';
import type {LegacyHolding} from './service.js';
import type {
  MemberBenefits, RemedyBasis, ServicePeriod,
} from './types.js';
import {
  accruedLedger, finalSalaryHeldOn, finalSalaryValued,
  refuseLeavingAfterDeclared, seed2015, walkDates, walksWindow, windowSeed,
} from './valuation.js';
import type {Built} from './valuation.js';

/** What one arrangement holds on a date, before any early or late
 *  factor, in that date's cash. */
interface HeldInCash {
  readonly pension: number;
  readonly lumpSum: number;
}

/** A career average walk and the period it accrues over. */
interface Pot {
  readonly ledger: MemberLedger;
  readonly period: ServicePeriod;
}

/** The career average walks every period in one price series reads: the
 *  2015 Section's own, and the remedy window's on the 2015 basis. */
interface Walks {
  readonly prices: Prices;
  /** The last tax year end the walks reach. */
  readonly reaches: Date;
  readonly own: Pot;
  /** The remedy window's walk; null where the member has no window. */
  readonly window: Pot | null;
}

/** The dates one period is read at, and the walks that read them. */
interface Reading {
  readonly taxYearEnd: TaxYearEnd;
  readonly opens: Date;
  readonly closes: Date;
  /** The last day of service, where the member leaves on or before
   *  `closes`: the day a final-salary pension is measured at. Null while
   *  they serve the whole year. */
  readonly left: Date | null;
  readonly walks: Walks;
}

/** The call a refusal names. */
const ASKED = 'pensionInputPeriod' satisfies keyof MemberBenefits;

/**
 * Each tax year's pension input period for the member leaving on the date
 * asked, in the cash of the price series `seriesAt` gives for an assumed
 * CPI. Refuses a year before 2016-17, the first tax year that is a pension
 * input period, a leaving after the one declared, an election for a member
 * with no remedy window, and no election for one with a window. Under
 * Finance Act 2004 s.238ZB an arrangement begun after 8 July 2015 has a
 * first period from its start to the next 5 April
 * (https://www.legislation.gov.uk/ukpga/2004/12/section/238ZB). It holds
 * nothing at its start, so it reads as its tax year opening at nil, which
 * `potAt` gives where the walk starts on the day the member joined. A
 * member's statement is as at 31 March, and a year opening before it, or a
 * leaving before it, throws `BeforeStatement`: the statement gives no
 * balance there (docs/how-it-works.md#where-the-2015-sections-ledger-starts).
 *
 * - **An arrangement per section paid from:** the legacy section, with its
 *   remedy window on either basis, since both are paid from it; and the
 *   2015 Section. Our reading: Finance Act 2004 s.152 defines an
 *   arrangement only as "an arrangement relating to the member under the
 *   pension scheme", and no source read here splits the NHS scheme.
 * - **Each value is held "as if" at the pension age** (PTM053301 step 1):
 *   before any early or late factor.
 * - **The opening value** is what is held at the close of the day before
 *   the year, 5 April, and the closing value at the close of the 5 April
 *   ending it; a revaluation falls in the year its date does.
 * - **Every year closes on its 5 April**, the year the member leaves in
 *   included: Finance Act 2004 s.234(5) values the pension as payable "if
 *   the individual became entitled to payment of it at the end of the
 *   pension input period"
 *   (https://www.legislation.gov.uk/ukpga/2004/12/section/234). A leaver's
 *   year holds the pay to the last day of service and nothing after it.
 * - **The leaver index adjustment counts from the April it is applied
 *   in**, the uplift that opens the scheme year after the leaving, as
 *   every other revaluation falls in the year its date does. NHSBSA
 *   revalues the final year "from 6 April the following scheme year"
 *   (https://faq.nhsbsa.nhs.uk/knowledgebase/article/KA-29075/en-us) and
 *   DHSC's 2023 consultation response has retiring members receive it "on
 *   6 April". Our reading: both date when it is applied, and no source
 *   read here says whether a retirement year's closing value, which adds
 *   back "the annual rate of the pension to which the individual became
 *   entitled" (s.236(8B)), carries it sooner. `at()` is not this reading:
 *   it prices a drawing with the adjustment, as Sch 9 para 5 defines the
 *   retirement pension.
 * - **The period's `cpi`** is the September CPI before the year, from the
 *   same series: the Order's figure where the series reads published ones.
 *
 * A caller reads year after year, so the walks are kept per CPI and
 * leaving: a walk reads the same balance on a date whatever happens after
 * it, so one walked to its last year's end values every year before it.
 */
export function inputPeriods(
  b: Built, seriesAt: (assumedCpi: number) => Prices,
): MemberBenefits['pensionInputPeriod'] {
  const kept = new Map<string, Walks>();
  return (end, choices, assumedCpi) => {
    const basis = choices.remedy.kind;
    const leaving = isoToDate(choices.leaving);
    refuseLeavingAfterDeclared(ASKED, b, leaving);
    refuseElectionMismatch(ASKED, b.remedy, basis);
    refuseBeforePensionInputPeriods(ASKED, end);
    const closes = taxYearEndDate(end);
    const key = `${String(assumedCpi)} ${choices.leaving}`;
    const sofar = kept.get(key);
    const walkedFarEnough = sofar !== undefined && closes <= sofar.reaches;
    const walks = walkedFarEnough
      ? sofar
      : walksTo(b, seriesAt(assumedCpi), leaving, closes);
    kept.set(key, walks);
    return periodRead(b, basis, {
      taxYearEnd: end,
      // The close of the day before the year opens, 5 April.
      opens: dayBefore(taxYearStartDate(end)),
      closes,
      left: leaving <= closes ? leaving : null,
      walks,
    });
  };
}

/** The walks in `prices` for a member leaving on `leaving` that reach
 *  `closes`, and on to the pension age where that is later, so a caller
 *  reading year by year walks once. */
function walksTo(
  b: Built, prices: Prices, leaving: Date, closes: Date,
): Walks {
  const reaches = closes < b.npaOn
    ? taxYearEndDate(taxYearEndFor(b.npaOn))
    : closes;
  const dates = walkDates(b, leaving);
  // The scheme year `reaches` falls in, whose revaluation a 5 April reads
  // where the Order was applied on 1 April.
  const through = schemeYearEndFor(reaches);
  const window = b.legacy?.window ?? null;
  return {
    prices,
    reaches,
    own: {
      ledger: accruedLedger(b, {
        window: b.ordinary2015, seed: seed2015(b), prices,
      }, dates, through),
      period: b.ordinary2015,
    },
    window: window === null
      ? null
      : {
        ledger: accruedLedger(b, {
          window, seed: windowSeed(window), prices,
        }, dates, through),
        period: window,
      },
  };
}

/** One tax year's period, read off the walks. */
function periodRead(
  b: Built, basis: RemedyBasis, r: Reading,
): PensionInputPeriod {
  const arrangements: ArrangementValues[] = [];
  if (b.legacy !== null) {
    arrangements.push(legacyArrangement(b, b.legacy, basis, r));
  }
  const ownOpenedByClose = isoToDate(b.ordinary2015.from) <= r.closes;
  if (ownOpenedByClose) {
    arrangements.push(valuesOver((on) => ({
      pension: potAt(r.walks.own, on), lumpSum: 0,
    }), r));
  }
  // An Order is labelled by the scheme year that has just closed when it
  // is applied, and its figure is the September CPI before the tax year.
  const order = r.walks.prices.cpiFor(schemeYearClosedBy(r.opens));
  return {
    taxYearEnd: r.taxYearEnd, arrangements, cpi: pointsToDecimal(order.cpi),
  };
}

/** The legacy section: its final-salary service, and on the 2015 basis
 *  the remedy window's career average pot beside it. */
function legacyArrangement(
  b: Built, legacy: LegacyHolding, basis: RemedyBasis, r: Reading,
): ArrangementValues {
  const walked = walksWindow(basis);
  const pot = walked ? r.walks.window : null;
  // `inputPeriods` refused the 2015 basis for a member with no window,
  // and the walks hold one wherever the member has it.
  invariant(!walked || pot !== null,
    'a 2015 basis with no remedy window walked');
  const valued = finalSalaryValued(legacy, basis);
  return valuesOver((on) => {
    const finalSalary = finalSalaryHeldOn(b, valued, on, r.left);
    const career = pot === null ? 0 : potAt(pot, on);
    return {
      pension: r.walks.prices.payAt(finalSalary.pension, on) + career,
      lumpSum: r.walks.prices.payAt(finalSalary.automaticLumpSum, on),
    };
  }, r);
}

/** A career average pot on `on`, as the scheme has applied it by then:
 *  nothing before its period opens. */
function potAt({ledger, period}: Pot, on: Date): number {
  return isoToDate(period.from) > on ? 0 : ledger.appliedAt(on);
}

/** One arrangement's values at the period's two ends. */
function valuesOver(
  heldAt: (on: Date) => HeldInCash, {opens, closes}: Reading,
): ArrangementValues {
  const opening = heldAt(opens);
  const closing = heldAt(closes);
  return {
    pensionOpening: opening.pension,
    pensionClosing: closing.pension,
    lumpSumOpening: opening.lumpSum,
    lumpSumClosing: closing.lumpSum,
  };
}
