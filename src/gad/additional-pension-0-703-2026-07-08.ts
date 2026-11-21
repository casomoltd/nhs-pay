/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 0-703 (Table S), factors issued 8 July 2026
 * ("2026 factor review set"), in use from 15 August 2026. Sheet x-703.
 *
 * Single premium, in pounds, per £250 a year of additional pension at
 * the date of election, by age when notice of election is given (16 to
 * 67): personal, and personal and dependants'.
 *
 * To check it: open sheet x-703 of "GAD NHS_EW Consolidated Factors,
 * version 2026-04", the only publication of these tables: GAD's download
 * is `sourceUrl` below (docs/source-archive.md#gad-factors). The
 * workbook's Version control sheet shows x-703 to x-719 updated in
 * version 2026-02. Delete this file whole when a later issue supersedes
 * the table.
 */

import type {LumpSumTableData} from './additional-pension-table.js';
import {ADDITIONAL_PENSION_COVERS} from './additional-pension-table.js';
import {isoDate} from '../iso-date.js';

const {personal: P, withDependants: D} = ADDITIONAL_PENSION_COVERS;

/** 2015 Scheme additional pension, lump sum — Table 0-703. */
export const AP_0_703 = {
  provenance: {
    tableRef: '0-703',
    sheet: 'x-703',
    guidanceRef: 'Table S',
    sourceUrl: 'https://gadfactorguidancehub.co.uk/download'
      + '/consolidated_factors/NHS_EW/NHS_EW_Consolidated_Factors_2026-04.xlsx',
    issued: isoDate('2026-07-08'),
    // The workbook's "Date Factors Implemented" (B19): 15 August 2026.
    implemented: isoDate('2026-08-15'),
  },
  firstAge: 16,
  rows: [
    // £ per £250 a year:  personal   with dependants'    age
    {[P]: 1720, [D]: 1860}, // 16
    {[P]: 1750, [D]: 1890}, // 17
    {[P]: 1780, [D]: 1930}, // 18
    {[P]: 1810, [D]: 1970}, // 19
    {[P]: 1840, [D]: 2000}, // 20
    {[P]: 1880, [D]: 2040}, // 21
    {[P]: 1910, [D]: 2070}, // 22
    {[P]: 1940, [D]: 2110}, // 23
    {[P]: 1980, [D]: 2150}, // 24
    {[P]: 2010, [D]: 2180}, // 25
    {[P]: 2050, [D]: 2220}, // 26
    {[P]: 2080, [D]: 2260}, // 27
    {[P]: 2120, [D]: 2300}, // 28
    {[P]: 2160, [D]: 2340}, // 29
    {[P]: 2190, [D]: 2380}, // 30
    {[P]: 2230, [D]: 2420}, // 31
    {[P]: 2270, [D]: 2460}, // 32
    {[P]: 2310, [D]: 2510}, // 33
    {[P]: 2350, [D]: 2550}, // 34
    {[P]: 2390, [D]: 2590}, // 35
    {[P]: 2430, [D]: 2640}, // 36
    {[P]: 2480, [D]: 2680}, // 37
    {[P]: 2520, [D]: 2730}, // 38
    {[P]: 2560, [D]: 2770}, // 39
    {[P]: 2610, [D]: 2820}, // 40
    {[P]: 2650, [D]: 2870}, // 41
    {[P]: 2700, [D]: 2920}, // 42
    {[P]: 2740, [D]: 2970}, // 43
    {[P]: 2790, [D]: 3020}, // 44
    {[P]: 2840, [D]: 3070}, // 45
    {[P]: 2890, [D]: 3120}, // 46
    {[P]: 2940, [D]: 3170}, // 47
    {[P]: 2990, [D]: 3230}, // 48
    {[P]: 3080, [D]: 3320}, // 49
    {[P]: 3170, [D]: 3410}, // 50
    {[P]: 3260, [D]: 3510}, // 51
    {[P]: 3360, [D]: 3610}, // 52
    {[P]: 3420, [D]: 3670}, // 53
    {[P]: 3480, [D]: 3730}, // 54
    {[P]: 3540, [D]: 3790}, // 55
    {[P]: 3600, [D]: 3860}, // 56
    {[P]: 3670, [D]: 3920}, // 57
    {[P]: 3730, [D]: 3990}, // 58
    {[P]: 3800, [D]: 4060}, // 59
    {[P]: 3870, [D]: 4130}, // 60
    {[P]: 3940, [D]: 4200}, // 61
    {[P]: 4020, [D]: 4280}, // 62
    {[P]: 4100, [D]: 4360}, // 63
    {[P]: 4180, [D]: 4440}, // 64
    {[P]: 4270, [D]: 4530}, // 65
    {[P]: 4390, [D]: 4650}, // 66
    {[P]: 4330, [D]: 4590}, // 67
  ],
} as const satisfies LumpSumTableData;
