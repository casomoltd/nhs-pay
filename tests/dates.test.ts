/**
 * Tests for the package-private calendar arithmetic
 * (src/dates.ts). The broad conformance sweep against the
 * Temporal standard lives in period-oracle.test.ts; these pin
 * the named cases, including the month-end anniversary
 * convention.
 */

import {describe, expect, it} from 'vitest';
import {npaDate, periodInYearsMonths} from '../src/dates.js';
import {schemeYearEndFor} from '../src/pension/seed.js';

// ── periodInYearsMonths ─────────────────────────────

describe('periodInYearsMonths', () => {
  it('exact years', () => {
    const result = periodInYearsMonths(
      new Date(2020, 0, 1),
      new Date(2025, 0, 1),
    );
    expect(result).toEqual(
      {years: 5, months: 0, days: 0},
    );
  });

  it('years and months', () => {
    const result = periodInYearsMonths(
      new Date(2020, 0, 1),
      new Date(2023, 6, 1),
    );
    expect(result).toEqual(
      {years: 3, months: 6, days: 0},
    );
  });

  it('years, months and days', () => {
    const result = periodInYearsMonths(
      new Date(2020, 0, 15),
      new Date(2023, 6, 20),
    );
    expect(result).toEqual(
      {years: 3, months: 6, days: 5},
    );
  });

  /**
   * Anniversary convention at month-end: 31 Jan + 1 month is
   * 28/29 Feb (day-clamped), which counts as one COMPLETE
   * month. The naive diff-and-borrow this replaced produced
   * {0, 1, -2} here — negative days that silently defeated
   * the ERF round-up.
   */
  it('month-end: 31 Jan → 1 Mar = 1mo 1d, never'
    + ' negative days', () => {
    expect(periodInYearsMonths(
      new Date(2027, 0, 31), new Date(2027, 2, 1),
    )).toEqual({years: 0, months: 1, days: 1});
  });

  it('month-end across leap February', () => {
    expect(periodInYearsMonths(
      new Date(2024, 0, 31), new Date(2024, 2, 1),
    )).toEqual({years: 0, months: 1, days: 1});
  });

  /**
   * `invariant` takes its message as an ordinary argument, so
   * the message is built BEFORE the condition is judged — and
   * this one calls `toISOString()`, which throws
   * `RangeError: Invalid time value` on an invalid Date. An
   * invalid input also makes every figure below NaN, so the
   * postcondition was always going to fire: the input that most
   * needs the diagnostic is the one that would replace it with
   * an error naming neither the function nor the argument.
   */
  it('invalid `from` fails loud by name', () => {
    const call = () => periodInYearsMonths(
      new Date('not a date'), new Date(2026, 0, 1),
    );
    expect(call).toThrow(/periodInYearsMonths: invalid from/);
    expect(call).not.toThrow(/Invalid time value/);
  });

  /** The same hazard on the other side: the message formats
   * BOTH dates, so either one alone destroys it. */
  it('invalid `to` fails loud by name', () => {
    const call = () => periodInYearsMonths(
      new Date(2020, 0, 1), new Date('not a date'),
    );
    expect(call).toThrow(/periodInYearsMonths: invalid to/);
    expect(call).not.toThrow(/Invalid time value/);
  });

  /**
   * Anchored deliberately. A guard message that named the OTHER
   * argument by value would reintroduce the defect exactly
   * here, where there is no valid date to fall back on. The
   * message says which argument is wrong and formats neither.
   */
  it('both invalid: names an argument, formats neither', () => {
    expect(() => periodInYearsMonths(
      new Date('not a date'), new Date('not a date'),
    )).toThrow(/^periodInYearsMonths: invalid from$/);
  });

  /**
   * The over-correction pin, green before and after. Rejecting
   * `to < from` up front, or dropping the dates from the
   * message to make it safe, would take the postcondition's own
   * diagnostic with it. Valid dates in the wrong order must
   * still report the period AND both dates. Mid-month, so a
   * reader's UTC offset can shift the ISO day, never the month.
   */
  it('reversed valid dates still report period and dates', () => {
    const call = () => periodInYearsMonths(
      new Date(2026, 5, 15), new Date(2020, 5, 15),
    );
    expect(call).toThrow(/produced an invalid period -6yr/);
    expect(call).toThrow(/2026-06/);
    expect(call).toThrow(/2020-06/);
  });
});

// ── npaDate ─────────────────────────────────────────

describe('npaDate', () => {
  it('adds NPA years to date of birth', () => {
    const dob = new Date(1990, 5, 15);
    const result = npaDate(dob, 67);
    expect(result.getFullYear()).toBe(2057);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(15);
  });

  it('handles NPA 65', () => {
    const dob = new Date(1955, 0, 1);
    const result = npaDate(dob, 65);
    expect(result.getFullYear()).toBe(2020);
  });

  it('29 Feb birth + common year rolls to 1 Mar (E&W'
    + ' age-attainment convention, not clamping)', () => {
    const dob = new Date(1960, 1, 29);
    const result = npaDate(dob, 67);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(1);
  });
});

describe('schemeYearEndFor', () => {
  // A scheme year runs 1 April to 31 March and is named by the year it
  // ends in, so the boundary is between 31 March and 1 April.
  it('names a date by the 31 March that closes its scheme year', () => {
    expect(schemeYearEndFor(new Date(2036, 2, 31))).toBe(2036);
    expect(schemeYearEndFor(new Date(2036, 3, 1))).toBe(2037);
    expect(schemeYearEndFor(new Date(2036, 0, 1))).toBe(2036);
    expect(schemeYearEndFor(new Date(2036, 11, 31))).toBe(2037);
  });
});
