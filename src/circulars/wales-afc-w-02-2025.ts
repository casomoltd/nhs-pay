/**
 * Verbatim transcription of NHS Wales pay circular **AfC(W) 02/2025** —
 * "Pay Letter AfC(W) 02/2025", 29 May 2025, effective 1 April 2025.
 *
 * Scope captured: Annex 1 "Agenda for change payscales 2025/2026" — the
 * whole basic-pay table, and the three allowance rates printed beneath
 * it.
 *
 * Wales publishes its OWN ladder, and every figure below is read from
 * this circular rather than derived from England's.
 *
 * Do NOT describe the gap to England as a fixed percentage. It is an
 * observation about two published tables, not a premium any
 * instrument states — no Welsh circular or written statement names
 * one — and it is not even a constant: at 2026-27 the gap is 1.48% at
 * Band 8a entry but 4.07% at Band 2, where the living-wage floor
 * dominates and swamps any uplift. A page that calls it "1.5% applied
 * on top of all pay points" is asserting a mechanism the publisher
 * has not published.
 *
 * Source: "Wales, AfC(W) 02/2025" — see docs/source-archive.md#sa-44.
 */

import type {FlatBandRow, SteppedBandRow} from './afc-shapes.js';

export const WALES_AFC_W_02_2025 = {
  circular: 'NHS Wales AfC(W) 02/2025',
  nation: 'wales',
  issued: '2025-05-29',
  effectiveFrom: '2025-04-01',

  // ══ Annex 1 — Basic Pay (p3) ══
  flatBands: [
    {
      band: 'Band 1',
      salary: 24833,
      note: 'closed to new entrants',
    },
  ] satisfies FlatBandRow[],

  steppedBands: [
    // Band 2's entry and top are the same figure, as printed: the
    // living-wage floor has compressed the band.
    {band: 'Band 2', entry: 24833, yearsToNext: 2, top: 24833},
    {band: 'Band 3', entry: 25313, yearsToNext: 2, top: 26999},
    {band: 'Band 4', entry: 27898, yearsToNext: 3, top: 30615},
    {
      band: 'Band 5', entry: 31516, yearsToNext: 2,
      intermediate: 33992, yearsToTop: 2, top: 38364,
    },
    {
      band: 'Band 6', entry: 39263, yearsToNext: 2,
      intermediate: 41437, yearsToTop: 3, top: 47280,
    },
    {
      band: 'Band 7', entry: 48527, yearsToNext: 2,
      intermediate: 51028, yearsToTop: 3, top: 55532,
    },
    {
      band: 'Band 8a', entry: 56514, yearsToNext: 2,
      intermediate: 59358, yearsToTop: 3, top: 63623,
    },
    {
      band: 'Band 8b', entry: 65424, yearsToNext: 2,
      intermediate: 69653, yearsToTop: 3, top: 76021,
    },
    {
      band: 'Band 8c', entry: 78120, yearsToNext: 2,
      intermediate: 82876, yearsToTop: 3, top: 90013,
    },
    {
      band: 'Band 8d', entry: 92713, yearsToNext: 2,
      intermediate: 98395, yearsToTop: 3, top: 106919,
    },
    {
      band: 'Band 9', entry: 110818, yearsToNext: 2,
      intermediate: 117499, yearsToTop: 3, top: 127523,
    },
  ] satisfies SteppedBandRow[],

  // ══ Annex 1 — allowances, from 01/04/2025 (p4) ══
  allowances: {
    sleepingIn: 43.38,
    onCallPublicHoliday: 50.41,
    onCallWeekdayWeekend: 25.21,
  },

  // RECORDED, not transcribed:
  //  · The bank-worker Terms of Engagement clauses — they state these
  //    same scales apply to bank workers, so they add no figure.
} as const;
