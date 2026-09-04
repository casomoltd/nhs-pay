/**
 * Verbatim transcription of NHS Scotland Circular **PCS(AFC)2026/1** —
 * "Pay and Conditions for NHS Staff Covered by the Agenda for Change
 * Agreement", 23 January 2026.
 *
 * **One circular, TWO years.** It updates the two-year settlement of
 * PCS(AFC)2025/5 because the inflation guarantee in that deal was
 * triggered: CPI for calendar 2025 confirmed at 3.4%, so 2025-26 is
 * adjusted by 0.15% and the headline settlement becomes 4.4%, not the
 * 4.25% originally set. That revision re-bases 2026-27, whose 3.75%
 * then applies to the corrected figures. Both years are therefore
 * current as of this document, and both are transcribed here.
 *
 * That revision is the single most expensive thing in this file's
 * history: the superseded 4.25% column stood on 50 Scottish pay points
 * for a year. A foreseeable restatement that nothing was watching for
 * is why `DocumentSource` carries `nextExpected` and why this
 * circular's record dates the next instrument to March 2027 rather
 * than to the annual round.
 *
 * **Read the circular, not the MSG consolidated table.** The
 * Management Steering Group publishes a consolidated handbook table
 * which still prints the ORIGINAL 4.25% rates for 2025-26, and a
 * 2026-27 table raised on that superseded base — so both of its years
 * read low. This qualification sits here, beside the data, because
 * that is the whole reason this layer exists: as a paragraph in a
 * module header it was easy to read past.
 *
 * Scope captured: Annex B, pp8-9 (both years' pay rates, with the
 * published hourly rates) and Annex C, pp10-15 (the "Full pay
 * journey", the column that settles our point labels).
 *
 * **A second superseded table to avoid, beside the MSG one.**
 * PCS(AFC)2025/8 (8 December 2025) prints a full 26-row Scottish
 * 2026-27 pay-and-hourly table built on the PRE-revision base —
 * Band 1 £26,519 / £14.13 against the £26,557 / £14.15 below. It says
 * so itself ("the table will be updated in the event the guarantee is
 * implemented"); it never was, and this circular superseded it seven
 * weeks later. It reads low in exactly the way the MSG table does,
 * and it is what a search for "36 hour" plus "hourly rates" finds
 * first.
 *
 * Source: "Scotland, PCS(AFC)2026/1" — see docs/source-archive.md#sa-13.
 */

import type {AnnexBRow, PayJourneyRow} from './afc-shapes.js';

