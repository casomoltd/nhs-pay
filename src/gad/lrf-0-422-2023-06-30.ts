/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 0-422, factors issued 30 June 2023.
 * Sheet x-422 · PDF p.27.
 *
 * Table 0-422 (LRF2): 2015 scheme late retirement factors for
 * additional pension and pension debits, members retiring from active
 * status. Unisex; period measured as time after NPA, in the same
 * layout as table 0-421 (see lrf-2023-06-30.ts, which carries the
 * methodology note). Additional pension takes this table, not 0-421:
 * the two agree at the pension age and 0-422 is the larger at every
 * month after it.
 *
 * Sources: "NHSBSA, Early and Late Retirement Factors" (the extract)
 * and "GAD NHS_EW Consolidated Factors, version 2026-01" (the
 * workbook, and the source of record) — see docs/source-archive.md.
 * Every one of its 121 cells agrees between the two, and the workbook's
 * Version control sheet shows x-422 last updated in version 2023-02, the
 * `issued` date below.
 *
 * To check it: page 27 of NHSBSA's extract, `sourceUrl` below, or sheet
 * x-422 of the workbook (SA-02 and SA-01 in docs/source-archive.md).
 *
 * Rows are years late (0–10), columns months (0–11), exactly as
 * printed — the 10yr row prints a single 0-month value. Delete this
 * file whole when a later issue supersedes the table.
 */

import type {FactorTableData} from './factor-table.js';
import {isoDate} from '../iso-date.js';

/** 2015 scheme LRF for additional pension — Table 0-422, issued 30 Jun
 *  2023. */
export const LRF_0_422 = {
  kind: 'lrf',
  index: {by: 'period'},
  provenance: {
    tableRef: '0-422',
    sheet: 'x-422',
    page: 27,
    guidanceRef: 'LRF2',
    issued: isoDate('2023-06-30'),
    sourceUrl: 'https://www.nhsbsa.nhs.uk/sites/default/'
      + 'files/2024-02/Early%20and%20Late%20Retirement'
      + '%20Factors.pdf',
    methodGuidance: 'GAD NHSPS 2015 E&W — Early and late'
      + ' retirement in normal health, 7 Aug 2019',
  },
  rows: [
    [1.000, 1.005, 1.009, 1.014, 1.019, 1.023,
      1.028, 1.033, 1.037, 1.042, 1.047, 1.051], // 0yr
    [1.056, 1.061, 1.066, 1.071, 1.076, 1.082,
      1.087, 1.092, 1.097, 1.102, 1.107, 1.112], // 1yr
    [1.117, 1.123, 1.129, 1.134, 1.140, 1.145,
      1.151, 1.157, 1.162, 1.168, 1.174, 1.179], // 2yr
    [1.185, 1.191, 1.197, 1.203, 1.210, 1.216,
      1.222, 1.228, 1.234, 1.241, 1.247, 1.253], // 3yr
    [1.259, 1.266, 1.273, 1.280, 1.287, 1.294,
      1.300, 1.307, 1.314, 1.321, 1.328, 1.335], // 4yr
    [1.342, 1.349, 1.357, 1.364, 1.372, 1.380,
      1.387, 1.395, 1.402, 1.410, 1.417, 1.425], // 5yr
    [1.433, 1.441, 1.449, 1.458, 1.466, 1.475,
      1.483, 1.491, 1.500, 1.508, 1.516, 1.525], // 6yr
    [1.533, 1.543, 1.552, 1.561, 1.570, 1.580,
      1.589, 1.598, 1.608, 1.617, 1.626, 1.635], // 7yr
    [1.645, 1.655, 1.665, 1.675, 1.686, 1.696,
      1.706, 1.717, 1.727, 1.737, 1.748, 1.758], // 8yr
    [1.768, 1.780, 1.791, 1.802, 1.814, 1.825,
      1.837, 1.848, 1.860, 1.871, 1.882, 1.894], // 9yr
    [1.905],                                     // 10yr — 0mo only
  ],
} as const satisfies FactorTableData;
