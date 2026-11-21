/**
 * England's Agenda for Change pay scales, as NHS Employers publishes them.
 *
 * England issues no AfC pay circular, only an NHS Employers web page and a
 * poster, so the tables are transcribed here from the page, cited and
 * pinned to `tests/fixtures/pay-scales.csv`, as the README's AfC pay scales
 * rule for a web table says.
 *
 * Sources, by the names they carry in docs/source-archive.md, which holds
 * every publisher URL and archived copy:
 * - "NHS Employers — AfC pay scales 2025/26" (#sa-25)
 * - "NHS Employers — AfC pay scales 2026/27" (#sa-26; its hourly table has printing
 *   errors; these tables read the ANNUAL column, so they cannot reach us —
 *   see the manifest)
 * - "NHS Employers, 2026 AfC pay scales poster" (#sa-16) — the same award rendered a
 *   second time by the same publisher, which confirms the annual column is
 *   untouched by those errors
 * - "Health Careers — AfC pay rates" (#sa-27)
 *
 * Transcribed as the page prints each band: Band 1 as one figure, and
 * every other band as an entry point, the "Years until" interval and a
 * top point, Bands 5 to 9 with an intermediate step between. The point
 * labels are derived from those intervals in `afc-scales.ts`, as every
 * nation's are, so a mis-read interval shows as a wrong label that the
 * fixture fails on.
 */

import type {FlatBandRow, SteppedBandRow} from '../circulars/afc-shapes.js';

/** England's AfC ladder from 1 April 2025, as printed in SA-25. */
export const ENGLAND_AFC_2025_26 = {
  flatBands: [
    {band: 'Band 1', salary: 24465, note: 'closed to new entrants'},
  ] satisfies FlatBandRow[],

  // Band 2's entry and top are the same figure: the wage floor has
  // compressed the band, and the page still prints it as a progression,
  // so it is transcribed as printed rather than collapsed to one point.
  // Wales's Band 2 is the same shape.
  steppedBands: [
    {band: 'Band 2', entry: 24465, yearsToNext: 2, top: 24465},
    {band: 'Band 3', entry: 24937, yearsToNext: 2, top: 26598},
    {band: 'Band 4', entry: 27485, yearsToNext: 3, top: 30162},
    {band: 'Band 5', entry: 31049, yearsToNext: 2, intermediate: 33487,
      yearsToTop: 2, top: 37796},
    {band: 'Band 6', entry: 38682, yearsToNext: 2, intermediate: 40823,
      yearsToTop: 3, top: 46580},
    {band: 'Band 7', entry: 47810, yearsToNext: 2, intermediate: 50273,
      yearsToTop: 3, top: 54710},
    {band: 'Band 8a', entry: 55690, yearsToNext: 2, intermediate: 58487,
      yearsToTop: 3, top: 62682},
    {band: 'Band 8b', entry: 64455, yearsToNext: 2, intermediate: 68631,
      yearsToTop: 3, top: 74896},
    {band: 'Band 8c', entry: 76965, yearsToNext: 2, intermediate: 81652,
      yearsToTop: 3, top: 88682},
    {band: 'Band 8d', entry: 91342, yearsToNext: 2, intermediate: 96941,
      yearsToTop: 3, top: 105337},
    {band: 'Band 9', entry: 109179, yearsToNext: 2, intermediate: 115763,
      yearsToTop: 3, top: 125637},
  ] satisfies SteppedBandRow[],
} as const;

/** England's AfC ladder from 1 April 2026, as printed in SA-26. */
export const ENGLAND_AFC_2026_27 = {
  flatBands: [
    {band: 'Band 1', salary: 25272, note: 'closed to new entrants'},
  ] satisfies FlatBandRow[],

  // Band 2: the same compressed, printed-as-a-progression shape as 2025-26.
  steppedBands: [
    {band: 'Band 2', entry: 25272, yearsToNext: 2, top: 25272},
    {band: 'Band 3', entry: 25760, yearsToNext: 2, top: 27476},
    {band: 'Band 4', entry: 28392, yearsToNext: 3, top: 31157},
    {band: 'Band 5', entry: 32073, yearsToNext: 2, intermediate: 34592,
      yearsToTop: 2, top: 39043},
    {band: 'Band 6', entry: 39959, yearsToNext: 2, intermediate: 42170,
      yearsToTop: 3, top: 48117},
    {band: 'Band 7', entry: 49387, yearsToNext: 2, intermediate: 51932,
      yearsToTop: 3, top: 56515},
    {band: 'Band 8a', entry: 57528, yearsToNext: 2, intermediate: 60417,
      yearsToTop: 3, top: 64750},
    {band: 'Band 8b', entry: 66582, yearsToNext: 2, intermediate: 70896,
      yearsToTop: 3, top: 77368},
    {band: 'Band 8c', entry: 79504, yearsToNext: 2, intermediate: 84346,
      yearsToTop: 3, top: 91609},
    {band: 'Band 8d', entry: 94356, yearsToNext: 2, intermediate: 100140,
      yearsToTop: 3, top: 108814},
    {band: 'Band 9', entry: 112782, yearsToNext: 2, intermediate: 119583,
      yearsToTop: 3, top: 129783},
  ] satisfies SteppedBandRow[],
} as const;
