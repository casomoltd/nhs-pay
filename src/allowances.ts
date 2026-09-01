/**
 * AfC cash allowances — the per-session payments that sit beside the
 * pay scales and are uplifted by the same award.
 *
 * Separate from {@link getAfcScales} because an allowance is not a
 * scale point: it is not annual, not banded, and not pensionable pay
 * in the way a salary is, so folding it into a scale year would put
 * two different kinds of money behind one lookup.
 *
 * Recorded as cited constants for the same reason awards are — the
 * publisher states the cash figure, and the uplifted rate is rounded
 * by the publisher rather than by us. Scotland's 2026-27 rate is
 * £27.51, where 26.51 × 1.0375 is £27.504.
 *
 * Coverage is deliberately partial. Only the nations and allowances
 * whose instruments we have transcribed appear; there is no row
 * standing for "none published". Sleep-in payments in particular are
 * NOT here — Scotland's circular uplifts the on-call availability
 * allowance and is silent on them.
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, TAX_YEARS} from '@casomoltd/paye-calc';
import type {AwardSource} from './award.js';

/** An allowance paid as a flat cash amount per on-call session. */
export interface SessionAllowance {
  readonly nation: Nation;
  readonly year: TaxYear;
  /** £ per session, as printed by the instrument. */
  readonly perSession: number;
  /** ISO date the rate applies from. */
  readonly effectiveFrom: string;
  readonly source: AwardSource;
}

// ── On-call availability allowance ───────────────
//
// Scotland pays a flat rate per on-call session, uplifted with the
// AfC award under PCS(AFC)2015/3 para 7.2. Both rates below come from
// the 2026 circular: it revised the 2025-26 rate from £26.47 to
// £26.51 when the inflation guarantee lifted that year's award to
// 4.4%, and set the 2026-27 rate in the same document.

const PCS_AFC_2026_1: AwardSource = {
  issuer: 'NHS Scotland',
  reference: 'circular PCS(AFC)2026/1',
  url: 'https://www.publications.scot.nhs.uk/files/pcs2026-afc-01.pdf',
  issued: '2026-01-23',
};

const ON_CALL_AVAILABILITY: readonly SessionAllowance[] = [
  {
    nation: NATION_KEYS.scotland,
    year: TAX_YEARS.Y2025_26,
    perSession: 26.51,
    effectiveFrom: '2025-04-01',
    source: PCS_AFC_2026_1,
  },
  {
    nation: NATION_KEYS.scotland,
    year: TAX_YEARS.Y2026_27,
    perSession: 27.51,
    effectiveFrom: '2026-04-01',
    source: PCS_AFC_2026_1,
  },
];

/**
 * The on-call availability allowance for a nation and year, or
 * `undefined` where none is published.
 *
 * Undefined rather than a throw: unlike the AfC award, which every
 * nation settles every year, most (nation, year) pairs have no
 * transcribed allowance and absence is the normal answer rather than
 * an error. Callers branch on it; routing that through an exception
 * would be an `if` written as a throw.
 */
export function onCallAvailabilityAllowance(
  year: TaxYear,
  nation: Nation,
): SessionAllowance | undefined {
  return ON_CALL_AVAILABILITY.find(
    (a) => a.year === year && a.nation === nation,
  );
}
