/**
 * In-service (CARE) revaluation for the NHS 2015 Scheme.
 *
 * An active member's accrued pension is revalued each year at
 * **CPI + 1.5 percentage points**, where CPI is the Treasury
 * Order figure (September to September). The emphasis is the
 * point: it is ADDED, not compounded. 3.1% CPI gives 4.6%,
 * not the 4.6465% that (1.031 x 1.015) would produce.
 *
 * Sources — the legal one first:
 *
 * HM Treasury Public Service Pensions Revaluation Orders, made
 * under s.9(2) Public Service Pensions Act 2013. These are the
 * legal source of the prices figure; each row below carries
 * the SI that made it.
 *   https://www.legislation.gov.uk/secondary/public+service+pensions
 *
 * Chief Secretary's annual written ministerial statement,
 * which publishes a per-scheme active revaluation table.
 *   https://questions-statements.parliament.uk/written-statements/detail/2025-02-11/hcws437
 *
 * SPPA NHS circulars — the clearest annual statement of the
 * exact NHS in-service rate. Scotland, but the same CPI + 1.5%
 * rule and the same rate as England and Wales.
 *   https://pensions.gov.scot/sites/default/files/2023-02/2023-01_-_NHS_Circular_-_Pension_Indexation_and_CARE_Revaluation.pdf
 *
 * NHS Pension Scheme Valuation Report 2020, Appendix E
 * "Inter-valuation events" — the in-service revaluation as
 * ACTUALLY APPLIED, year by year from April 2016. This is the
 * rate column's source, and it is independent of the orders.
 *   https://www.nhsbsa.nhs.uk/sites/default/files/2024-04/NHS%20Pension%20Scheme%20Valuation%20Report%202020.pdf
 *
 * NHS Pension Scheme Regulations 2015, Sch 9 para 3 — adds 1.5
 * to the prices "increase or decrease", and pro-rates a
 * leaver's final year by COMPLETE MONTHS.
 *   https://www.legislation.gov.uk/uksi/2015/94/schedule/9/paragraph/3
 *
 * NHSBSA, on how it is applied to members and on the date
 * change below.
 *   https://faq.nhsbsa.nhs.uk/knowledgebase/article/KA-02728/en-us
 *
 * Cross-checked against the "Revaluation" column of a member's
 * Annual Benefit Statement (2015 Section, updated to
 * 31/03/2025; name and membership number redacted), which
 * quoted 4.6, 11.6, 8.2 and 3.2 for the years to 2025 — the
 * rates above as actually applied to a real record, rather
 * than as legislated. Nothing else from that document is used
 * here: the earnings beside that column are the member's.
 *   https://drive.google.com/file/d/1UJ8FIXC-6JbLOHIHZ3fbvqBLyTG-noL3/view
 *
 * ── Three facts this data carries ───────────────────
 *
 * **The revaluation date moved.** It was 1 April; from 2023 it
 * is 6 April, changed to manage the interaction with the
 * annual allowance. `appliedOn` records it per year rather
 * than letting a scheme-year boundary be assumed.
 *
 * **CPI is sourced independently of the rate**, never derived
 * from it. Taking `septemberCpiPct = ratePct - 1.5` would make
 * the test that checks the +1.5 rule agree with itself, which
 * is no test at all. So the two columns come from two
 * documents that do not cite each other: prices from each
 * Treasury Order's own operative words, and the rate AS
 * APPLIED from the 2020 valuation report's inter-valuation
 * table. They agree on all eleven years.
 *
 * **A negative prices figure is carried through, not floored.**
 * September 2015 CPI was -0.1% and the 2016 order specifies a
 * DECREASE. The scheme applied 1.4% — that decrease with 1.5
 * added — because Sch 9 para 3 of the 2015 Regulations says to
 * add 1.5 to the percentage increase "or decrease" in prices.
 * The zero floor people expect belongs to a different
 * instrument: the Pensions Increase (Review) Order, which gave
 * deferred members and pensions in payment 0.0% that same
 * April. Active and deferred genuinely diverge in a deflation
 * year, so neither can be modelled as the other.
 *
 * ── This table is COMPLETE ──────────────────────────
 *
 * The 2015 Scheme began on 1 April 2015, so the first
 * in-service revaluation was applied in April 2016. All eleven
 * years to 2026 are here, which is what lets a projection walk
 * a member's whole membership rather than only the part since
 * their statement. `revaluationFor` still returns null rather
 * than guessing for a year not held — which now means only a
 * year whose order has not yet been made.
 *
 * The projection in pension-projection.ts compounds rather
 * than adds — https://github.com/casomoltd/nhs-pay/issues/10
 *
 * ── Not this table ──────────────────────────────────
 *
 * Deferred 2015 benefits and all pensions in payment rise by
 * CPI ALONE, under the Pensions Increase (Review) Orders — a
 * different instrument. For 1995/2008 practitioners the
 * equivalent uplift is earnings dynamisation, not this.
 */

