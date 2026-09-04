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
 * allowance is paid in that nation. Scotland has no sleep-in row
 * for the same reason: its circular uplifts the on-call
 * availability allowance and is silent on them, where Wales's
 * prints a sleeping-in rate.
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, TAX_YEARS} from '@casomoltd/paye-calc';
import {
  AFC_SCOTLAND,
  AFC_W_02_2025,
  AFC_W_02_2026,
} from './sources.js';
import type {DocumentSource} from './document-source.js';

/**
 * Identifiers for the per-session allowances transcribed here.
 *
 * Prefixed by nation because these are NOT the same payment under
 * different names: Scotland's on-call availability allowance and
 * Wales's three rates are set by different instruments, on
 * different footings, and an unprefixed `onCall` would let one be
 * passed where the other is meant and still compile.
 */
export const SESSION_ALLOWANCES = {
  scotlandOnCallAvailability:
    'scotland-on-call-availability',
  walesSleepingIn: 'wales-sleeping-in',
  walesOnCallWeekday: 'wales-on-call-weekday-weekend',
  walesOnCallPublicHoliday:
    'wales-on-call-public-holiday',
} as const;

export type SessionAllowanceId =
  (typeof SESSION_ALLOWANCES)[
    keyof typeof SESSION_ALLOWANCES
  ];

/**
 * The nation whose instrument sets each allowance. Derived from the
 * id rather than written beside it: the two are not independent
 * facts, and a row free to say `walesSleepingIn` for Scotland is a
 * disagreement waiting to be written.
 */
const ALLOWANCE_NATION: Record<SessionAllowanceId, Nation> = {
  [SESSION_ALLOWANCES.scotlandOnCallAvailability]:
    NATION_KEYS.scotland,
  [SESSION_ALLOWANCES.walesSleepingIn]: NATION_KEYS.wales,
  [SESSION_ALLOWANCES.walesOnCallWeekday]: NATION_KEYS.wales,
  [SESSION_ALLOWANCES.walesOnCallPublicHoliday]:
    NATION_KEYS.wales,
};

/** One published rate, as its instrument prints it. */
interface SessionAllowanceRate {
  readonly id: SessionAllowanceId;
  /** The allowance's name as its own instrument prints it. */
  readonly label: string;
  readonly year: TaxYear;
  /** £ per session, as printed by the instrument. */
  readonly perSession: number;
  /** ISO date the rate applies from. */
  readonly effectiveFrom: string;
  readonly source: DocumentSource;
}

/** A published rate with the nation its instrument belongs to. */
export interface SessionAllowance extends SessionAllowanceRate {
  readonly nation: Nation;
}

// ── Per-session allowance rates ──────────────────
//
// Scotland pays a flat rate per on-call session, uplifted with the
// AfC award under PCS(AFC)2015/3 para 7.2. Both rates below come from
// the 2026 circular: it revised the 2025-26 rate from £26.47 to
// £26.51 when the inflation guarantee lifted that year's award to
// 4.4%, and set the 2026-27 rate in the same document.
// Source: "Scotland, PCS(AFC)2026/1" (#sa-13).

const RATES: readonly SessionAllowanceRate[] = [
  // Scotland, PCS(AFC)2026/1 (#sa-13). The 2026 circular revised
  // the 2025-26 rate from £26.47 to £26.51 when the inflation
  // guarantee lifted that year's award to 4.4%, and set the
  // 2026-27 rate in the same document.
  {
    id: SESSION_ALLOWANCES.scotlandOnCallAvailability,
    label: 'On-call availability allowance',
    year: TAX_YEARS.Y2025_26,
    perSession: 26.51,
    effectiveFrom: '2025-04-01',
    source: AFC_SCOTLAND,
  },
  {
    id: SESSION_ALLOWANCES.scotlandOnCallAvailability,
    label: 'On-call availability allowance',
    year: TAX_YEARS.Y2026_27,
    perSession: 27.51,
    effectiveFrom: '2026-04-01',
    source: AFC_SCOTLAND,
  },
  // Wales, AfC(W) 02/2025 and 02/2026, the allowance table on the
  // last page of each. Transcribed, not derived: 02/2026 uplifts
  // by 3.3%, but 25.21 x 1.033 is 26.042 where it prints £26.05,
  // so computing the weekday rate lands a penny out.
  {
    id: SESSION_ALLOWANCES.walesSleepingIn,
    label: 'Sleeping in',
    year: TAX_YEARS.Y2025_26,
    perSession: 43.38,
    effectiveFrom: '2025-04-01',
    source: AFC_W_02_2025,
  },
  {
    id: SESSION_ALLOWANCES.walesOnCallWeekday,
    label: 'On call, weekday or weekend',
    year: TAX_YEARS.Y2025_26,
    perSession: 25.21,
    effectiveFrom: '2025-04-01',
    source: AFC_W_02_2025,
  },
  {
    id: SESSION_ALLOWANCES.walesOnCallPublicHoliday,
    label: 'On call, public holiday',
    year: TAX_YEARS.Y2025_26,
    perSession: 50.41,
    effectiveFrom: '2025-04-01',
    source: AFC_W_02_2025,
  },
  {
    id: SESSION_ALLOWANCES.walesSleepingIn,
    label: 'Sleeping in',
    year: TAX_YEARS.Y2026_27,
    perSession: 44.82,
    effectiveFrom: '2026-04-01',
    source: AFC_W_02_2026,
  },
  {
    id: SESSION_ALLOWANCES.walesOnCallWeekday,
    label: 'On call, weekday or weekend',
    year: TAX_YEARS.Y2026_27,
    perSession: 26.05,
    effectiveFrom: '2026-04-01',
    source: AFC_W_02_2026,
  },
  {
    id: SESSION_ALLOWANCES.walesOnCallPublicHoliday,
    label: 'On call, public holiday',
    year: TAX_YEARS.Y2026_27,
    perSession: 52.08,
    effectiveFrom: '2026-04-01',
    source: AFC_W_02_2026,
  },
];

function withNation(
  rate: SessionAllowanceRate,
): SessionAllowance {
  return {...rate, nation: ALLOWANCE_NATION[rate.id]};
}

/**
 * Every per-session allowance transcribed for a nation and year,
 * in the order its instrument prints them. Empty where none has
 * been transcribed — see this module's header on what absence
 * means.
 */
export function afcSessionAllowances(
  year: TaxYear,
  nation: Nation,
): readonly SessionAllowance[] {
  return RATES
    .filter(
      (r) =>
        r.year === year
        && ALLOWANCE_NATION[r.id] === nation,
    )
    .map(withNation);
}

/**
 * One named allowance for a tax year, or `undefined` where that
 * year has none transcribed.
 *
 * Keyed by allowance id, not by (nation, year): each id belongs to
 * exactly one nation's instrument, so the nation is implied. A
 * `(year, nation)` signature would take an argument it could not
 * honour — asked for Wales it could only ever answer for whichever
 * single allowance the function had been written around, and
 * return `undefined` for the rest as though none were published.
 *
 * Undefined rather than a throw: unlike the AfC award, which every
 * nation settles every year, most (allowance, year) pairs have no
 * transcription and absence is the normal answer rather than an
 * error. Callers branch on it; routing that through an exception
 * would be an `if` written as a throw.
 */
export function sessionAllowance(
  id: SessionAllowanceId,
  year: TaxYear,
): SessionAllowance | undefined {
  const rate = RATES.find(
    (r) => r.id === id && r.year === year,
  );
  return rate && withNation(rate);
}
