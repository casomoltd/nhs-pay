/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet" (workbook: NHS EW Consolidated Factors 2023-03),
 * issued 30 June 2023. Sheet x-420 · PDF p.25.
 *
 * https://www.nhsbsa.nhs.uk/sites/default/files/2024-02/Early%20and%20Late%20Retirement%20Factors.pdf
 *
 * Table 0-420 (ERF1): 2015 scheme early retirement factors, normal
 * health — applicable to main scheme pension and additional
 * pension. Unisex; period measured as time to NPA. Methodology
 * (rounding, order of operations) remains the 7 Aug 2019 guidance,
 * which the workbook names as its related factor table guidance.
 *
 * Rows are years early (0–13), columns months (0–11), exactly as
 * printed — the 13yr row prints a single 0-month value, so it is a
 * single-cell row here. Delete this file whole when a later issue
 * supersedes the table (expected with the post-May-2026 SCAPE
 * review; git history is the archive).
 */

import type {FactorTableData} from './factor-table.js';

/** 2015 scheme ERF — Table 0-420, issued 30 Jun 2023. */
export const ERF_0_420 = {
  kind: 'erf',
  provenance: {
    tableRef: '0-420',
    sheet: 'x-420',
    page: 25,
    guidanceRef: 'ERF1',
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
    [1.000, 0.996, 0.991, 0.987, 0.983, 0.978,
      0.974, 0.969, 0.965, 0.961, 0.956, 0.952], // 0yr
    [0.948, 0.944, 0.939, 0.935, 0.931, 0.927,
      0.923, 0.919, 0.915, 0.911, 0.907, 0.903], // 1yr
    [0.899, 0.896, 0.892, 0.888, 0.885, 0.881,
      0.877, 0.874, 0.870, 0.866, 0.863, 0.859], // 2yr
    [0.855, 0.852, 0.849, 0.845, 0.842, 0.839,
      0.835, 0.832, 0.828, 0.825, 0.822, 0.818], // 3yr
    [0.815, 0.812, 0.809, 0.806, 0.802, 0.799,
      0.796, 0.793, 0.790, 0.787, 0.784, 0.781], // 4yr
    [0.777, 0.775, 0.772, 0.769, 0.766, 0.763,
      0.760, 0.757, 0.754, 0.752, 0.749, 0.746], // 5yr
    [0.743, 0.740, 0.738, 0.735, 0.732, 0.730,
      0.727, 0.724, 0.721, 0.719, 0.716, 0.713], // 6yr
    [0.711, 0.708, 0.706, 0.703, 0.701, 0.698,
      0.696, 0.693, 0.691, 0.688, 0.686, 0.683], // 7yr
    [0.681, 0.679, 0.676, 0.674, 0.672, 0.669,
      0.667, 0.665, 0.662, 0.660, 0.658, 0.655], // 8yr
    [0.653, 0.651, 0.649, 0.647, 0.644, 0.642,
      0.640, 0.638, 0.636, 0.634, 0.631, 0.629], // 9yr
    [0.627, 0.625, 0.623, 0.621, 0.619, 0.617,
      0.615, 0.613, 0.611, 0.609, 0.607, 0.605], // 10yr
    [0.603, 0.601, 0.599, 0.597, 0.595, 0.593,
      0.591, 0.590, 0.588, 0.586, 0.584, 0.582], // 11yr
    [0.580, 0.578, 0.577, 0.575, 0.573, 0.571,
      0.569, 0.568, 0.566, 0.564, 0.562, 0.561], // 12yr
    [0.559],                                     // 13yr — 0mo only
  ],
} as const satisfies FactorTableData;