/** One scheme year's revaluation, and what set it. */
export interface RevaluationYear {
  /** Scheme year END, e.g. 2022 for the 2021/22 year. */
  readonly yearEnd: number;
  /** The Treasury Order prices figure — the previous
   * September's CPI, as a percentage. Sourced, not derived. */
  readonly septemberCpiPct: number;
  /** The in-service revaluation applied, as a percentage. */
  readonly ratePct: number;
  /** ISO date the MEMBER'S POT moves — not the date the order
   * commences. Every Revaluation Order commences 1 April; the
   * NHS scheme moved its own application to 6 April from 2023
   * to manage the annual-allowance interaction, and SI
   * 2026/254 accommodates that with an express later date for
   * specific schemes. So: 1 April through 2022, 6 April from
   * 2023.
   *
   * Not the Pensions Increase date either, which is a third
   * date again (11 April in 2022, 6 April in 2026) belonging
   * to a different instrument. The 2022 row read 2022-04-11
   * for exactly that reason until it was corrected. */
  readonly appliedOn: string;
  /** The statutory instrument that made it. */
  readonly si: string;
}

/** The bonus the scheme adds to CPI while a member is paying
 * in, in PERCENTAGE POINTS. Added, never compounded. */
export const ACTIVE_REVAL_BONUS_PCT = 1.5;

/** In-service revaluation, oldest first. Extend when the next
 * Revaluation Order is made — a year's rate is known months
 * before the year it applies to ends. */
export const IN_SERVICE_REVALUATION: readonly RevaluationYear[] = [
  {
    // The scheme's FIRST uplift, and the only one from a
    // negative prices figure: September 2015 CPI was -0.1%
    // and the order says so in terms ("a decrease of 0.1 per
    // cent"). The scheme added 1.5 to that decrease rather
    // than flooring it at zero first, which is why this row
    // is 1.4 and not 1.5 - see the header. Its SI is titled
    // "Revaluation (Prices) Order"; later years drop the
    // qualifier.
    yearEnd: 2016,
    septemberCpiPct: -0.1,
    ratePct: 1.4,
    appliedOn: '2016-04-01',
    si: 'SI 2016/438',
  },
  {
    yearEnd: 2017,
    septemberCpiPct: 1.0,
    ratePct: 2.5,
    appliedOn: '2017-04-01',
    si: 'SI 2017/242',
  },
  {
    yearEnd: 2018,
    septemberCpiPct: 3.0,
    ratePct: 4.5,
    appliedOn: '2018-04-01',
    si: 'SI 2018/338',
  },
  {
    yearEnd: 2019,
    septemberCpiPct: 2.4,
    ratePct: 3.9,
    appliedOn: '2019-04-01',
    si: 'SI 2019/455',
  },
  {
    yearEnd: 2020,
    septemberCpiPct: 1.7,
    ratePct: 3.2,
    appliedOn: '2020-04-01',
    si: 'SI 2020/230',
  },
  {
    yearEnd: 2021,
    septemberCpiPct: 0.5,
    ratePct: 2.0,
    appliedOn: '2021-04-01',
    si: 'SI 2021/276',
  },
  {
    yearEnd: 2022,
    septemberCpiPct: 3.1,
    ratePct: 4.6,
    appliedOn: '2022-04-01',
    si: 'SI 2022/215',
  },
  {
    yearEnd: 2023,
    septemberCpiPct: 10.1,
    ratePct: 11.6,
    appliedOn: '2023-04-06',
    si: 'SI 2023/252',
  },
  {
    yearEnd: 2024,
    septemberCpiPct: 6.7,
    ratePct: 8.2,
    appliedOn: '2024-04-06',
    si: 'SI 2024/290',
  },
  {
    yearEnd: 2025,
    septemberCpiPct: 1.7,
    ratePct: 3.2,
    appliedOn: '2025-04-06',
    si: 'SI 2025/252',
  },
  {
    yearEnd: 2026,
    septemberCpiPct: 3.8,
    ratePct: 5.3,
    appliedOn: '2026-04-06',
    si: 'SI 2026/254',
  },
];

