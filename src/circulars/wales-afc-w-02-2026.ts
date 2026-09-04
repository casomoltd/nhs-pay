/**
 * Verbatim transcription of NHS Wales pay circular **AfC(W) 02/2026** —
 * "Pay Letter AfC(W) 02/2026", 12 February 2026, effective 1 April 2026.
 *
 * Scope captured: Annex 1 "Agenda for change payscales 2026/2027" — the
 * whole basic-pay table, and the three allowance rates printed beneath
 * it. That is the entire pay content of the circular.
 *
 * The uplift is 3.3% on AfC(W) 02/2025, EXCEPT for the scales set out
 * in AfC(W) 01/2026: the circular states that the Living Wage
 * Foundation payment was an advanced payment and does not take the
 * increase. That is why Band 1 and Band 2 both sit at the same figure
 * and why deriving Wales from a percentage would be wrong — the
 * exception is printed, not inferable.
 *
 * Source: "Wales, AfC(W) 02/2026" — see docs/source-archive.md#sa-45.
 */

import type {FlatBandRow, SteppedBandRow} from './afc-shapes.js';

export const WALES_AFC_W_02_2026 = {
  circular: 'NHS Wales AfC(W) 02/2026',
  nation: 'wales',
  issued: '2026-02-12',
  effectiveFrom: '2026-04-01',

  // ══ Annex 1 — Basic Pay (p3) ══
  // Band 1 is printed above the stepped table, on its own, with no
  // progression columns.
  flatBands: [
    {
      band: 'Band 1',
      salary: 26300,
      note: 'closed to new entrants',
    },
  ] satisfies FlatBandRow[],

  // The stepped table. Bands 2-4 print entry / years / top; bands 5
  // upward add an intermediate step. Band 2's entry and top are the
  // SAME figure — the living-wage floor has compressed the band — and
  // it is transcribed as printed rather than collapsed to one point,
  // because the publisher still prints it as a progression.
  steppedBands: [
    {band: 'Band 2', entry: 26300, yearsToNext: 2, top: 26300},
    {band: 'Band 3', entry: 26300, yearsToNext: 2, top: 27890},
    {band: 'Band 4', entry: 28819, yearsToNext: 3, top: 31626},
    {
      band: 'Band 5', entry: 32557, yearsToNext: 2,
      intermediate: 35114, yearsToTop: 2, top: 39631,
    },
    {
      band: 'Band 6', entry: 40559, yearsToNext: 2,
      intermediate: 42805, yearsToTop: 3, top: 48841,
    },
    {
      band: 'Band 7', entry: 50129, yearsToNext: 2,
      intermediate: 52712, yearsToTop: 3, top: 57365,
    },
    {
      band: 'Band 8a', entry: 58379, yearsToNext: 2,
      intermediate: 61317, yearsToTop: 3, top: 65723,
    },
    {
      band: 'Band 8b', entry: 67583, yearsToNext: 2,
      intermediate: 71952, yearsToTop: 3, top: 78530,
    },
    {
      band: 'Band 8c', entry: 80698, yearsToNext: 2,
      intermediate: 85611, yearsToTop: 3, top: 92984,
    },
    {
      band: 'Band 8d', entry: 95773, yearsToNext: 2,
      intermediate: 101643, yearsToTop: 3, top: 110448,
    },
    {
      band: 'Band 9', entry: 114475, yearsToNext: 2,
      intermediate: 121377, yearsToTop: 3, top: 131732,
    },
  ] satisfies SteppedBandRow[],

  // ══ Annex 1 — allowances, from 01/04/2026 (p4) ══
  // £ per session. Uplifted 3.3% with the scales, per the circular's
  // Action list.
  allowances: {
    sleepingIn: 44.82,
    onCallPublicHoliday: 52.08,
    onCallWeekdayWeekend: 26.05,
  },

  // RECORDED, not transcribed:
  //  · The bank-worker Terms of Engagement clauses (p1-2) — they state
  //    that these same scales apply to bank workers, so they add no
  //    figure. Worth knowing they exist; nothing to hold.
  //  · "All other allowances, fees or payments of the NHS terms and
  //    conditions of service handbook remain unchanged" — a statement
  //    about the handbook, not a rate this circular sets.
} as const;
