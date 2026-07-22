/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet" (workbook: NHS EW Consolidated Factors 2023-03),
 * issued 30 June 2023. Sheet x-421 · PDF p.26.
 *
 * https://www.nhsbsa.nhs.uk/sites/default/files/2024-02/Early%20and%20Late%20Retirement%20Factors.pdf
 *
 * Table 0-421 (LRF1): 2015 scheme late retirement factors — main
 * scheme pension, members retiring from active service. Unisex;
 * period measured as time after NPA. Methodology remains the
 * 7 Aug 2019 guidance (see the ERF file header). The workbook's
 * LRF2 (0-422, additional pension / pension debits) is not
 * modelled — the library projects main-scheme pension only.
 *
 * Rows are years late (0–10), columns months (0–11), exactly as
 * printed — the 10yr row prints a single 0-month value. Delete
 * this file whole when a later issue supersedes the table
 * (expected with the post-May-2026 SCAPE review).
 */

import type {FactorTableData} from './factor-table.js';

/** 2015 scheme LRF — Table 0-421, issued 30 Jun 2023. */
export const LRF_0_421 = {
  kind: 'lrf',
  provenance: {
    tableRef: '0-421',
    sheet: 'x-421',
    page: 26,
    guidanceRef: 'LRF1',
    issued: '2023-06-30',
    sourceUrl: 'https://www.nhsbsa.nhs.uk/sites/default/'
      + 'files/2024-02/Early%20and%20Late%20Retirement'
      + '%20Factors.pdf',
    methodGuidance: 'GAD NHSPS 2015 E&W — Early and late'
      + ' retirement in normal health, 7 Aug 2019',
  },
  rows: [
    //  0mo    1mo    2mo    3mo    4mo    5mo    6mo
    //  7mo    8mo    9mo   10mo   11mo
    [1.000, 1.003, 1.007, 1.010, 1.014, 1.017,
      1.020, 1.024, 1.027, 1.031, 1.034, 1.037], // 0yr
    [1.041, 1.044, 1.048, 1.052, 1.056, 1.059,
      1.063, 1.067, 1.070, 1.074, 1.078, 1.081], // 1yr
    [1.085, 1.089, 1.093, 1.097, 1.101, 1.106,
      1.110, 1.114, 1.118, 1.122, 1.126, 1.130], // 2yr
    [1.134, 1.139, 1.143, 1.148, 1.152, 1.156,
      1.161, 1.165, 1.170, 1.174, 1.179, 1.183], // 3yr
    [1.188, 1.193, 1.198, 1.203, 1.208, 1.213,
      1.217, 1.222, 1.227, 1.232, 1.237, 1.242], // 4yr
    [1.247, 1.253, 1.258, 1.263, 1.269, 1.274,
      1.280, 1.285, 1.291, 1.296, 1.302, 1.307], // 5yr
    [1.313, 1.318, 1.324, 1.330, 1.336, 1.342,
      1.348, 1.354, 1.360, 1.366, 1.372, 1.378], // 6yr
    [1.384, 1.391, 1.397, 1.404, 1.411, 1.417,
      1.424, 1.430, 1.437, 1.444, 1.450, 1.457], // 7yr
    [1.463, 1.471, 1.478, 1.485, 1.492, 1.500,
      1.507, 1.514, 1.521, 1.529, 1.536, 1.543], // 8yr
    [1.550, 1.558, 1.566, 1.574, 1.582, 1.590,
      1.598, 1.606, 1.614, 1.622, 1.630, 1.638], // 9yr
    [1.646],                                     // 10yr — 0mo only
  ],
} as const satisfies FactorTableData;
