/**
 * The National Living Wage (statutory, 21 and over), the hourly rate the
 * Low Pay Commission sets each April.
 *
 * Keyed by the year label whose 1 April the rate takes effect on. The rate
 * runs from 1 April to 31 March, a pay year's span; the tax year opens on
 * 6 April, so the label names the year the rate is set for, not a tax
 * year. A year's entry is the rate announced for that April, never the one
 * in force when the entry was written.
 *
 * Source: "GOV.UK — national minimum wage rates" (#sa-30).
 */

import type {YearLabel} from '@casomoltd/paye-calc';
import {TAX_YEARS} from '@casomoltd/paye-calc';

/** The National Living Wage per hour, by the year it is set for. */
export const NLW_HOURLY: Partial<
  Record<YearLabel, number>
> = {
  [TAX_YEARS.Y2025_26]: 12.21,
  [TAX_YEARS.Y2026_27]: 12.71,
};
