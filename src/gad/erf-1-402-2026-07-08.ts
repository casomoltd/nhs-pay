/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 1-402, factors issued 8 July 2026
 * ("2026 factor review set"), in use from 1 December 2026.
 * Sheet x-402 · PDF p.2.
 *
 * Sources: "NHSBSA, Early and Late Retirement Factors effective from 1
 * December 2026" (the member-facing extract)
 * and "GAD NHS_EW Consolidated Factors" (the workbook, and the source of
 * record, at `sourceUrl`) — see docs/source-archive.md#gad-factors.
 *
 * Table 1-402 (ERF2): early retirement factors relative to a pension
 * age of 65, pension: GAD prints it for "members of 1995 or 2008
 * section (relative to NPA 65)", so it serves any benefit whose
 * pension age is 65, whichever section holds it. Unisex; keyed by
 * AGE "in complete years & months", as the table's own header
 * defines it. Read for the 2008 Section's pension drawn before 65.
 *
 * Rows are ages (50–65), columns months (0–11), exactly as
 * printed; the last row prints a single 0-month value.
 *
 * When it was last checked against the workbook, and how, is in
 * docs/source-archive.md#gad-factors.
 */

import type {FactorTableData} from './factor-table.js';
import {isoDate} from '../iso-date.js';

/** ERF — Table 1-402, issued 8 Jul 2026. */
export const ERF_1_402 = {
  kind: 'erf',
  index: {by: 'age', firstAge: 50},
  provenance: {
    tableRef: '1-402',
    sheet: 'x-402',
    page: 2,
    guidanceRef: 'ERF2',
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
    [0.526, 0.528, 0.529, 0.531, 0.532, 0.534,
      0.535, 0.537, 0.538, 0.540, 0.541, 0.543], // 50
    [0.544, 0.546, 0.547, 0.549, 0.550, 0.552,
      0.554, 0.555, 0.557, 0.558, 0.560, 0.561], // 51
    [0.563, 0.565, 0.567, 0.568, 0.570, 0.572,
      0.574, 0.575, 0.577, 0.579, 0.581, 0.582], // 52
    [0.584, 0.586, 0.588, 0.590, 0.592, 0.594,
      0.596, 0.597, 0.599, 0.601, 0.603, 0.605], // 53
    [0.607, 0.609, 0.611, 0.613, 0.615, 0.617,
      0.619, 0.621, 0.623, 0.625, 0.627, 0.629], // 54
    [0.631, 0.633, 0.636, 0.638, 0.640, 0.642,
      0.645, 0.647, 0.649, 0.651, 0.654, 0.656], // 55
    [0.658, 0.660, 0.663, 0.665, 0.667, 0.670,
      0.672, 0.674, 0.677, 0.679, 0.681, 0.684], // 56
    [0.686, 0.689, 0.691, 0.694, 0.696, 0.699,
      0.702, 0.704, 0.707, 0.709, 0.712, 0.714], // 57
    [0.717, 0.720, 0.722, 0.725, 0.728, 0.730,
      0.733, 0.736, 0.738, 0.741, 0.744, 0.746], // 58
    [0.749, 0.752, 0.755, 0.758, 0.761, 0.764,
      0.767, 0.769, 0.772, 0.775, 0.778, 0.781], // 59
    [0.784, 0.787, 0.790, 0.793, 0.796, 0.799,
      0.803, 0.806, 0.809, 0.812, 0.815, 0.818], // 60
    [0.821, 0.824, 0.828, 0.831, 0.834, 0.838,
      0.841, 0.844, 0.848, 0.851, 0.854, 0.858], // 61
    [0.861, 0.865, 0.868, 0.872, 0.876, 0.879,
      0.883, 0.887, 0.890, 0.894, 0.898, 0.901], // 62
    [0.905, 0.909, 0.913, 0.917, 0.921, 0.925,
      0.929, 0.932, 0.936, 0.940, 0.944, 0.948], // 63
    [0.952, 0.956, 0.960, 0.964, 0.968, 0.972,
      0.976, 0.980, 0.984, 0.988, 0.992, 0.996], // 64
    [1.000], // 65 — 0mo only
  ],
} as const satisfies FactorTableData;
