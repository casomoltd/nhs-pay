/**
 * Agenda for Change headline pay awards (consolidated % uplift) by
 * nation and year.
 *
 * The negotiated award is published data, NOT derivable from the
 * scale points: per-point rounding diverges from the headline (e.g.
 * Scotland's 3.75% award computes as ~3.8% from a single band's
 * min-point delta), and staged awards have no single scale ratio. So
 * the award lives here as a cited constant, one per (nation, year),
 * each nation recorded independently because the four nations
 * negotiate separately.
 *
 * Sources (also pinned per-row in tests/fixtures/afc-awards.csv):
 *  - England & Wales: NHS Employers pay circulars —
 *    2025/26 https://www.nhsemployers.org/articles/pay-scales-202526
 *    2026/27 https://www.nhsemployers.org/articles/pay-scales-202627
 *  - Scotland: NHS Scotland circular PCS(AFC)2026/1 — 4.25% for
 *    2025-26 (average 4.4% after the inflation guarantee) and 3.75%
 *    for 2026-27:
 *    https://www.publications.scot.nhs.uk/files/pcs2026-afc-01.pdf
 *  - Northern Ireland: Department of Health (NI) accepted the UK PRB
 *    award, aligned with England (3.6% / 3.3%); 2026/27 subject to
 *    local implementation.
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, TAX_YEARS} from '@casomoltd/paye-calc';
import {AwardUnavailable} from './errors.js';

/** Headline consolidated AfC uplift (%), by nation and year. */
const AFC_AWARDS: Record<
  Nation,
  Partial<Record<TaxYear, number>>
> = {
  [NATION_KEYS.england]: {
    [TAX_YEARS.Y2025_26]: 3.6,
    [TAX_YEARS.Y2026_27]: 3.3,
  },
  [NATION_KEYS.wales]: {
    [TAX_YEARS.Y2025_26]: 3.6,
    [TAX_YEARS.Y2026_27]: 3.3,
  },
  [NATION_KEYS.scotland]: {
    [TAX_YEARS.Y2025_26]: 4.25,
    [TAX_YEARS.Y2026_27]: 3.75,
  },
  [NATION_KEYS.northernIreland]: {
    [TAX_YEARS.Y2025_26]: 3.6,
    [TAX_YEARS.Y2026_27]: 3.3,
  },
};

/**
 * The AfC headline pay award for a nation and year, as a percentage
 * (e.g. `3.75` for 3.75%). Throws {@link AwardUnavailable} for an
 * unrecorded combination rather than defaulting — the caller must
 * name the nation (no silent fallback).
 */
export function afcAward(year: TaxYear, nation: Nation): number {
  const pct = AFC_AWARDS[nation][year];
  if (pct === undefined) {
    throw new AwardUnavailable(year, nation);
  }
  return pct;
}
