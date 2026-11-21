/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 0-421, factors issued 8 July 2026
 * ("2026 factor review set"), in use from 1 December 2026.
 * Sheet x-421 · PDF p.21.
 *
 * `sourceUrl` is the workbook it was transcribed from, version
 * 2026-04, named in the URL (see `GadTableProvenance.sourceUrl`);
 * `page` is where NHSBSA's extract prints the table.
 *
 * Sources: "NHSBSA, Early and Late Retirement Factors effective from 1
 * December 2026" (the member-facing extract)
 * and "GAD NHS_EW Consolidated Factors" (the workbook, and the source of
 * record, at `sourceUrl`) — see docs/source-archive.md#gad-factors.
 *
 * Table 0-421 (LRF1): 2015 scheme late retirement factors — main
 * scheme pension, members retiring from active service. Unisex;
 * period measured as time after NPA. Methodology remains the
 * 7 Aug 2019 guidance (see erf-0-420-2026-07-08.ts). Additional
 * pension takes the workbook's LRF2 instead, table 0-422
 * (lrf-0-422-2026-07-08.ts).
 *
 * Rows are years late (0–10), columns months (0–11), exactly as
 * printed — the 10yr row prints a single 0-month value.
 *
 * When it was last checked against the workbook, and how, is in
 * docs/source-archive.md#gad-factors.
 */

import type {FactorTableData} from './factor-table.js';
import {isoDate} from '../iso-date.js';

/** 2015 scheme LRF — Table 0-421, issued 8 Jul 2026. */
export const LRF_0_421 = {
  kind: 'lrf',
  index: {by: 'period'},
  provenance: {
    tableRef: '0-421',
    sheet: 'x-421',
    page: 21,
    guidanceRef: 'LRF1',
    issued: isoDate('2026-07-08'),
    implemented: isoDate('2026-12-01'),
    sourceUrl: 'https://gadfactorguidancehub.co.uk/download/consolidated_factors'
      + '/NHS_EW/NHS_EW_Consolidated_Factors_2026-04.xlsx',
    methodGuidance: 'GAD NHSPS 2015 E&W — Early and late'
      + ' retirement in normal health, 7 Aug 2019',
  },
  rows: [
    //  0mo    1mo    2mo    3mo    4mo    5mo
    //  6mo    7mo    8mo    9mo   10mo   11mo
    [1.000, 1.003, 1.007, 1.010, 1.014, 1.017,
      1.020, 1.024, 1.027, 1.031, 1.034, 1.037], // 0yr
    [1.041, 1.045, 1.048, 1.052, 1.055, 1.059,
      1.063, 1.066, 1.070, 1.073, 1.077, 1.081], // 1yr
    [1.084, 1.088, 1.092, 1.096, 1.100, 1.104,
      1.108, 1.112, 1.116, 1.120, 1.124, 1.128], // 2yr
    [1.132, 1.137, 1.141, 1.145, 1.150, 1.154,
      1.159, 1.163, 1.167, 1.172, 1.176, 1.180], // 3yr
    [1.185, 1.190, 1.195, 1.199, 1.204, 1.209,
      1.214, 1.219, 1.223, 1.228, 1.233, 1.238], // 4yr
    [1.243, 1.248, 1.253, 1.259, 1.264, 1.269,
      1.274, 1.280, 1.285, 1.290, 1.296, 1.301], // 5yr
    [1.306, 1.312, 1.318, 1.324, 1.329, 1.335,
      1.341, 1.347, 1.353, 1.358, 1.364, 1.370], // 6yr
    [1.376, 1.382, 1.387, 1.393, 1.399, 1.404,
      1.410, 1.416, 1.422, 1.427, 1.433, 1.439], // 7yr
    [1.445, 1.451, 1.457, 1.463, 1.469, 1.475,
      1.481, 1.487, 1.493, 1.499, 1.505, 1.511], // 8yr
    [1.517, 1.524, 1.530, 1.537, 1.543, 1.550,
      1.556, 1.563, 1.569, 1.575, 1.582, 1.588], // 9yr
    [1.595], // 10yr — 0mo only
  ],
} as const satisfies FactorTableData;
