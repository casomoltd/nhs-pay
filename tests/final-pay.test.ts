/**
 * Final pay is measured in years of 12 months ending on the leaving date,
 * as SI 1995/300 reg C1(6) and SI 2008/653 reg 2.A.10 both measure it,
 * from a path that holds pay by scheme year. Every expected figure is
 * worked by hand from pay the test declares, never from the library.
 */
import {describe, expect, it} from 'vitest';
import {PAY_BASES} from '../src/pay-path.js';
import type {PayPath} from '../src/pay-path.js';
import {
  bestSingleOf3, meanOf3ConsecutiveIn10,
} from '../src/sections/final-salary.js';

/** A pay path from a table of scheme-year pay; a year it lacks throws,
 *  so a test also shows which years a measure reads. */
const pathOf = (pay: Readonly<Partial<Record<number, number>>>): PayPath => ({
  payFor: (year) => {
    const amount = pay[year];
    if (amount === undefined) throw new RangeError(`no pay for ${year}`);
    return {pay: amount, basis: PAY_BASES.declared};
  },
});

// Multiples of 365, so a share of a year is a whole number of pounds.
const pay = pathOf({
  2026: 60 * 365, 2027: 70 * 365, 2028: 80 * 365, 2029: 90 * 365,
  2030: 100 * 365, 2031: 200 * 365,
});

describe('the 1995 Section\'s best single year of three', () => {
  it('takes whole scheme years for a leaving on 31 March', () => {
    // The best of the scheme years 2029 to 2031, each taken whole.
    expect(bestSingleOf3(pay, new Date(2031, 2, 31))).toBe(200 * 365);
  });

  it('takes whole scheme years on 31 March of a leap year', () => {
    // The scheme year ending 31 March 2028 has 366 days; 2025, which the
    // path lacks, is not read.
    expect(bestSingleOf3(pay, new Date(2028, 2, 31))).toBe(80 * 365);
  });

  it('is about the previous scheme year\'s pay for a leaving on 5 April',
    () => {
      // 5 of the 365 days of 2030-31 have run: the last year is
      // 5 × 200 + 360 × 100 = 37,000, then 5 × 100 + 360 × 90 = 32,900 and
      // 5 × 90 + 360 × 80 = 29,250. The whole scheme year would be 73,000.
      expect(bestSingleOf3(pay, new Date(2030, 3, 5))).toBeCloseTo(37000, 9);
    });

  it('blends the two scheme years by days for a mid-year leaving', () => {
    // 1 April to 30 September is 183 days of 365: the last year is
    // 183 × 200 + 182 × 100 = 54,800.
    expect(bestSingleOf3(pay, new Date(2030, 8, 30))).toBeCloseTo(54800, 9);
  });

  it('counts the days of a leap scheme year for a mid-year leaving', () => {
    // 2027-28 has 366 days; 1 April to 30 September 2027 is 183 of them:
    // the last year is (183 × 366 + 183 × 183) / 366 × 100 = 27,450.
    const leap = pathOf({2025: 0, 2026: 0, 2027: 183 * 100,
      2028: 366 * 100});
    expect(bestSingleOf3(leap, new Date(2027, 8, 30)))
      .toBeCloseTo(27450, 9);
  });

  it('takes an earlier year where it is higher', () => {
    const falling = pathOf({2028: 365 * 300, 2029: 365 * 300, 2030: 0,
      2031: 0});
    // 183 days in: the last year is 0; the one before is 182 × 300 =
    // 54,600; the one before that 183 × 300 + 182 × 300 = 109,500.
    expect(bestSingleOf3(falling, new Date(2030, 8, 30)))
      .toBeCloseTo(109500, 9);
  });
});

describe('the 2008 Section\'s best three consecutive years in ten', () => {
  const flat = (last: number) => pathOf(Object.fromEntries([
    ...Array.from({length: 10}, (_, i) => [2021 + i, 100 * 365]),
    [2031, last],
  ]));

  it('takes whole scheme years for a leaving on 31 March', () => {
    // (73,000 + 36,500 + 36,500) / 3; 2021 is not read.
    const onlyTen = pathOf(Object.fromEntries([
      ...Array.from({length: 9}, (_, i) => [2022 + i, 100 * 365]),
      [2031, 200 * 365],
    ]));
    expect(meanOf3ConsecutiveIn10(onlyTen, new Date(2031, 2, 31)))
      .toBeCloseTo(48666.666_666_667, 6);
  });

  it('blends the two scheme years by days for a mid-year leaving', () => {
    // 183 days of 365 into 2030-31: the last year is 54,800, every
    // earlier one 36,500, so the best window is (54,800 + 2 × 36,500) / 3.
    expect(meanOf3ConsecutiveIn10(flat(200 * 365), new Date(2030, 8, 30)))
      .toBeCloseTo(42600, 9);
  });

  it('counts the window back to the tenth year, and none further', () => {
    // A leaving on 30 September 2030: the year back 7 runs from 1 October
    // 2022, the year back 9 from 1 October 2020. Each takes 182 days of one
    // scheme year (October to March) and 183 of the next. Pay is in the
    // scheme years ending 2021 to 2023 alone, so back 9 and back 8 are each
    // 365 × 300 = 109,500 and back 7 is 182 × 300 = 54,600. The window
    // starting back 7, the last inside ten years, is (54,600 + 2 ×
    // 109,500) / 3 = 91,200. A window starting back 8 would read the year
    // from 1 October 2019, so the path lacks 2020 and throws if it does.
    const early = pathOf(Object.fromEntries([
      ...[2021, 2022, 2023].map((year) => [year, 300 * 365]),
      ...Array.from({length: 8}, (_, i) => [2024 + i, 0]),
    ]));
    expect(meanOf3ConsecutiveIn10(early, new Date(2030, 8, 30)))
      .toBeCloseTo(91200, 9);
  });
});
