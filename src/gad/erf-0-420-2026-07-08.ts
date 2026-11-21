/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 0-420, factors issued 8 July 2026
 * ("2026 factor review set"), in use from 1 December 2026.
 * Sheet x-420 · PDF p.20.
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
 * Table 0-420 (ERF1): 2015 scheme early retirement factors, normal
 * health — applicable to main scheme pension and additional
 * pension. Unisex; period measured as time to NPA. Methodology
 * (rounding, order of operations) remains the 7 Aug 2019 guidance:
 * the workbook's Version control records no methodology change for
 * the 2026 set.
 *
 * Rows are years early (0–13), columns months (0–11), exactly as
 * printed — the 13yr row prints a single 0-month value, so it is a
 * single-cell row here.
 *
 * Table x-423 is not this table: it is an eligibility factor for
 * actuarially reduced early retirement, looked up by age rather than
 * by time to NPA.
 *
 * When it was last checked against the workbook, and how, is in
 * docs/source-archive.md#gad-factors.
 */

import type {FactorTableData} from './factor-table.js';
import {isoDate} from '../iso-date.js';

/** 2015 scheme ERF — Table 0-420, issued 8 Jul 2026. */
export const ERF_0_420 = {
  kind: 'erf',
  index: {by: 'period'},
  provenance: {
    tableRef: '0-420',
    sheet: 'x-420',
    page: 20,
    guidanceRef: 'ERF1',
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
    [1.000, 0.996, 0.991, 0.987, 0.982, 0.978,
      0.973, 0.969, 0.964, 0.960, 0.955, 0.951], // 0yr
    [0.946, 0.942, 0.938, 0.934, 0.930, 0.926,
      0.921, 0.917, 0.913, 0.909, 0.905, 0.901], // 1yr
    [0.897, 0.893, 0.889, 0.885, 0.882, 0.878,
      0.874, 0.870, 0.867, 0.863, 0.859, 0.855], // 2yr
    [0.852, 0.848, 0.845, 0.841, 0.838, 0.834,
      0.831, 0.827, 0.824, 0.820, 0.817, 0.813], // 3yr
    [0.810, 0.807, 0.803, 0.800, 0.797, 0.794,
      0.791, 0.787, 0.784, 0.781, 0.778, 0.774], // 4yr
    [0.771, 0.768, 0.765, 0.762, 0.759, 0.756,
      0.753, 0.750, 0.747, 0.744, 0.742, 0.739], // 5yr
    [0.736, 0.733, 0.730, 0.727, 0.725, 0.722,
      0.719, 0.716, 0.713, 0.711, 0.708, 0.705], // 6yr
    [0.702, 0.700, 0.697, 0.695, 0.692, 0.690,
      0.687, 0.684, 0.682, 0.679, 0.677, 0.674], // 7yr
    [0.672, 0.669, 0.667, 0.664, 0.662, 0.660,
      0.657, 0.655, 0.652, 0.650, 0.648, 0.645], // 8yr
    [0.643, 0.641, 0.638, 0.636, 0.634, 0.632,
      0.630, 0.627, 0.625, 0.623, 0.621, 0.618], // 9yr
    [0.616, 0.614, 0.612, 0.610, 0.608, 0.606,
      0.604, 0.601, 0.599, 0.597, 0.595, 0.593], // 10yr
    [0.591, 0.589, 0.587, 0.585, 0.583, 0.581,
      0.579, 0.577, 0.575, 0.573, 0.571, 0.570], // 11yr
    [0.568, 0.566, 0.564, 0.562, 0.560, 0.558,
      0.557, 0.555, 0.553, 0.551, 0.549, 0.547], // 12yr
    [0.545], // 13yr — 0mo only
  ],
} as const satisfies FactorTableData;
