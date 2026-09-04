/**
 * Verbatim transcription of the Department of Health (Northern
 * Ireland) circular **HSC (AfC) 06/2025** — "Agenda for Change Pay
 * Arrangements 2025-26", 3 December 2025, effective 1 April 2025.
 *
 * The url carries the publisher's `(6) 2025` filename form; the
 * document's own cover reads 06/2025.
 *
 * Scope captured: Section 1 Basic Pay (the whole table), and Section 2
 * "HSC On-Call Arrangements" (the two allowance rates).
 *
 * **This is the only AfC year Northern Ireland has published.** No
 * 2026/27 pay circular exists: the Health Minister stated a desire to
 * proceed with 3.3% on 12 February 2026 "subject to my budgetary
 * position", and as at the most recent Assembly answer (AQW
 * 49635/22-27, 15 July 2026) he "cannot" pay it "until I have clarity
 * on my Department's budget". HSC staff are still on these rates.
 *
 * **Bands 1 and 2 have NO progression columns.** The circular prints
 * them in the Basic Pay block as single flat figures and starts its
 * entry/interval/top table at Band 3. England's publisher prints Band
 * 2 with an entry point, a two-year interval and a top point — same
 * cash, different published structure. That difference was once lost
 * by copying England's shape across, and it is why this file
 * transcribes the block as printed rather than as England's table.
 *
 * Source: "Northern Ireland, HSC (AfC) 06/2025" — see
 * docs/source-archive.md#sa-52.
 */

import type {FlatBandRow, SteppedBandRow} from './afc-shapes.js';

export const NI_HSC_AFC_06_2025 = {
  circular: 'HSC (AfC) 06/2025',
  nation: 'northern-ireland',
  issued: '2025-12-03',
  effectiveFrom: '2025-04-01',

  // ══ Section 1 — Basic Pay (p2) ══
  // Printed above the stepped table, each a single figure.
  flatBands: [
    {
      band: 'Band 1',
      salary: 24465,
      note: 'closed to new entrants',
    },
    {band: 'Band 2', salary: 24465},
  ] satisfies FlatBandRow[],

  // The stepped table starts at Band 3.
  steppedBands: [
    {band: 'Band 3', entry: 24937, yearsToNext: 2, top: 26598},
    {band: 'Band 4', entry: 27485, yearsToNext: 3, top: 30162},
    {
      band: 'Band 5', entry: 31049, yearsToNext: 2,
      intermediate: 33487, yearsToTop: 2, top: 37796,
    },
    {
      band: 'Band 6', entry: 38682, yearsToNext: 2,
      intermediate: 40823, yearsToTop: 3, top: 46580,
    },
    {
      band: 'Band 7', entry: 47810, yearsToNext: 2,
      intermediate: 50273, yearsToTop: 3, top: 54710,
    },
    {
      band: 'Band 8a', entry: 55690, yearsToNext: 2,
      intermediate: 58487, yearsToTop: 3, top: 62682,
    },
    {
      band: 'Band 8b', entry: 64455, yearsToNext: 2,
      intermediate: 68631, yearsToTop: 3, top: 74896,
    },
    {
      band: 'Band 8c', entry: 76965, yearsToNext: 2,
      intermediate: 81652, yearsToTop: 3, top: 88682,
    },
    {
      band: 'Band 8d', entry: 91342, yearsToNext: 2,
      intermediate: 96941, yearsToTop: 3, top: 105337,
    },
    {
      band: 'Band 9', entry: 109179, yearsToNext: 2,
      intermediate: 115763, yearsToTop: 3, top: 125637,
    },
  ] satisfies SteppedBandRow[],

  // ══ Section 2 — HSC On-Call Arrangements (p3) ══
  // £ per session, from 1 April 2025. The circular states these are
  // reviewed in line with the pay award and that 2025/26 is a 3.6%
  // uplift — the award percentage, printed here rather than in a
  // separate instrument.
  allowances: {
    sleepIn: 41.50,
    onCall: 31.85,
  },

  // RECORDED, not transcribed:
  //  · Section 3 Unsocial Hours Payments (printed p4) — percentage
  //    enhancements on time worked (Saturday/night time plus 47% at
  //    band 1, and so on), keyed to Section 2 of the England handbook.
  //    Enhancements on hours actually worked, not a basic-pay scale.
  //  · The 3.6% award percentage itself is held in `award.ts`, which
  //    is where an award belongs; it appears above only as the
  //    circular's own justification for the allowance uplift.
} as const;
