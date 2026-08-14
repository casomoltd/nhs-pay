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
 * ── Two facts this data carries ─────────────────────
 *
 * **The revaluation date moved.** It was 1 April; from 2023 it
 * is 6 April, changed to manage the interaction with the
 * annual allowance. `appliedOn` records it per year rather
 * than letting a scheme-year boundary be assumed.
 *
 * **CPI is sourced independently of the rate**, never derived
 * from it. Taking `septemberCpiPct = ratePct - 1.5` would make
 * the test that checks the +1.5 rule agree with itself, which
 * is no test at all. Years whose CPI could not be sourced
 * separately are omitted rather than back-computed — the 2019,
 * 2020 and 2021 revaluations (3.9%, 3.2%, 2.0%, per the 2020
 * scheme valuation report) are out for exactly that reason.
 *
 * The projection in pension-projection.ts compounds rather
 * than adds — see Dev task 3bcd9af2-a639-8188-81b6-cf1c5af59595.
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
  /** ISO date the revaluation was applied. 1 April through
   * 2022, 6 April from 2023. */
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
    yearEnd: 2022,
    septemberCpiPct: 3.1,
    ratePct: 4.6,
    appliedOn: '2022-04-11',
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
