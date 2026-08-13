/**
 * NHS 2015 scheme normal pension age.
 *
 * NPA = the member's State Pension age, with a floor of 65
 * (NHSBSA 2015 Members' Guide V13, May 2024). The SPA timetable
 * is legislated — Pensions Acts 1995/2007/2011/2014 — and
 * reproduced in gov.uk's "State Pension age timetable"
 * (last updated 15 May 2014; the legislated dates have not
 * changed since — the 2023 SPA review left them as enacted).
 *
 * Whole years only. The Acts phase each rise through narrow
 * transitional birth cohorts whose exact SPA is 65/66/67 plus
 * some months; this function returns the NEXT whole year for
 * those cohorts (66/67/68). Rounding up is member-conservative,
 * in the same spirit as the ERF part-month round-up (GAD 2019
 * guidance §2.3): a projection anchored on the later NPA can
 * understate early-retirement pension by a few months' factor,
 * never overstate it. Callers needing month-exact SPA for the
 * transitional cohorts need the per-cohort tables in the Acts,
 * which this library deliberately does not transcribe.
 */

import {invariant} from './errors.js';

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
  {from: new Date(1953, 11, 6), npa: 66},
  {from: new Date(1960, 3, 6), npa: 67},
  {from: new Date(1977, 3, 6), npa: 68},
] as const;

/**
 * Normal pension age for a 2015-scheme member born on
 * `dateOfBirth`, in whole years (see the module header for the
 * transitional-cohort rounding). The result is what
 * `projectPension` expects as its `npa` input.
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
