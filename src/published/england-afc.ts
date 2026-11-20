/**
 * England's Agenda for Change pay scales, as NHS Employers publishes them.
 *
 * England issues no AfC pay circular, only an NHS Employers web page and a
 * poster, so the tables are transcribed here from the page, cited and
 * pinned to `tests/fixtures/pay-scales.csv`, as CLAUDE.md's rule for a web
 * table says.
 *
 * Sources, by the names they carry in docs/source-archive.md, which holds
 * every publisher URL and archived copy:
 * - "NHS Employers — AfC pay scales 2025/26"
 * - "NHS Employers — AfC pay scales 2026/27" (its hourly table has printing
 *   errors; these tables read the ANNUAL column, so they cannot reach us —
 *   see the manifest)
 * - "NHS Employers, 2026 AfC pay scales poster" — the same award rendered a
 *   second time by the same publisher, which confirms the annual column is
 *   untouched by those errors
 * - "Health Careers — AfC pay rates"
 *
 * Each point is written through `afcPoint` as the year of service in which
 * a member first reaches it, England's labels being authored as years (see
 * `scales.ts` on point labels).
 */

import type {AfcBandId} from '../afc-band.js';
import {afcPoint} from '../afc-scales.js';
import type {SteppedPoint} from '../scale-point.js';

/** England's AfC ladder from 1 April 2025. */
export const ENGLAND_AFC_2025_26: Record<AfcBandId, SteppedPoint[]> = {
  // Two points, both 24465. The publisher prints Band 2 with an
  // entry point, a 2-year progression interval and a top point,
  // and the wage floor has compressed the two to the same cash
  // figure — so the structure is published and the equality is
  // the fact, not a reason to collapse it. Wales's Band 2 is the
  // same shape and is modelled the same way.
  '2': [
    afcPoint(1, false, 24465),
    afcPoint(3, true, 24465),
  ],
  '3': [
    afcPoint(1, false, 24937),
    afcPoint(3, true, 26598),
  ],
  '4': [
    afcPoint(1, false, 27485),
    afcPoint(4, true, 30162),
  ],
  '5': [
    afcPoint(1, false, 31049),
    afcPoint(3, false, 33487),
    afcPoint(5, true, 37796),
  ],
  '6': [
    afcPoint(1, false, 38682),
    afcPoint(3, false, 40823),
    afcPoint(6, true, 46580),
  ],
  '7': [
    afcPoint(1, false, 47810),
    afcPoint(3, false, 50273),
    afcPoint(6, true, 54710),
  ],
  '8a': [
    afcPoint(1, false, 55690),
    afcPoint(3, false, 58487),
    afcPoint(6, true, 62682),
  ],
  '8b': [
    afcPoint(1, false, 64455),
    afcPoint(3, false, 68631),
    afcPoint(6, true, 74896),
  ],
  '8c': [
    afcPoint(1, false, 76965),
    afcPoint(3, false, 81652),
    afcPoint(6, true, 88682),
  ],
  '8d': [
    afcPoint(1, false, 91342),
    afcPoint(3, false, 96941),
    afcPoint(6, true, 105337),
  ],
  '9': [
    afcPoint(1, false, 109179),
    afcPoint(3, false, 115763),
    afcPoint(6, true, 125637),
  ],
};

/** England's AfC ladder from 1 April 2026. */
export const ENGLAND_AFC_2026_27: Record<AfcBandId, SteppedPoint[]> = {
  // Two points, both 25272: the same published shape as 2025-26's.
  '2': [
    afcPoint(1, false, 25272),
    afcPoint(3, true, 25272),
  ],
  '3': [
    afcPoint(1, false, 25760),
    afcPoint(3, true, 27476),
  ],
  '4': [
    afcPoint(1, false, 28392),
    afcPoint(4, true, 31157),
  ],
  '5': [
    afcPoint(1, false, 32073),
    afcPoint(3, false, 34592),
    afcPoint(5, true, 39043),
  ],
  '6': [
    afcPoint(1, false, 39959),
    afcPoint(3, false, 42170),
    afcPoint(6, true, 48117),
  ],
  '7': [
    afcPoint(1, false, 49387),
    afcPoint(3, false, 51932),
    afcPoint(6, true, 56515),
  ],
  '8a': [
    afcPoint(1, false, 57528),
    afcPoint(3, false, 60417),
    afcPoint(6, true, 64750),
  ],
  '8b': [
    afcPoint(1, false, 66582),
    afcPoint(3, false, 70896),
    afcPoint(6, true, 77368),
  ],
  '8c': [
    afcPoint(1, false, 79504),
    afcPoint(3, false, 84346),
    afcPoint(6, true, 91609),
  ],
  '8d': [
    afcPoint(1, false, 94356),
    afcPoint(3, false, 100140),
    afcPoint(6, true, 108814),
  ],
  '9': [
    afcPoint(1, false, 112782),
    afcPoint(3, false, 119583),
    afcPoint(6, true, 129783),
  ],
};
