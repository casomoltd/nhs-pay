/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 2-416, factors issued 30 June 2023.
 * Sheet x-416 · PDF p.21.
 *
 * Sources: "NHSBSA, Early and Late Retirement Factors" (the
 * member-facing extract) and "GAD NHS_EW Consolidated Factors,
 * version 2026-01" (the workbook, and the source of record) —
 * see docs/source-archive.md#sa-01 and #sa-02.
 *
 * Table 2-416 (LRF1): 2008 Section late retirement factors, pension,
 * relative to a pension age of 65. Unisex; keyed by AGE "in complete
 * years & months", as the table's own header defines it. Read for
 * the 2008 Section's pension drawn after 65.
 *
 * Rows are ages (65–75), columns months (0–11), exactly as
 * printed; the last row prints a single 0-month value. Delete this
 * file whole when a later issue supersedes the table; git history is
 * the archive.
 *
 * ── Checked against GAD's own workbook, 23 Sep 2026 ─
 *
 * **Unchanged and still current.** The workbook's *Version control*
 * sheet shows x-416 last updated in version 2023-02, dated 30 June
 * 2023, the `issued` date below; no later version names it. Every
 * cell of the x-416 sheet was diffed against the NHSBSA extract —
 * 121 cells — with **zero differences**.
 */

import type {FactorTableData} from './factor-table.js';
import {isoDate} from '../iso-date.js';

/** LRF — Table 2-416, issued 30 Jun 2023. */
export const LRF_2_416 = {
  kind: 'lrf',
  index: {by: 'age', firstAge: 65},
  provenance: {
    tableRef: '2-416',
    sheet: 'x-416',
    page: 21,
    guidanceRef: 'LRF1',
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
    [1.000, 1.003, 1.006, 1.009, 1.011, 1.014,
      1.017, 1.020, 1.023, 1.026, 1.029, 1.031], // 65
    [1.034, 1.037, 1.040, 1.044, 1.047, 1.050,
      1.053, 1.056, 1.059, 1.062, 1.065, 1.068], // 66
    [1.071, 1.075, 1.078, 1.082, 1.085, 1.088,
      1.092, 1.095, 1.099, 1.102, 1.105, 1.109], // 67
    [1.112, 1.116, 1.120, 1.123, 1.127, 1.131,
      1.135, 1.138, 1.142, 1.146, 1.149, 1.153], // 68
    [1.157, 1.161, 1.165, 1.169, 1.173, 1.177,
      1.181, 1.185, 1.190, 1.194, 1.198, 1.202], // 69
    [1.206, 1.210, 1.215, 1.219, 1.224, 1.228,
      1.233, 1.237, 1.242, 1.246, 1.251, 1.255], // 70
    [1.260, 1.265, 1.269, 1.274, 1.279, 1.284,
      1.289, 1.294, 1.299, 1.304, 1.309, 1.314], // 71
    [1.318, 1.324, 1.329, 1.335, 1.340, 1.345,
      1.351, 1.356, 1.361, 1.367, 1.372, 1.377], // 72
    [1.383, 1.389, 1.395, 1.400, 1.406, 1.412,
      1.418, 1.424, 1.430, 1.436, 1.442, 1.448], // 73
    [1.453, 1.460, 1.466, 1.473, 1.479, 1.486,
      1.492, 1.499, 1.505, 1.512, 1.518, 1.525], // 74
    [1.531],                                // 75 — 0mo only
  ],
} as const satisfies FactorTableData;
