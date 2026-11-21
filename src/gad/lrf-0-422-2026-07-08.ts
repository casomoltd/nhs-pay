/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 0-422, factors issued 8 July 2026
 * ("2026 factor review set"), in use from 1 December 2026.
 * Sheet x-422 · PDF p.22.
 *
 * Table 0-422 (LRF2): 2015 scheme late retirement factors for
 * additional pension and pension debits, members retiring from active
 * status. Unisex; period measured as time after NPA, in the same
 * layout as table 0-421 (see lrf-0-421-2026-07-08.ts, which carries the
 * methodology note). Additional pension takes this table, not 0-421:
 * the two agree at the pension age and 0-422 is the larger at every
 * month after it.
 *
 * Sources: "NHSBSA, Early and Late Retirement Factors effective from 1
 * December 2026" (the member-facing extract)
 * and "GAD NHS_EW Consolidated Factors" (the workbook, and the source of
 * record, at `sourceUrl`) — see docs/source-archive.md#gad-factors.
 *
 * To check it: NHSBSA's extract at `page` below, or sheet x-422 of
 * the workbook at `sourceUrl` (docs/source-archive.md#gad-factors).
 *
 * Rows are years late (0–10), columns months (0–11), exactly as
 * printed — the 10yr row prints a single 0-month value.
 */

import type {FactorTableData} from './factor-table.js';
import {isoDate} from '../iso-date.js';

/** 2015 scheme LRF for additional pension — Table 0-422, issued 8 Jul 2026. */
export const LRF_0_422 = {
  kind: 'lrf',
  index: {by: 'period'},
  provenance: {
    tableRef: '0-422',
    sheet: 'x-422',
    page: 22,
    guidanceRef: 'LRF2',
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
    [1.000, 1.005, 1.009, 1.014, 1.019, 1.023,
      1.028, 1.033, 1.037, 1.042, 1.047, 1.052], // 0yr
    [1.056, 1.061, 1.066, 1.071, 1.076, 1.081,
      1.086, 1.091, 1.096, 1.101, 1.106, 1.111], // 1yr
    [1.116, 1.122, 1.127, 1.133, 1.139, 1.144,
      1.150, 1.155, 1.161, 1.166, 1.172, 1.177], // 2yr
    [1.183, 1.189, 1.195, 1.201, 1.207, 1.213,
      1.220, 1.226, 1.232, 1.238, 1.244, 1.250], // 3yr
    [1.256, 1.263, 1.270, 1.276, 1.283, 1.290,
      1.296, 1.303, 1.310, 1.317, 1.323, 1.330], // 4yr
    [1.337, 1.344, 1.352, 1.359, 1.366, 1.374,
      1.381, 1.389, 1.396, 1.404, 1.411, 1.418], // 5yr
    [1.426, 1.434, 1.442, 1.450, 1.458, 1.467,
      1.475, 1.483, 1.491, 1.499, 1.507, 1.516], // 6yr
    [1.524, 1.532, 1.540, 1.549, 1.557, 1.565,
      1.574, 1.582, 1.590, 1.599, 1.607, 1.615], // 7yr
    [1.623, 1.632, 1.641, 1.650, 1.659, 1.668,
      1.677, 1.686, 1.695, 1.704, 1.713, 1.722], // 8yr
    [1.730, 1.740, 1.750, 1.759, 1.769, 1.778,
      1.788, 1.797, 1.807, 1.817, 1.826, 1.836], // 9yr
    [1.845], // 10yr — 0mo only
  ],
} as const satisfies FactorTableData;
