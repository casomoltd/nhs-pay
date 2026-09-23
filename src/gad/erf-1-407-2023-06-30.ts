/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 1-407, factors issued 30 June 2023.
 * Sheet x-407 · PDF p.9.
 *
 * Sources: "NHSBSA, Early and Late Retirement Factors" (the
 * member-facing extract) and "GAD NHS_EW Consolidated Factors,
 * version 2026-01" (the workbook, and the source of record) —
 * see docs/source-archive.md#sa-01 and #sa-02.
 *
 * Table 1-407 (ERF7): 1995 Section early retirement factors, LUMP
 * SUM: the same drawing as table 1-401, applied to the automatic
 * lump sum rather than the pension. Unisex; keyed by AGE "in
 * complete years & months", as the table's own header defines it.
 * Read for the 1995 Section's automatic lump sum drawn before 60.
 *
 * Rows are ages (50–60), columns months (0–11), exactly as
 * printed; the last row prints a single 0-month value. Delete this
 * file whole when a later issue supersedes the table; git history is
 * the archive.
 *
 * ── Checked against GAD's own workbook, 23 Sep 2026 ─
 *
 * **Unchanged and still current.** The workbook's *Version control*
 * sheet shows x-407 last updated in version 2023-02, dated 30 June
 * 2023, the `issued` date below; no later version names it. Every
 * cell of the x-407 sheet was diffed against the NHSBSA extract —
 * 121 cells — with **zero differences**.
 */

import type {FactorTableData} from './factor-table.js';
import {isoDate} from '../iso-date.js';

/** ERF — Table 1-407, issued 30 Jun 2023. */
export const ERF_1_407 = {
  kind: 'erf',
  index: {by: 'age', firstAge: 50},
  provenance: {
    tableRef: '1-407',
    sheet: 'x-407',
    page: 9,
    guidanceRef: 'ERF7',
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
    [0.845, 0.846, 0.847, 0.849, 0.850, 0.851,
      0.852, 0.853, 0.854, 0.856, 0.857, 0.858], // 50
    [0.859, 0.860, 0.862, 0.863, 0.864, 0.865,
      0.867, 0.868, 0.869, 0.870, 0.872, 0.873], // 51
    [0.874, 0.875, 0.877, 0.878, 0.879, 0.880,
      0.882, 0.883, 0.884, 0.885, 0.887, 0.888], // 52
    [0.889, 0.890, 0.892, 0.893, 0.894, 0.895,
      0.897, 0.898, 0.899, 0.900, 0.902, 0.903], // 53
    [0.904, 0.905, 0.907, 0.908, 0.909, 0.910,
      0.912, 0.913, 0.914, 0.915, 0.917, 0.918], // 54
    [0.919, 0.920, 0.922, 0.923, 0.924, 0.926,
      0.927, 0.928, 0.930, 0.931, 0.932, 0.934], // 55
    [0.935, 0.936, 0.938, 0.939, 0.940, 0.942,
      0.943, 0.944, 0.946, 0.947, 0.948, 0.950], // 56
    [0.951, 0.952, 0.954, 0.955, 0.956, 0.958,
      0.959, 0.960, 0.962, 0.963, 0.964, 0.966], // 57
    [0.967, 0.968, 0.970, 0.971, 0.972, 0.974,
      0.975, 0.976, 0.978, 0.979, 0.980, 0.982], // 58
    [0.983, 0.984, 0.986, 0.987, 0.989, 0.990,
      0.992, 0.993, 0.994, 0.996, 0.997, 0.999], // 59
    [1.000],                                // 60 — 0mo only
  ],
} as const satisfies FactorTableData;