/** The published rate for a scheme year, or null where the
 * year isn't published — never a silent fallback. */
export function revaluationFor(
  yearEnd: number,
): RevaluationYear | null {
  return IN_SERVICE_REVALUATION.find(
    (year) => year.yearEnd === yearEnd,
  ) ?? null;
}

/** What prices did between two dates, as far as the published
 * orders reach. */
export interface PublishedInflation {
  /** Compounded CPI factor for every uplift APPLIED in
   * `(from, to]`. 1 when none fall in the window. */
  readonly factor: number;
  /** The date the last counted uplift was applied, or `from`
   * where none were. Everything after it is unpublished and is
   * the caller's problem — normally an assumed rate. */
  readonly publishedTo: Date;
}

/**
 * How much prices rose between two dates, using the Treasury
 * Order figures rather than a forecast.
 *
 * **This exists because a past period is a matter of record.**
 * Restating a member's own statement figure in today's money
 * means dividing out the inflation since the statement was
 * made, and that inflation has already happened and already
 * been legislated. Using an assumed CPI there quietly reports
 * a forecast as history.
 *
 * Found by reconciling the statement this file already cites
 * (updated to 31/03/2025, linked above). Between its date and
 * a reading in August 2026 the orders compound to 1.017 x
 * 1.038, where an assumed 2% over the same window gives about
 * 1.028 — so the figure was restated some 2.7% light, and
 * every projection derived from it inherited the gap.
 *
 * **The uplift date is what counts, not the scheme year.** Each
 * order names the day it applies (1 April through 2022, 6 April
 * from 2023), and a member's statement is dated wherever it
 * falls between two of them — so the window is tested against
 * `appliedOn` and nothing is apportioned within a year.
 *
 * Returns how far the published record actually reaches, so a
 * caller can price the remainder itself rather than being
 * handed a number that silently stops early.
 */
export function publishedInflationBetween(
  from: Date,
  to: Date,
): PublishedInflation {
  let factor = 1;
  let publishedTo = from;
  for (const year of IN_SERVICE_REVALUATION) {
    // Built as a LOCAL date, matching how every other date in
    // this library is constructed. Parsing the ISO string
    // instead makes it UTC midnight, and under BST the two
    // conventions sit an hour apart — which is nothing in
    // money but is enough to stop an exact test being exact,
    // and exactness is the only way to tell this arithmetic
    // is right.
    const [y, m, d] = year.appliedOn.split('-').map(Number);
    const applied = new Date(y, m - 1, d);
    if (applied > from && applied <= to) {
      factor *= 1 + year.septemberCpiPct / 100;
      publishedTo = applied;
    }
  }
  return {factor, publishedTo};
}
