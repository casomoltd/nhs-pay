/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 1-401, factors issued 8 July 2026
 * ("2026 factor review set"), in use from 1 December 2026.
 * Sheet x-401 · PDF p.1.
 *
 * Sources: "NHSBSA, Early and Late Retirement Factors effective from 1
 * December 2026" (the member-facing extract)
 * and "GAD NHS_EW Consolidated Factors" (the workbook, and the source of
 * record, at `sourceUrl`) — see docs/source-archive.md#gad-factors.
 *
 * Table 1-401 (ERF1): 1995 Section early retirement factors,
 * pension: voluntary early retirement from active service, relative
 * to the Section's pension age of 60. Unisex; keyed by AGE "in
 * complete years & months", as the table's own header defines it.
 * Read for the 1995 Section's pension drawn before 60.
 *
 * Rows are ages (50–60), columns months (0–11), exactly as
 * printed; the last row prints a single 0-month value.
 *
 * When it was last checked against the workbook, and how, is in
 * docs/source-archive.md#gad-factors.
 */

import type {FactorTableData} from './factor-table.js';
import {isoDate} from '../iso-date.js';

/** ERF — Table 1-401, issued 8 Jul 2026. */
export const ERF_1_401 = {
  kind: 'erf',
  index: {by: 'age', firstAge: 50},
  provenance: {
    tableRef: '1-401',
    sheet: 'x-401',
    page: 1,
    guidanceRef: 'ERF1',
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
    [0.668, 0.670, 0.672, 0.674, 0.676, 0.678,
      0.680, 0.682, 0.684, 0.686, 0.688, 0.690], // 50
    [0.692, 0.694, 0.696, 0.698, 0.700, 0.702,
      0.705, 0.707, 0.709, 0.711, 0.713, 0.715], // 51
    [0.717, 0.719, 0.722, 0.724, 0.726, 0.728,
      0.731, 0.733, 0.735, 0.737, 0.740, 0.742], // 52
    [0.744, 0.746, 0.749, 0.751, 0.754, 0.756,
      0.759, 0.761, 0.763, 0.766, 0.768, 0.771], // 53
    [0.773, 0.776, 0.778, 0.781, 0.784, 0.786,
      0.789, 0.792, 0.794, 0.797, 0.800, 0.802], // 54
    [0.805, 0.808, 0.811, 0.814, 0.816, 0.819,
      0.822, 0.825, 0.828, 0.831, 0.833, 0.836], // 55
    [0.839, 0.842, 0.845, 0.848, 0.851, 0.854,
      0.857, 0.860, 0.863, 0.866, 0.869, 0.872], // 56
    [0.875, 0.878, 0.882, 0.885, 0.888, 0.891,
      0.895, 0.898, 0.901, 0.904, 0.908, 0.911], // 57
    [0.914, 0.918, 0.921, 0.925, 0.928, 0.932,
      0.935, 0.939, 0.942, 0.946, 0.949, 0.953], // 58
    [0.956, 0.960, 0.963, 0.967, 0.971, 0.974,
      0.978, 0.982, 0.985, 0.989, 0.993, 0.996], // 59
    [1.000], // 60 — 0mo only
  ],
} as const satisfies FactorTableData;
