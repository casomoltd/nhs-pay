/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 1-401, factors issued 30 June 2023.
 * Sheet x-401 · PDF p.1.
 *
 * Sources: "NHSBSA, Early and Late Retirement Factors" (the
 * member-facing extract) and "GAD NHS_EW Consolidated Factors,
 * version 2026-01" (the workbook, and the source of record) —
 * see docs/source-archive.md#sa-01 and #sa-02.
 *
 * Table 1-401 (ERF1): 1995 Section early retirement factors,
 * pension: voluntary early retirement from active service, relative
 * to the Section's pension age of 60. Unisex; keyed by AGE "in
 * complete years & months", as the table's own header defines it.
 * Read for the 1995 Section's pension drawn before 60.
 *
 * Rows are ages (50–60), columns months (0–11), exactly as
 * printed; the last row prints a single 0-month value. Delete this
 * file whole when a later issue supersedes the table; git history is
 * the archive.
 *
 * ── Checked against GAD's own workbook, 23 Sep 2026 ─
 *
 * **Unchanged and still current.** The workbook's *Version control*
 * sheet shows x-401 last updated in version 2023-02, dated 30 June
 * 2023, the `issued` date below; no later version names it. Every
 * cell of the x-401 sheet was diffed against the NHSBSA extract —
 * 121 cells — with **zero differences**.
 */

import type {FactorTableData} from './factor-table.js';
import {isoDate} from '../iso-date.js';

/** ERF — Table 1-401, issued 30 Jun 2023. */
export const ERF_1_401 = {
  kind: 'erf',
  index: {by: 'age', firstAge: 50},
  provenance: {
    tableRef: '1-401',
    sheet: 'x-401',
    page: 1,
    guidanceRef: 'ERF1',
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
    [0.682, 0.684, 0.686, 0.688, 0.689, 0.691,
      0.693, 0.695, 0.697, 0.699, 0.700, 0.702], // 50
    [0.704, 0.706, 0.708, 0.710, 0.712, 0.714,
      0.716, 0.718, 0.720, 0.722, 0.724, 0.726], // 51
    [0.728, 0.730, 0.732, 0.735, 0.737, 0.739,
      0.741, 0.743, 0.745, 0.748, 0.750, 0.752], // 52
    [0.754, 0.756, 0.759, 0.761, 0.763, 0.766,
      0.768, 0.770, 0.773, 0.775, 0.777, 0.780], // 53
    [0.782, 0.785, 0.787, 0.790, 0.792, 0.795,
      0.797, 0.800, 0.802, 0.805, 0.807, 0.810], // 54
    [0.812, 0.815, 0.818, 0.820, 0.823, 0.826,
      0.829, 0.831, 0.834, 0.837, 0.840, 0.842], // 55
    [0.845, 0.848, 0.851, 0.854, 0.857, 0.860,
      0.863, 0.865, 0.868, 0.871, 0.874, 0.877], // 56
    [0.880, 0.883, 0.886, 0.889, 0.892, 0.895,
      0.899, 0.902, 0.905, 0.908, 0.911, 0.914], // 57
    [0.917, 0.920, 0.924, 0.927, 0.930, 0.934,
      0.937, 0.940, 0.944, 0.947, 0.950, 0.954], // 58
    [0.957, 0.961, 0.964, 0.968, 0.971, 0.975,
      0.979, 0.982, 0.986, 0.989, 0.993, 0.996], // 59
    [1.000],                                // 60 — 0mo only
  ],
} as const satisfies FactorTableData;
