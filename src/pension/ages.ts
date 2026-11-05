/**
 * The ages a member's NHS pension turns on: each section's pension age, the
 * 2015 Scheme's from their date of birth, and the earliest age they can choose
 * to draw, from when they first joined.
 *
 * NORMAL PENSION AGE in the 2015 Scheme = the member's State Pension age, with
 * a floor of 65 (NHSBSA 2015 Members' Guide V13, May 2024, archived as SA-38 in
 * docs/source-archive.md). The SPA timetable is legislated — Pensions Acts
 * 1995/2007/2011/2014 — and reproduced in gov.uk's "State Pension age timetable",
 * https://www.gov.uk/government/publications/state-pension-age-timetable
 * (last updated 15 May 2014; the legislated dates have not changed since — the
 * 2023 SPA review left them as enacted).
 *
 * Whole years only. The Acts phase each rise through narrow transitional birth
 * cohorts whose exact SPA is 65/66/67 plus some months; `normalPensionAge`
 * returns the NEXT whole year for those cohorts (66/67/68). Rounding up is
 * member-conservative, in the same spirit as the ERF part-month round-up (GAD
 * 2019 guidance §2.3): a projection anchored on the later NPA can understate
 * early-retirement pension by a few months' factor, never overstate it. Callers
 * needing month-exact SPA for the transitional cohorts need the per-cohort tables
 * in the Acts, which this library deliberately does not transcribe.
 *
 * MINIMUM PENSION AGE: who the law's rise reaches, and what everyone else
 * keeps. The rule, its source and what it leaves out are in
 * docs/how-it-works.md#minimum-pension-age.
 */

import {minimumPensionAge} from '@casomoltd/paye-calc';
import {earliest} from '../dates.js';
import {invariant} from '../errors.js';
import {isoDate, isoToDate} from '../iso-date.js';
import type {IsoDate} from '../iso-date.js';

/**
 * The fixed pension ages the legacy sections' factors are measured from,
 * named for the section that sets each: DHSC_PETITION_779519, archived as SA-59
 * in docs/source-archive.md. The factor tables are keyed by pension age, and
 * these are the only two a legacy benefit has; the 2015 Section's is the
 * member's own normal pension age.
 */
export const LEGACY_PENSION_AGES = {
  section1995: 60,
  section2008: 65,
} as const;

/** The last day a member can have first joined and not be reached by the rise:
 *  DHSC_PETITION_779519, archived as SA-59 in docs/source-archive.md. */
export const MPA_RISE_JOINED_AFTER = isoDate('2021-11-03');

/** The age earlier joiners keep. DHSC_PETITION_779519 says the rise starts from
 *  it and names only who the rise reaches, so that they keep it is an inference,
 *  declared in docs/how-it-works.md#minimum-pension-age. */
export const MPA_KEPT_AGE = 55;

/**
 * 2015 scheme floor (Members' Guide V13). Everyone born before
 * the first band below has SPA ≤ 65 (women's pre-equalisation
 * SPA was lower still), so the floor is their NPA.
 */
const NPA_FLOOR = 65;

/**
 * Each band starts where the timetable first exceeds the
 * previous whole year; the value is that rise's target age.
 * Boundaries are dates of birth from gov.uk's timetable:
 *  - 6 Dec 1953 — first cohort with SPA above 65
 *    (Pensions Act 2011; phased to 6 Oct 1954, then exactly 66)
 *  - 6 Apr 1960 — first cohort above 66, "66 years and 1 month"
 *    (Pensions Act 2014; phased to 5 Mar 1961, then exactly 67)
 *  - 6 Apr 1977 — first cohort above 67
 *    (Pensions Act 2007; phased to 5 Apr 1978, then exactly 68)
 */
const SPA_BANDS = [
  {from: isoToDate(isoDate('1953-12-06')), npa: 66},
  {from: isoToDate(isoDate('1960-04-06')), npa: 67},
  {from: isoToDate(isoDate('1977-04-06')), npa: 68},
] as const;

/**
 * Normal pension age for a 2015-scheme member born on
 * `dateOfBirth`, in whole years (see the module header for the
 * transitional-cohort rounding).
 */
export function normalPensionAge(dateOfBirth: Date): number {
  invariant(
    !Number.isNaN(dateOfBirth.getTime()),
    'normalPensionAge: invalid dateOfBirth',
  );
  let npa = NPA_FLOOR;
  for (const band of SPA_BANDS) {
    if (dateOfBirth >= band.from) npa = band.npa;
  }
  return npa;
}

/**
 * The earliest age a member can choose to draw a pension, other than through
 * ill health. It depends on two dates:
 *
 * - **When they first joined.** DHSC says the rise reaches 2015 Scheme members
 *   "who joined the scheme after 3 November 2021" (DHSC_PETITION_779519,
 *   https://petition.parliament.uk/petitions/779519?reveal_response=yes,
 *   archived as SA-59 in docs/source-archive.md). A later period's date would
 *   tell a long-serving member 57, so this reads their FIRST joining.
 * - **When they draw.** Only for a member the rise reaches, and only before it
 *   takes effect: until 6 April 2028 the law's minimum is still 55 (Finance Act
 *   2004 s.279(1), through paye-calc's `minimumPensionAge`).
 *
 * Asks only for the joining dates, which a `Member` has, so this directory stays
 * below `member-benefits.ts`.
 */
export function memberMinimumPensionAge(
  member: {readonly service: readonly {readonly joined: IsoDate}[]},
  drawingOn: Date,
): number {
  if (member.service.length === 0) {
    throw new RangeError('member: no service declared');
  }
  const firstJoined = earliest(...member.service.map((p) => isoToDate(p.joined)));
  const law = minimumPensionAge(drawingOn);
  const reached = firstJoined > isoToDate(MPA_RISE_JOINED_AFTER);
  return reached ? law : Math.min(MPA_KEPT_AGE, law);
}
