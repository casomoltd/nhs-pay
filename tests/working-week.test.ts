// The AfC full-time week and the hourly rate it gives, pinned against
// rates the circulars print beside the salaries they come from.
//
// Both columns come from the publisher, which is what makes this an
// oracle rather than a restatement: `salary / hoursPerYear(week)` is
// checked against a number nobody here computed. Three weeks across two
// publishers, so a divisor that happened to fit one would fail the
// others.

import {describe, it, expect} from 'vitest';
import {NATION_KEYS, TAX_YEARS, payYear, taxYear} from '@casomoltd/paye-calc';
import {SCOTLAND_PCS_AFC_2026_01} from '../src/circulars/scotland-pcs-afc-2026-01';
import {WALES_LIVING_WAGE, annualiseHourly} from '../src/scales';
import {AFC_W_01_2026} from '../src/sources';
import {afcWeekInForce, afcWeeklyHours, hoursPerYear} from '../src/working-week';

const HALF_PENNY = 0.005;
const {annexB2025, annexB2026} = SCOTLAND_PCS_AFC_2026_01;
const SCOTLAND = [
  ...annexB2025.map((row) => ({...row, year: payYear('2025-26')})),
  ...annexB2026.map((row) => ({...row, year: payYear('2026-27')})),
].map((row) => ({
  ...row,
  case: `Scotland, ${row.band} point ${row.point}, ${row.year}: `
    + `£${row.salary} a year is £${row.hourly.toFixed(2)} an hour`,
}));

describe('AfC working week', () => {
  it.each(SCOTLAND)('$case', ({year, salary, hourly}) => {
    const week = afcWeeklyHours(year, NATION_KEYS.scotland);
    expect(salary / hoursPerYear(week)).toBeCloseTo(hourly, 2);
  });

  it(`Wales, 2026-27: the living-wage pair in ${AFC_W_01_2026.reference}`, () => {
    const pair = WALES_LIVING_WAGE['2026-27'];
    if (!pair) throw new Error('no Welsh living-wage pair for 2026-27');
    const week = afcWeeklyHours(payYear('2026-27'), NATION_KEYS.wales);
    expect(pair.annual / hoursPerYear(week)).toBeCloseTo(pair.hourly, 2);
  });

  it('is 37.5 hours outside Scotland in every year', () => {
    const {england, wales, northernIreland} = NATION_KEYS;
    for (const label of Object.values(TAX_YEARS)) {
      for (const nation of [england, wales, northernIreland]) {
        expect(afcWeeklyHours(payYear(label), nation)).toBe(37.5);
      }
    }
  });

  it('reads the week in force by tax year from the same table', () => {
    expect(afcWeekInForce(taxYear('2026-27'), NATION_KEYS.scotland)).toBe(36);
    expect(afcWeekInForce(taxYear('2025-26'), NATION_KEYS.scotland)).toBe(37);
  });

  it('refuses Scotland before 2025-26, which has no sourced week', () => {
    expect(() => afcWeeklyHours(payYear('2024-25'), NATION_KEYS.scotland))
      .toThrow(RangeError);
  });

  // A printed rate is rounded to the penny, so multiplying it back can
  // miss the salary by up to half a penny an hour, plus a pound for the
  // whole-pound rounding of the result.
  it.each([
    ['2025-26', annexB2025],
    ['2026-27', annexB2026],
  ] as const)('annualises %s printed hourly rates back to their salaries',
    (label, rows) => {
      const week = afcWeeklyHours(payYear(label), NATION_KEYS.scotland);
      const bound = HALF_PENNY * hoursPerYear(week) + 1;
      for (const {salary, hourly} of rows) {
        expect(Math.abs(annualiseHourly(hourly, week) - salary))
          .toBeLessThanOrEqual(bound);
      }
    });
});