export const SCOTLAND_PCS_AFC_2026_01 = {
  circular: 'NHS Scotland PCS(AFC)2026/1',
  nation: 'scotland',
  issued: '2026-01-23',

  /**
   * The settlement percentages, as the circular states them.
   *
   * 2025-26's 4.4% is the REVISED figure; 4.25% was the original and
   * is superseded. Held here as the circular's own claim; the award
   * records in `award.ts` are what a consumer reads.
   */
  uplifts: {
    '2025-26': {pct: 4.4, supersededPct: 4.25},
    '2026-27': {pct: 3.75},
  },

  // ══ Annex B — pay rates from 1 April 2025 (p8) ══
  // Hourly rates printed "Based on a 37 Hour Week".
  annexB2025: [
    {band: 'Band 1', point: 1, salary: 25597, hourly: 13.27},
    {band: 'Band 2', point: 1, salary: 25731, hourly: 13.34},
    {band: 'Band 2', point: 2, salary: 27941, hourly: 14.48},
    {band: 'Band 3', point: 1, salary: 28051, hourly: 14.54},
    {band: 'Band 3', point: 2, salary: 30274, hourly: 15.69},
    {band: 'Band 4', point: 1, salary: 30397, hourly: 15.76},
    {band: 'Band 4', point: 2, salary: 33063, hourly: 17.14},
    {band: 'Band 5', point: 1, salary: 33295, hourly: 17.26},
    {band: 'Band 5', point: 2, salary: 35576, hourly: 18.44},
    {band: 'Band 5', point: 3, salary: 41483, hourly: 21.50},
    {band: 'Band 6', point: 1, salary: 41668, hourly: 21.60},
    {band: 'Band 6', point: 2, salary: 43503, hourly: 22.55},
    {band: 'Band 6', point: 3, salary: 50775, hourly: 26.32},
    {band: 'Band 7', point: 1, salary: 50935, hourly: 26.40},
    {band: 'Band 7', point: 2, salary: 52880, hourly: 27.41},
    {band: 'Band 7', point: 3, salary: 59244, hourly: 30.71},
    {band: 'Band 8A', point: 1, salary: 62772, hourly: 32.54},
    {band: 'Band 8A', point: 2, salary: 67762, hourly: 35.12},
    {band: 'Band 8B', point: 1, salary: 74109, hourly: 38.41},
    {band: 'Band 8B', point: 2, salary: 79278, hourly: 41.09},
    {band: 'Band 8C', point: 1, salary: 87526, hourly: 45.37},
    {band: 'Band 8C', point: 2, salary: 93820, hourly: 48.63},
    {band: 'Band 8D', point: 1, salary: 103913, hourly: 53.86},
    {band: 'Band 8D', point: 2, salary: 108362, hourly: 56.17},
    {band: 'Band 9', point: 1, salary: 122912, hourly: 63.71},
    {band: 'Band 9', point: 2, salary: 128236, hourly: 66.47},
  ] satisfies AnnexBRow[],

  // ══ Annex B — pay rates from 1 April 2026 (p9) ══
  // Hourly rates printed "Based on a 36 Hour Week" — the week
  // PCS(AFC)2026/2 sets. The change of divisor between the two tables
  // is visible only in this column.
  annexB2026: [
    {band: 'Band 1', point: 1, salary: 26557, hourly: 14.15},
    {band: 'Band 2', point: 1, salary: 26696, hourly: 14.22},
    {band: 'Band 2', point: 2, salary: 28988, hourly: 15.44},
    {band: 'Band 3', point: 1, salary: 29103, hourly: 15.50},
    {band: 'Band 3', point: 2, salary: 31409, hourly: 16.73},
    {band: 'Band 4', point: 1, salary: 31537, hourly: 16.80},
    {band: 'Band 4', point: 2, salary: 34303, hourly: 18.27},
    {band: 'Band 5', point: 1, salary: 34544, hourly: 18.40},
    {band: 'Band 5', point: 2, salary: 36911, hourly: 19.66},
    {band: 'Band 5', point: 3, salary: 43039, hourly: 22.93},
    {band: 'Band 6', point: 1, salary: 43231, hourly: 23.03},
    {band: 'Band 6', point: 2, salary: 45135, hourly: 24.04},
    {band: 'Band 6', point: 3, salary: 52679, hourly: 28.06},
    {band: 'Band 7', point: 1, salary: 52845, hourly: 28.15},
    {band: 'Band 7', point: 2, salary: 54863, hourly: 29.23},
    {band: 'Band 7', point: 3, salary: 61466, hourly: 32.74},
    {band: 'Band 8A', point: 1, salary: 65125, hourly: 34.69},
    {band: 'Band 8A', point: 2, salary: 70303, hourly: 37.45},
    {band: 'Band 8B', point: 1, salary: 76888, hourly: 40.96},
    {band: 'Band 8B', point: 2, salary: 82251, hourly: 43.82},
    {band: 'Band 8C', point: 1, salary: 90808, hourly: 48.38},
    {band: 'Band 8C', point: 2, salary: 97338, hourly: 51.85},
    {band: 'Band 8D', point: 1, salary: 107810, hourly: 57.43},
    {band: 'Band 8D', point: 2, salary: 112426, hourly: 59.89},
    {band: 'Band 9', point: 1, salary: 127521, hourly: 67.93},
    {band: 'Band 9', point: 2, salary: 133044, hourly: 70.88},
  ] satisfies AnnexBRow[],

  // ══ Annex C — "Full pay journey" from 1 April 2026 (p13-15) ══
  // The year-of-service column. Consecutive increments at one salary
  // are one pay point; the increment a group starts at is that point's
  // year. Transcribed for 2026-27 only: the 2025-26 journey enumerates
  // the same increments against the same points, so it would restate
  // this shape rather than add to it, and Annex B above already holds
  // that year's salaries.
  payJourney2026: [
    {band: 'Band 1', increment: 1, salary: 26557},

    {band: 'Band 2', increment: 1, salary: 26696},
    {band: 'Band 2', increment: 2, salary: 26696},
    {band: 'Band 2', increment: 3, salary: 28988},

    {band: 'Band 3', increment: 1, salary: 29103},
    {band: 'Band 3', increment: 2, salary: 29103},
    {band: 'Band 3', increment: 3, salary: 31409},

    {band: 'Band 4', increment: 1, salary: 31537},
    {band: 'Band 4', increment: 2, salary: 31537},
    {band: 'Band 4', increment: 3, salary: 31537},
    {band: 'Band 4', increment: 4, salary: 34303},

    {band: 'Band 5', increment: 1, salary: 34544},
    {band: 'Band 5', increment: 2, salary: 34544},
    {band: 'Band 5', increment: 3, salary: 36911},
    {band: 'Band 5', increment: 4, salary: 36911},
    {band: 'Band 5', increment: 5, salary: 43039},

    {band: 'Band 6', increment: 1, salary: 43231},
    {band: 'Band 6', increment: 2, salary: 43231},
    {band: 'Band 6', increment: 3, salary: 45135},
    {band: 'Band 6', increment: 4, salary: 45135},
    {band: 'Band 6', increment: 5, salary: 45135},
    {band: 'Band 6', increment: 6, salary: 52679},

    {band: 'Band 7', increment: 1, salary: 52845},
    {band: 'Band 7', increment: 2, salary: 52845},
    {band: 'Band 7', increment: 3, salary: 54863},
    {band: 'Band 7', increment: 4, salary: 54863},
    {band: 'Band 7', increment: 5, salary: 54863},
    {band: 'Band 7', increment: 6, salary: 61466},

    {band: 'Band 8A', increment: 1, salary: 65125},
    {band: 'Band 8A', increment: 2, salary: 65125},
    {band: 'Band 8A', increment: 3, salary: 65125},
    {band: 'Band 8A', increment: 4, salary: 65125},
    {band: 'Band 8A', increment: 5, salary: 65125},
    {band: 'Band 8A', increment: 6, salary: 70303},

    {band: 'Band 8B', increment: 1, salary: 76888},
    {band: 'Band 8B', increment: 2, salary: 76888},
    {band: 'Band 8B', increment: 3, salary: 76888},
    {band: 'Band 8B', increment: 4, salary: 76888},
    {band: 'Band 8B', increment: 5, salary: 76888},
    {band: 'Band 8B', increment: 6, salary: 82251},

    {band: 'Band 8C', increment: 1, salary: 90808},
    {band: 'Band 8C', increment: 2, salary: 90808},
    {band: 'Band 8C', increment: 3, salary: 90808},
    {band: 'Band 8C', increment: 4, salary: 90808},
    {band: 'Band 8C', increment: 5, salary: 90808},
    {band: 'Band 8C', increment: 6, salary: 97338},

    {band: 'Band 8D', increment: 1, salary: 107810},
    {band: 'Band 8D', increment: 2, salary: 107810},
    {band: 'Band 8D', increment: 3, salary: 107810},
    {band: 'Band 8D', increment: 4, salary: 107810},
    {band: 'Band 8D', increment: 5, salary: 107810},
    {band: 'Band 8D', increment: 6, salary: 112426},

    {band: 'Band 9', increment: 1, salary: 127521},
    {band: 'Band 9', increment: 2, salary: 127521},
    {band: 'Band 9', increment: 3, salary: 127521},
    {band: 'Band 9', increment: 4, salary: 127521},
    {band: 'Band 9', increment: 5, salary: 127521},
    {band: 'Band 9', increment: 6, salary: 133044},
  ] satisfies PayJourneyRow[],

  // RECORDED, not transcribed:
  //  · Annex A (p5-7) — the inflation-guarantee mechanism and the
  //    CPI confirmation that triggered this revision. Prose and a
  //    calculation, not a scale; its consequence is the `uplifts`
  //    above and the `nextExpectedReason` on this circular's source
  //    record.
  //  · Annex B's "Difference to Original Rate" and "Revised Uplift £"
  //    columns — arithmetic on the two rates either side, derived
  //    rather than independent figures.
  //  · Para 10, Recruitment and Retention Premia — RRPs that rise with
  //    pay take 4.4% from 1 April 2025 and a further 3.75% from
  //    1 April 2026. A rule for uplifting a local payment, not a
  //    national scale, and no RRP values are printed.
  //  · Annex C's 2025-26 "Full pay journey" (p10-12) — the same increment
  //    structure as `payJourney2026` against that year's salaries,
  //    which Annex B already carries.
  //  · The Cabinet Secretary approval instrument (SI 1991/537) — the
  //    circular's legal authority, carrying no figure.
} as const;
