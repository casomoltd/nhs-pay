/**
 * The Welsh living-wage floor.
 *
 * The Welsh Government applies a Living Wage Foundation floor as an advance
 * uplift. Low spine points below it (Band 2, Band 3 entry) are lifted to
 * it.
 *
 * Source: AfC(W) 01/2026 pay letter (#sa-14), 6 Jan 2026 — the hourly in
 * its Action paragraph, the annual in its own spine-point table.
 *
 * Both figures below are published by that letter, and neither derives from
 * the other: it states the annual floor as a set value, not as hourly ×
 * hours. Read the one you mean — `hourly` to name a rate, `annual` to apply
 * the floor.
 *
 * They do reconcile on the publisher's own week-year: £26,300 ÷ (37.5 ×
 * 365/7) = £13.4502, the printed £13.45. That agreement is a useful check
 * on the divisor and NOT a licence to derive one figure from the other,
 * because only the publisher's rounding makes it land.
 *
 * One record, not two maps: they are a single published pair, and separate
 * maps let a year land in one and not the other, or pair a revised floor
 * with a stale rate.
 */

import type {YearLabel} from '@casomoltd/paye-calc';
import {TAX_YEARS} from '@casomoltd/paye-calc';

/** The Welsh living-wage floor for a year, as its pay
 *  letter states it. */
export interface WalesLivingWage {
  /** The floor applied to low spine points. */
  readonly annual: number;
  /** The Living Wage Foundation rate the floor is set
   *  against — quotable, never a divisor. */
  readonly hourly: number;
}

/** The floor by the year its pay letter sets it for. */
export const WALES_LIVING_WAGE: Partial<
  Record<YearLabel, WalesLivingWage>
> = {
  [TAX_YEARS.Y2026_27]: {annual: 26300, hourly: 13.45},
};
