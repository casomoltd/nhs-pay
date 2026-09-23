/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 1-402, factors issued 30 June 2023.
 * Sheet x-402 · PDF p.2.
 *
 * Sources: "NHSBSA, Early and Late Retirement Factors" (the
 * member-facing extract) and "GAD NHS_EW Consolidated Factors,
 * version 2026-01" (the workbook, and the source of record) —
 * see docs/source-archive.md#sa-01 and #sa-02.
 *
 * Table 1-402 (ERF2): early retirement factors relative to a pension
 * age of 65, pension: GAD prints it for "members of 1995 or 2008
 * section (relative to NPA 65)", so it serves any benefit whose
 * pension age is 65, whichever section holds it. Unisex; keyed by
 * AGE "in complete years & months", as the table's own header
 * defines it. Read for the 2008 Section's pension drawn before 65.
 *
 * Rows are ages (50–65), columns months (0–11), exactly as
 * printed; the last row prints a single 0-month value. Delete this
 * file whole when a later issue supersedes the table; git history is
 * the archive.
 *
 * ── Checked against GAD's own workbook, 23 Sep 2026 ─
 *
 * **Unchanged and still current.** The workbook's *Version control*
 * sheet shows x-402 last updated in version 2023-02, dated 30 June
 * 2023, the `issued` date below; no later version names it. Every
 * cell of the x-402 sheet was diffed against the NHSBSA extract —
 * 181 cells — with **zero differences**.
 */

import type {FactorTableData} from './factor-table.js';
import {isoDate} from '../iso-date.js';

/** ERF — Table 1-402, issued 30 Jun 2023. */
export const ERF_1_402 = {
  kind: 'erf',
  index: {by: 'age', firstAge: 50},
  provenance: {
    tableRef: '1-402',
    sheet: 'x-402',
    page: 2,
    guidanceRef: 'ERF2',
    issued: isoDate('2023-06-30'),
    sourceUrl: 'https://www.nhsbsa.nhs.uk/sites/default/'
      + 'files/2024-02/Early%20and%20Late%20Retirement'
      + '%20Factors.pdf',
    methodGuidance: 'GAD NHSPS 1995/2008 E&W — Voluntary early and'
      + ' late retirements in normal health, 7 Aug 2019',
  },
  rows: [
    //  0mo    1mo    2mo    3mo    4mo    5mo
    //  6mo    7mo    8mo    9mo   10mo   11mo
    [0.541, 0.543, 0.544, 0.546, 0.547, 0.549,
      0.550, 0.552, 0.553, 0.555, 0.556, 0.558], // 50
    [0.559, 0.561, 0.562, 0.564, 0.565, 0.567,
      0.568, 0.570, 0.571, 0.573, 0.574, 0.576], // 51
    [0.577, 0.579, 0.581, 0.582, 0.584, 0.586,
      0.588, 0.589, 0.591, 0.593, 0.595, 0.596], // 52
    [0.598, 0.600, 0.602, 0.604, 0.605, 0.607,
      0.609, 0.611, 0.613, 0.615, 0.616, 0.618], // 53
    [0.620, 0.622, 0.624, 0.626, 0.628, 0.630,
      0.632, 0.633, 0.635, 0.637, 0.639, 0.641], // 54
    [0.643, 0.645, 0.647, 0.650, 0.652, 0.654,
      0.656, 0.658, 0.660, 0.663, 0.665, 0.667], // 55
    [0.669, 0.671, 0.674, 0.676, 0.678, 0.680,
      0.683, 0.685, 0.687, 0.689, 0.692, 0.694], // 56
    [0.696, 0.699, 0.701, 0.704, 0.706, 0.709,
      0.711, 0.714, 0.716, 0.719, 0.721, 0.724], // 57
    [0.726, 0.729, 0.731, 0.734, 0.736, 0.739,
      0.742, 0.744, 0.747, 0.749, 0.752, 0.754], // 58
    [0.757, 0.760, 0.763, 0.765, 0.768, 0.771,
      0.774, 0.776, 0.779, 0.782, 0.785, 0.787], // 59
    [0.790, 0.793, 0.796, 0.799, 0.802, 0.805,
      0.809, 0.812, 0.815, 0.818, 0.821, 0.824], // 60
    [0.827, 0.830, 0.833, 0.837, 0.840, 0.843,
      0.846, 0.849, 0.852, 0.856, 0.859, 0.862], // 61
    [0.865, 0.869, 0.872, 0.876, 0.879, 0.883,
      0.887, 0.890, 0.894, 0.897, 0.901, 0.904], // 62
    [0.908, 0.912, 0.916, 0.919, 0.923, 0.927,
      0.931, 0.934, 0.938, 0.942, 0.946, 0.949], // 63
    [0.953, 0.957, 0.961, 0.965, 0.969, 0.973,
      0.977, 0.980, 0.984, 0.988, 0.992, 0.996], // 64
    [1.000],                                // 65 — 0mo only
  ],
} as const satisfies FactorTableData;
