/**
 * Oracle test: periodInYearsMonths vs Temporal.
 *
 * JS Date has no period/duration type, so src/dates.ts
 * hand-rolls ~20 lines of anniversary-convention calendar
 * arithmetic. The
 * spec-defined standard for that computation is Temporal
 * (PlainDate.until with largestUnit 'year', constrain overflow —
 * the same day-clamped anniversary semantics). Temporal isn't in
 * Node yet, so the reference polyfill is a devDependency used
 * here as an oracle only — production stays dependency-free, and
 * when the platform ships Temporal the migration is mechanical
 * and already validated by this sweep.
 */

import {Temporal} from '@js-temporal/polyfill';
import {describe, expect, it} from 'vitest';
import {periodInYearsMonths} from '../src/dates.js';

function toPlain(date: Date): Temporal.PlainDate {
  return new Temporal.PlainDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

/**
 * Deterministic sweep biased to the hard cases: month-end days
 * (27–31), leap and non-leap Februaries, and year boundaries.
 * Date-constructor overflow (e.g. 30 Feb) is filtered out.
 */
function sweepDates(): Date[] {
  const years = [2019, 2020, 2023, 2024, 2027, 2028];
  const months = [0, 1, 2, 5, 10, 11];
  const days = [1, 15, 27, 28, 29, 30, 31];
  const dates: Date[] = [];
  for (const y of years) {
    for (const m of months) {
      for (const d of days) {
        const date = new Date(y, m, d);
        if (date.getMonth() === m) dates.push(date);
      }
    }
  }
  return dates;
}

/**
 * ONE deliberate divergence from Temporal: the clamp credit.
 * When `to` is the last day of a month shorter than `from`'s
 * day (29/30/31 Jan → 28/29 Feb), we count a complete month —
 * the UK corresponding-date rule (Dodds v Walker [1981]: a
 * month ends on the corresponding date, or the month's last
 * day when none exists). Temporal's difference semantics
 * deliberately withhold that credit (Jan 31 until Feb 28 is
 * P28D) to keep its arithmetic reversible. Every divergence
 * must fall exactly in that class AND equal the oracle
 * recomputed from the clamped anchor; anything else fails.
 */
function lastDayOfMonth(date: Date): number {
  return new Date(
    date.getFullYear(), date.getMonth() + 1, 0,
  ).getDate();
}

describe('periodInYearsMonths vs Temporal oracle', () => {
  it('matches PlainDate.until over the full sweep, up to'
    + ' the documented clamp credit', () => {
    const dates = sweepDates();
    const mismatches: string[] = [];
    let checked = 0;
    let clampCredits = 0;
    for (const from of dates) {
      for (const to of dates) {
        if (to < from) continue;
        checked += 1;
        const want = toPlain(from).until(
          toPlain(to), {largestUnit: 'year'},
        );
        const got = periodInYearsMonths(from, to);
        if (
          got.years === want.years
          && got.months === want.months
          && got.days === want.days
        ) {
          continue;
        }
        const isClampCase =
          to.getDate() === lastDayOfMonth(to)
          && from.getDate() > to.getDate();
        const clamped = toPlain(new Date(
          from.getFullYear(), from.getMonth(), to.getDate(),
        )).until(toPlain(to), {largestUnit: 'year'});
        if (
          isClampCase
          && got.years === clamped.years
          && got.months === clamped.months
          && got.days === clamped.days
        ) {
          clampCredits += 1;
          continue;
        }
        mismatches.push(
          `${from.toDateString()} → ${to.toDateString()}: `
            + `got ${got.years}y${got.months}m${got.days}d, `
            + `oracle ${want.years}y${want.months}m`
            + `${want.days}d`,
        );
      }
    }
    expect(mismatches).toEqual([]);
    expect(checked).toBeGreaterThan(20000);
    // The clamp-credit class must exist in the sweep — if it
    // vanishes, the sweep no longer covers month-end dates.
    expect(clampCredits).toBeGreaterThan(100);
  });
});
