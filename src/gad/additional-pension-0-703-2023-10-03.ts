/**
 * Verbatim transcription — GAD "NHSPS_EW — Consolidated Factor
 * Spreadsheet", table 0-703 (Table S), factors issued 3 October 2023, in
 * use from 1 April 2024. Sheet x-703.
 *
 * Single premium, in pounds, per £250 a year of additional pension at
 * the date of election, by age when notice of election is given (16 to
 * 65): personal, and personal and dependants'.
 *
 * To check it: open sheet x-703 of "GAD NHS_EW Consolidated Factors,
 * version 2026-01", the only publication of these tables: GAD's download
 * is `sourceUrl` below, and the archived copy is SA-01 in
 * docs/source-archive.md. The workbook's Version control sheet shows
 * x-703 to x-722 last updated in version 2023-04; the 2026-01 issue
 * touched other tables. Delete this file whole when a later issue
 * supersedes the table.
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
      + '/consolidated_factors/NHS_EW/NHS_EW_Consolidated_Factors_2026-01.xlsx',
    issued: isoDate('2023-10-03'),
    implemented: isoDate('2024-04-01'),
  },
  firstAge: 16,
  rows: [
    // £ per £250 a year:  personal   with dependants'    age
    {[P]: 2070, [D]: 2240}, // 16
    {[P]: 2100, [D]: 2270}, // 17
    {[P]: 2140, [D]: 2310}, // 18
    {[P]: 2170, [D]: 2350}, // 19
    {[P]: 2200, [D]: 2380}, // 20
    {[P]: 2230, [D]: 2420}, // 21
    {[P]: 2260, [D]: 2450}, // 22
    {[P]: 2290, [D]: 2490}, // 23
    {[P]: 2330, [D]: 2520}, // 24
    {[P]: 2360, [D]: 2560}, // 25
    {[P]: 2390, [D]: 2590}, // 26
    {[P]: 2430, [D]: 2630}, // 27
    {[P]: 2460, [D]: 2670}, // 28
    {[P]: 2500, [D]: 2710}, // 29
    {[P]: 2530, [D]: 2740}, // 30
    {[P]: 2570, [D]: 2780}, // 31
    {[P]: 2610, [D]: 2820}, // 32
    {[P]: 2640, [D]: 2860}, // 33
    {[P]: 2680, [D]: 2900}, // 34
    {[P]: 2720, [D]: 2940}, // 35
    {[P]: 2760, [D]: 2980}, // 36
    {[P]: 2800, [D]: 3020}, // 37
    {[P]: 2830, [D]: 3070}, // 38
    {[P]: 2870, [D]: 3110}, // 39
    {[P]: 2910, [D]: 3150}, // 40
    {[P]: 2950, [D]: 3190}, // 41
    {[P]: 3000, [D]: 3240}, // 42
    {[P]: 3040, [D]: 3280}, // 43
    {[P]: 3080, [D]: 3330}, // 44
    {[P]: 3120, [D]: 3370}, // 45
    {[P]: 3200, [D]: 3450}, // 46
    {[P]: 3290, [D]: 3540}, // 47
    {[P]: 3380, [D]: 3630}, // 48
    {[P]: 3460, [D]: 3720}, // 49
    {[P]: 3510, [D]: 3770}, // 50
    {[P]: 3560, [D]: 3820}, // 51
    {[P]: 3610, [D]: 3870}, // 52
    {[P]: 3660, [D]: 3930}, // 53
    {[P]: 3720, [D]: 3980}, // 54
    {[P]: 3770, [D]: 4030}, // 55
    {[P]: 3820, [D]: 4090}, // 56
    {[P]: 3880, [D]: 4140}, // 57
    {[P]: 3940, [D]: 4200}, // 58
    {[P]: 3990, [D]: 4260}, // 59
    {[P]: 4050, [D]: 4320}, // 60
    {[P]: 4120, [D]: 4380}, // 61
    {[P]: 4180, [D]: 4450}, // 62
    {[P]: 4310, [D]: 4570}, // 63
    {[P]: 4440, [D]: 4700}, // 64
    {[P]: 4580, [D]: 4840}, // 65
  ],
} as const satisfies LumpSumTableData;
