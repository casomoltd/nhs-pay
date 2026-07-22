/**
 * Tests for the package-private calendar arithmetic
 * (src/dates.ts). The broad conformance sweep against the
 * Temporal standard lives in period-oracle.test.ts; these pin
 * the named cases, including the month-end anniversary
 * convention.
 */

import {describe, expect, it} from 'vitest';
import {npaDate, periodInYearsMonths} from '../src/dates.js';

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
