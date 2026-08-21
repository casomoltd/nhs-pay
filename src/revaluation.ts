/**
 * In-service (CARE) revaluation for the NHS 2015 Scheme.
 *
 * An active member's accrued pension is revalued each year at
 * **CPI + 1.5 percentage points**, where CPI is the Treasury
 * Order figure (September to September). The emphasis is the
 * point: it is ADDED, not compounded. 3.1% CPI gives 4.6%,
 * not the 4.6465% that (1.031 x 1.015) would produce.
 *
 * Sources — the legal one first. Each is named as it appears in
 * docs/source-archive.md, which holds every publisher URL and
 * archived copy so that this file names documents and links
 * none:
 *
 * HM Treasury Public Service Pensions Revaluation Orders, made
 * under s.9(2) Public Service Pensions Act 2013. These are the
 * legal source of the prices figure; each row below carries the
 * SI that made it, and an SI number resolves on
 * legislation.gov.uk without a link from here.
 *
 * "HM Treasury HCWS437 — Public Service Pension
 * Scheme Indexation and Revaluation 2025", the
 * Chief Secretary's annual written ministerial statement. Its
 * per-scheme table gives NHS active revaluation as 3.2%
 * independently of the Order and of the valuation report, and
 * states why the date moved to 6 April.
 *
 * "SPPA NHS Circular 2023/01 — pension indexation and CARE
 * revaluation" — the clearest annual statement of the exact NHS
 * in-service rate. Scotland, but the same CPI + 1.5% rule and
 * the same rate as England and Wales.
 *
 * "NHS Pension Scheme Valuation Report 2020", Appendix E
 * "Inter-valuation events" — the in-service revaluation as
 * ACTUALLY APPLIED, year by year from April 2016. This is the
 * rate column's source, and it is independent of the orders.
 *
 * "SI 2015/94 Sch 9 para 3 — revaluation": the NHS Pension
 * Scheme Regulations 2015 add 1.5 to the prices "increase or
 * decrease", and pro-rate a leaver's final year by COMPLETE
 * MONTHS.
 *
 * "NHSBSA KA-02728 — how your pension is revalued", on how it is
 * applied to members and on the date change below.
 *
 * Cross-checked against the "Revaluation" column of a member's
 * Annual Benefit Statement (2015 Section, updated to
 * 31/03/2025; name and membership number redacted), which
 * quoted 4.6, 11.6, 8.2 and 3.2 for the years to 2025 — the
 * rates above as actually applied to a real record, rather
 * than as legislated. Nothing else from that document is used
 * here: the earnings beside that column are the member's.
 * Archived as "Annual Benefit Statement, 2015 Section,
 * redacted" — see docs/source-archive.md.
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
   * to a different instrument. That is the trap on the 2022
   * row, where 11 April is the date a search turns up. */
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

/**
 * The date the pot moves for a given scheme year: 6 April from
 * 2023, 1 April before it — read off the table, never assumed.
 *
 * Lives here rather than with the uplift rule because two
 * callers need it and they must agree: the pension steps on
 * these days, and so must the ruler that reads it. When they
 * disagreed by the five days between 1 and 6 April, a ruler
 * anchored in the pre-2023 era counted its own anchor step and
 * deflated a year that had not passed.
 */
export function appliedOnFor(yearEnd: number): Date {
  const published = revaluationFor(yearEnd);
  if (published === null) return new Date(yearEnd, 3, 6);
  const [y, m, d] = published.appliedOn.split('-').map(Number);
  // Built LOCAL, matching every other date in this library:
  // parsing the ISO string gives UTC midnight, and under BST
  // the two conventions sit an hour apart.
  return new Date(y, m - 1, d);
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
