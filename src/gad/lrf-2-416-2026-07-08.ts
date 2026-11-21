/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 2-416, factors issued 8 July 2026
 * ("2026 factor review set"), in use from 1 December 2026.
 * Sheet x-416 · PDF p.16.
 *
 * Sources: "NHSBSA, Early and Late Retirement Factors effective from 1
 * December 2026" (the member-facing extract)
 * and "GAD NHS_EW Consolidated Factors" (the workbook, and the source of
 * record, at `sourceUrl`) — see docs/source-archive.md#gad-factors.
 *
 * Table 2-416 (LRF1): 2008 Section late retirement factors, pension,
 * relative to a pension age of 65. Unisex; keyed by AGE "in complete
 * years & months", as the table's own header defines it. Read for
 * the 2008 Section's pension drawn after 65.
 *
 * Rows are ages (65–75), columns months (0–11), exactly as
 * printed; the last row prints a single 0-month value.
 *
 * When it was last checked against the workbook, and how, is in
 * docs/source-archive.md#gad-factors.
 */

import type {FactorTableData} from './factor-table.js';
import {isoDate} from '../iso-date.js';

/** LRF — Table 2-416, issued 8 Jul 2026. */
export const LRF_2_416 = {
  kind: 'lrf',
  index: {by: 'age', firstAge: 65},
  provenance: {
    tableRef: '2-416',
    sheet: 'x-416',
    page: 16,
    guidanceRef: 'LRF1',
    issued: isoDate('2026-07-08'),
    implemented: isoDate('2026-12-01'),
    sourceUrl: 'https://gadfactorguidancehub.co.uk/download/consolidated_factors'
      + '/NHS_EW/NHS_EW_Consolidated_Factors_2026-04.xlsx',
    methodGuidance: 'GAD NHSPS 1995/2008 E&W — Voluntary early and'
      + ' late retirements in normal health, 7 Aug 2019',
  },
  rows: [
    //  0mo    1mo    2mo    3mo    4mo    5mo
    //  6mo    7mo    8mo    9mo   10mo   11mo
    [1.000, 1.003, 1.006, 1.009, 1.012, 1.015,
      1.018, 1.021, 1.024, 1.027, 1.030, 1.033], // 65
    [1.036, 1.039, 1.042, 1.045, 1.049, 1.052,
      1.055, 1.058, 1.062, 1.065, 1.068, 1.071], // 66
    [1.075, 1.078, 1.082, 1.085, 1.089, 1.092,
      1.096, 1.099, 1.103, 1.106, 1.110, 1.113], // 67
    [1.117, 1.121, 1.125, 1.128, 1.132, 1.136,
      1.140, 1.144, 1.148, 1.152, 1.155, 1.159], // 68
    [1.163, 1.167, 1.172, 1.176, 1.180, 1.184,
      1.188, 1.193, 1.197, 1.201, 1.205, 1.210], // 69
    [1.214, 1.218, 1.223, 1.228, 1.232, 1.237,
      1.242, 1.246, 1.251, 1.256, 1.260, 1.265], // 70
    [1.269, 1.275, 1.280, 1.285, 1.290, 1.295,
      1.300, 1.305, 1.310, 1.315, 1.320, 1.325], // 71
    [1.330, 1.336, 1.341, 1.347, 1.352, 1.358,
      1.363, 1.369, 1.374, 1.380, 1.386, 1.391], // 72
    [1.397, 1.403, 1.409, 1.415, 1.421, 1.427,
      1.433, 1.439, 1.445, 1.451, 1.457, 1.463], // 73
    [1.469, 1.476, 1.483, 1.489, 1.496, 1.503,
      1.509, 1.516, 1.523, 1.529, 1.536, 1.543], // 74
    [1.549], // 75 — 0mo only
  ],
} as const satisfies FactorTableData;
