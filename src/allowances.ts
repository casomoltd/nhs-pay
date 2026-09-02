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
 * Coverage is deliberately partial, and absence means UNTRANSCRIBED,
 * not unpaid. England's medical & dental circular sets an on-call
 * availability allowance of its own — annual by nodal point, not per
 * session — transcribed verbatim in `src/circulars/` and outside this
 * lookup entirely, so a missing row here does not mean no such
 * allowance is paid in that nation. Sleep-in payments are absent in
 * the same sense: Scotland's circular uplifts the on-call
 * availability allowance and is silent on them.
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, TAX_YEARS} from '@casomoltd/paye-calc';
import {AFC_SCOTLAND} from './award.js';
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
// Source: "Scotland, PCS(AFC)2026/1" (#sa-13).

const ON_CALL_AVAILABILITY: readonly SessionAllowance[] = [
  {
    nation: NATION_KEYS.scotland,
    year: TAX_YEARS.Y2025_26,
    perSession: 26.51,
    effectiveFrom: '2025-04-01',
    source: AFC_SCOTLAND,
  },
  {
    nation: NATION_KEYS.scotland,
    year: TAX_YEARS.Y2026_27,
    perSession: 27.51,
    effectiveFrom: '2026-04-01',
    source: AFC_SCOTLAND,
  },
];

/**
 * The AfC on-call availability allowance for a nation and year, or
 * `undefined` where no instrument setting one has been transcribed.
 *
 * AfC-specific in its name because the medical & dental circulars set
 * an allowance of the same name on a different footing — annual by
 * nodal point — and a doctor answered from this lookup would get
 * `undefined` where a rate exists.
 *
 * Undefined rather than a throw: unlike the AfC award, which every
 * nation settles every year, most (nation, year) pairs have no
 * transcribed allowance and absence is the normal answer rather than
 * an error. Callers branch on it; routing that through an exception
 * would be an `if` written as a throw.
 */
export function afcOnCallAvailabilityAllowance(
  year: TaxYear,
  nation: Nation,
): SessionAllowance | undefined {
  return ON_CALL_AVAILABILITY.find(
    (a) => a.year === year && a.nation === nation,
  );
}
