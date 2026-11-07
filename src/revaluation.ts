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
 * Chief Secretary's annual written ministerial statement. It
 * states why the date moved to 6 April, and its per-scheme table
 * is a source of the applied-rate fixture, independent of the
 * Order and of the valuation report.
 *
 * "SPPA NHS Circular 2023/01 — pension indexation and CARE
 * revaluation" — the clearest annual statement of the exact NHS
 * in-service rate. Scotland, but the same CPI + 1.5% rule and
 * the same rate as England and Wales.
 *
 * "NHS Pension Scheme Valuation Report 2020", Appendix E
 * "Inter-valuation events" — the in-service revaluation as
 * ACTUALLY APPLIED, year by year from April 2016, independent of
 * the orders. No rate is held here: the rule derives it from the
 * Order's CPI (`activeRatePct`), and the applied rates are the
 * test oracle in `tests/fixtures/revaluation-applied.csv`.
 *
 * "SI 2015/94 Sch 9 para 3 — revaluation": the NHS Pension
 * Scheme Regulations 2015 add 1.5 to the prices "increase or
 * decrease", and pro-rate a leaver's final year by COMPLETE
 * MONTHS.
 *
 * "NHSBSA KA-02728 — how your pension is revalued", on how it is
 * applied to members and on the date change below.
 *
 * The fixture is cross-checked against the "Revaluation" column
 * of a member's Annual Benefit Statement (2015 Section, updated
 * to 31/03/2025; name and membership number redacted): the rates
 * as actually applied to a real record, rather than as
 * legislated. Nothing else from that document is used: the
 * earnings beside that column are the member's.
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
 * from it. Taking `septemberCpiPct = rate - 1.5` would make
 * the test that checks the +1.5 rule agree with itself, which
 * is no test at all. So the two come from documents that do
 * not cite each other: prices here, from each Treasury Order's
 * own operative words, and the rate AS APPLIED in a test
 * fixture, from the 2020 valuation report's inter-valuation
 * table and a member's statement.
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
 * their statement. `revaluationFor` returns null rather than
 * guessing for a year not held: one before 2016, or one whose
 * order has not yet been made.
 *
 * ── Not this table ──────────────────────────────────
 *
 * Deferred 2015 benefits and all pensions in payment rise by
 * CPI ALONE, under the Pensions Increase (Review) Orders — a
 * different instrument. For 1995/2008 practitioners the
 * equivalent uplift is earnings dynamisation, not this.
 */

import {schemeYearEnd} from './pension/scheme-year.js';
import type {SchemeYearEnd} from './pension/scheme-year.js';

/** April, as `Date` counts months from nought. */
const APRIL_MONTH_INDEX = 3;
/** The day of April the scheme applies an Order from 2023, and so the day
 *  a year with no Order yet is read as moving on. */
const UPLIFT_DAY_FROM_2023 = 6;

/** One scheme year's revaluation, and what set it. */
export interface RevaluationYear {
  /** Scheme year END, e.g. 2022 for the 2021/22 year. */
  readonly yearEnd: SchemeYearEnd;
  /** The Treasury Order prices figure — the previous
   * September's CPI, as a percentage. Sourced, not derived. */
  readonly septemberCpiPct: number;
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

/** A row as the Orders give it, its year a plain number until minted. */
type RevaluationRow = Omit<RevaluationYear, 'yearEnd'> & {
  readonly yearEnd: number;
};

/** In-service revaluation, oldest first. Extend when the next
 * Revaluation Order is made — a year's rate is known months
 * before the year it applies to ends. */
const REVALUATION_ROWS: readonly RevaluationRow[] = [
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
    appliedOn: '2016-04-01',
    si: 'SI 2016/438',
  },
  {
    yearEnd: 2017,
    septemberCpiPct: 1.0,
    appliedOn: '2017-04-01',
    si: 'SI 2017/242',
  },
  {
    yearEnd: 2018,
    septemberCpiPct: 3.0,
    appliedOn: '2018-04-01',
    si: 'SI 2018/338',
  },
  {
    yearEnd: 2019,
    septemberCpiPct: 2.4,
    appliedOn: '2019-04-01',
    si: 'SI 2019/455',
  },
  {
    yearEnd: 2020,
    septemberCpiPct: 1.7,
    appliedOn: '2020-04-01',
    si: 'SI 2020/230',
  },
  {
    yearEnd: 2021,
    septemberCpiPct: 0.5,
    appliedOn: '2021-04-01',
    si: 'SI 2021/276',
  },
  {
    yearEnd: 2022,
    septemberCpiPct: 3.1,
    appliedOn: '2022-04-01',
    si: 'SI 2022/215',
  },
  {
    yearEnd: 2023,
    septemberCpiPct: 10.1,
    appliedOn: '2023-04-06',
    si: 'SI 2023/252',
  },
  {
    yearEnd: 2024,
    septemberCpiPct: 6.7,
    appliedOn: '2024-04-06',
    si: 'SI 2024/290',
  },
  {
    yearEnd: 2025,
    septemberCpiPct: 1.7,
    appliedOn: '2025-04-06',
    si: 'SI 2025/252',
  },
  {
    yearEnd: 2026,
    septemberCpiPct: 3.8,
    appliedOn: '2026-04-06',
    si: 'SI 2026/254',
  },
];

/** In-service revaluation, oldest first, each year a `SchemeYearEnd`. */
export const IN_SERVICE_REVALUATION: readonly RevaluationYear[] =
  REVALUATION_ROWS.map(
    (row) => ({...row, yearEnd: schemeYearEnd(row.yearEnd)}));

/** The published rate for a scheme year, or null where the
 * year isn't published — never a silent fallback. */
export function revaluationFor(
  yearEnd: SchemeYearEnd,
): RevaluationYear | null {
  return IN_SERVICE_REVALUATION.find(
    (year) => year.yearEnd === yearEnd,
  ) ?? null;
}

/**
 * The date the pot moves for a given scheme year: 6 April from
 * 2023, 1 April before it — read off the table where the year's
 * Order is held, and 6 April, the scheme's day since 2023, for a
 * year whose Order is not yet made.
 *
 * Lives here rather than with the uplift rule because two
 * callers need it and they must agree: the pension steps on
 * these days, and so must the ruler that reads it, or a ruler
 * anchored before 2023 counts its own anchor step five days
 * early and deflates a year that has not passed.
 */
export function appliedOnFor(yearEnd: SchemeYearEnd): Date {
  const published = revaluationFor(yearEnd);
  if (published === null) {
    return new Date(yearEnd, APRIL_MONTH_INDEX, UPLIFT_DAY_FROM_2023);
  }
  const [y, m, d] = published.appliedOn.split('-').map(Number);
  // Built LOCAL, matching every other date in this library:
  // parsing the ISO string gives UTC midnight, and under BST
  // the two conventions sit an hour apart.
  return new Date(y, m - 1, d);
}

