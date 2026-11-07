/**
 * The ages a member's NHS pension turns on: each section's pension age, the
 * 2015 Section's from their date of birth, and the earliest age they can choose
 * to draw, from when they first joined and when they draw.
 *
 * NORMAL PENSION AGE in the 2015 Section = the member's State Pension age, with
 * a floor of 65 (NHSBSA 2015 Members' Guide V13, May 2024, archived as SA-38 in
 * docs/source-archive.md). The SPA timetable is legislated — Pensions Acts
 * 1995/2007/2011/2014 — and reproduced in DWP's "State Pension age timetable",
 * archived as SA-62 in docs/source-archive.md (last updated 15 May 2014, "following
 * changes included in the Pensions Act 2014"). The legislated dates stand: the
 * government's State Pension age Review 2023 (30 March 2023,
 * https://www.gov.uk/government/publications/state-pension-age-review-2023-government-report)
 * kept the rise to 67 for 2026-2028 and left the rise to 68 as legislated.
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

import {
  minimumPensionAgeFor,
  protectedPensionAgeCutoff,
} from '@casomoltd/paye-calc';
import {dayBefore, earliest, npaDate} from '../dates.js';
import {invariant} from '../errors.js';
import {isoDate, isoDateOf, isoToDate} from '../iso-date.js';
import type {IsoDate} from '../iso-date.js';

/**
 * The fixed pension ages the legacy sections' factors are measured from,
 * named for the section that sets each: DHSC_PETITION_779519, archived as SA-59
 * in docs/source-archive.md, states "The Normal Pension Age in the NHS Pension
 * Scheme is 60 in the 1995 Section, 65 in the 2008 Section". The factor tables
 * are keyed by pension age, and these are the only two a legacy benefit has;
 * the 2015 Section's is the member's own normal pension age.
 */
export const LEGACY_PENSION_AGES = {
  section1995: 60,
  section2008: 65,
} as const;

/** The age from which the scheme gave every member a right to draw: 55 at
 *  the latest, in the 1995 and 2008 Sections and the 2015 Section alike.
 *  DHSC's petition response (DHSC_PETITION_779519, archived as SA-59 in
 *  docs/source-archive.md) and SPPA's NHS Circular 2025/09 (SA-61) say so.
 *  It is the right paye-calc's `minimumPensionAgeFor` protects through the
 *  2028 rise, and so the age an earlier joiner keeps. A lower age kept from
 *  2006 or 2010 is not modelled; what that costs is in
 *  docs/how-it-works.md#minimum-pension-age. */
export const MPA_KEPT_AGE = 55;

/** The last day a member can have first joined and hold that right
 *  immediately before paye-calc's `protectedPensionAgeCutoff()`: the day
 *  before it. For a caller to show; the rule itself compares against the
 *  cut-off. */
export const MPA_RISE_JOINED_AFTER = isoDateOf(
  dayBefore(protectedPensionAgeCutoff()),
);

/**
 * 2015 Section floor (Members' Guide V13). Everyone born before
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
 * Normal pension age for a 2015 Section member born on
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

/** The two dates a member's minimum pension age turns on, besides the day
 *  they draw: when they were born, and when they first joined the scheme. */
export interface JoiningHistory {
  readonly born: IsoDate;
  readonly firstJoined: IsoDate;
}

/**
 * The earliest age a member can choose to draw a pension on `drawing`, other
 * than through ill health. It depends on two dates:
 *
 * - **When they first joined.** The law (Finance Act 2004 Sch 36 para 23ZB,
 *   through paye-calc's `minimumPensionAgeFor`) keeps a protected pension age
 *   for a member who held a right to draw before 57 immediately before its
 *   cut-off. The scheme gave every member that right from 55
 *   (`MPA_KEPT_AGE`), so this is anyone in it by `MPA_RISE_JOINED_AFTER`.
 *   SPPA's NHS Circular 2025/09 (SA-61) keeps it across opting out and
 *   rejoining (Annex A Q9), and a later period's date would tell a
 *   long-serving member 57, so this reads their FIRST joining.
 * - **When they draw.** Only for a member the rise reaches, and only before it
 *   takes effect: until 6 April 2028 the law's minimum is still 55.
 */
export function memberMinimumPensionAge(
  history: JoiningHistory,
  drawing: IsoDate,
): number {
  return drawingTest(history, drawing).minimumAge;
}

/**
 * Whether a member may draw their pension on `drawing`, other than through
 * ill health: on or after the birthday at which they reach their minimum
 * pension age on that day. An age is reached on the birthday, as `npaDate`
 * counts it. A caller walking the ages asks it of each drawing day.
 */
export function mayDrawOn(history: JoiningHistory, drawing: IsoDate): boolean {
  return drawingTest(history, drawing).mayDraw;
}

/** A member's minimum pension age on a drawing day, and whether they have
 *  reached it by then. */
interface DrawingTest {
  readonly minimumAge: number;
  readonly mayDraw: boolean;
}

/** The one place the minimum pension age is applied to a drawing: both
 *  answers at once, for a caller that refuses a drawing and names the age. */
export function drawingTest(
  {born, firstJoined}: JoiningHistory,
  drawing: IsoDate,
): DrawingTest {
  const on = isoToDate(drawing);
  const minimumAge = minimumPensionAgeFor({
    rightFromAge: MPA_KEPT_AGE,
    heldBeforeCutoff: isoToDate(firstJoined) < protectedPensionAgeCutoff(),
  }, on);
  return {minimumAge, mayDraw: on >= npaDate(isoToDate(born), minimumAge)};
}

/** The first day of a member's earliest period: the joining the minimum
 *  pension age reads. */
export function firstJoinedOf(
  member: {readonly service: readonly {readonly joined: IsoDate}[]},
): IsoDate {
  if (member.service.length === 0) {
    throw new RangeError('member: no service declared');
  }
  return isoDateOf(earliest(...member.service.map((p) => isoToDate(p.joined))));
}
