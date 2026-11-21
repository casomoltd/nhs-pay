/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 1-407, factors issued 8 July 2026
 * ("2026 factor review set"), in use from 1 December 2026.
 * Sheet x-407 · PDF p.7.
 *
 * Sources: "NHSBSA, Early and Late Retirement Factors effective from 1
 * December 2026" (the member-facing extract)
 * and "GAD NHS_EW Consolidated Factors" (the workbook, and the source of
 * record, at `sourceUrl`) — see docs/source-archive.md#gad-factors.
 *
 * Table 1-407 (ERF7): 1995 Section early retirement factors, LUMP
 * SUM: the same drawing as table 1-401, applied to the automatic
 * lump sum rather than the pension. Unisex; keyed by AGE "in
 * complete years & months", as the table's own header defines it.
 * Read for the 1995 Section's automatic lump sum drawn before 60.
 *
 * Rows are ages (50–60), columns months (0–11), exactly as
 * printed; the last row prints a single 0-month value.
 *
 * When it was last checked against the workbook, and how, is in
 * docs/source-archive.md#gad-factors.
 */

import type {FactorTableData} from './factor-table.js';
import {isoDate} from '../iso-date.js';

/** ERF — Table 1-407, issued 8 Jul 2026. */
export const ERF_1_407 = {
  kind: 'erf',
  index: {by: 'age', firstAge: 50},
  provenance: {
    tableRef: '1-407',
    sheet: 'x-407',
    page: 7,
    guidanceRef: 'ERF7',
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
    [0.820, 0.821, 0.823, 0.824, 0.826, 0.827,
      0.829, 0.830, 0.831, 0.833, 0.834, 0.836], // 50
    [0.837, 0.838, 0.840, 0.841, 0.842, 0.844,
      0.845, 0.846, 0.848, 0.849, 0.850, 0.852], // 51
    [0.853, 0.855, 0.856, 0.858, 0.859, 0.861,
      0.862, 0.864, 0.865, 0.867, 0.868, 0.870], // 52
    [0.871, 0.872, 0.874, 0.875, 0.877, 0.878,
      0.880, 0.881, 0.882, 0.884, 0.885, 0.887], // 53
    [0.888, 0.890, 0.891, 0.893, 0.894, 0.896,
      0.897, 0.899, 0.900, 0.902, 0.903, 0.905], // 54
    [0.906, 0.908, 0.909, 0.911, 0.912, 0.914,
      0.915, 0.917, 0.918, 0.920, 0.921, 0.923], // 55
    [0.924, 0.926, 0.927, 0.929, 0.930, 0.932,
      0.933, 0.935, 0.936, 0.938, 0.939, 0.941], // 56
    [0.942, 0.944, 0.945, 0.947, 0.948, 0.950,
      0.952, 0.953, 0.955, 0.956, 0.958, 0.959], // 57
    [0.961, 0.963, 0.964, 0.966, 0.967, 0.969,
      0.971, 0.972, 0.974, 0.975, 0.977, 0.978], // 58
    [0.980, 0.982, 0.983, 0.985, 0.987, 0.988,
      0.990, 0.992, 0.993, 0.995, 0.997, 0.998], // 59
    [1.000], // 60 — 0mo only
  ],
} as const satisfies FactorTableData;
