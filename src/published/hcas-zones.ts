/**
 * The high cost area supplement's zones and their rates, per pay year, as
 * the NHS Terms and Conditions of Service Handbook prints them. HCAS is
 * England's: only its three London regions resolve a zone.
 *
 * The percentages hold from year to year; the cash floor and ceiling do
 * not. NHS Employers uprates them with each pay award and prints one table
 * per year, so a shared table would pay the current year's ceiling on last
 * year's salary, which is why each year has its own.
 *
 * Source: "NHS Terms and Conditions of Service Handbook, amendment 62"
 * (#sa-41, 1 June 2026), Annex 9 "High cost area supplements", Table 1
 * (from 1 April 2026) and Table 2 (from 1 April 2025).
 */

import type {YearLabel} from '@casomoltd/paye-calc';
import {YEAR_LABELS} from '@casomoltd/paye-calc';
import {HCAS_ZONE_IDS} from '../hcas-zone.js';
import type {HcasZones} from '../hcas-zone.js';

/** The zones from 1 April 2025. */
const HCAS_2025_26: HcasZones = {
  [HCAS_ZONE_IDS.INNER_LONDON]: {
    rate: 20, min: 5609, max: 8466,
  },
  [HCAS_ZONE_IDS.OUTER_LONDON]: {
    rate: 15, min: 4714, max: 5941,
  },
  [HCAS_ZONE_IDS.FRINGE]: {
    rate: 5, min: 1303, max: 2198,
  },
};

/** The zones from 1 April 2026. */
const HCAS_2026_27: HcasZones = {
  [HCAS_ZONE_IDS.INNER_LONDON]: {
    rate: 20, min: 5794, max: 8746,
  },
  [HCAS_ZONE_IDS.OUTER_LONDON]: {
    rate: 15, min: 4870, max: 6137,
  },
  [HCAS_ZONE_IDS.FRINGE]: {
    rate: 5, min: 1346, max: 2270,
  },
};

/** England's zones by the pay year whose award uprated them. */
export const HCAS_ZONES: Partial<Record<YearLabel, HcasZones>> = {
  [YEAR_LABELS.Y2025_26]: HCAS_2025_26,
  [YEAR_LABELS.Y2026_27]: HCAS_2026_27,
};
