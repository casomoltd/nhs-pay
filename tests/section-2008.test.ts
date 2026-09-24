/**
 * The 2008 Section: a pension of 1/60 of reckonable pay for each year of
 * membership, reckonable pay being the best average of three consecutive
 * years' pay in the last ten, a pension age of 65, no automatic lump sum,
 * and a late-retirement uplift. These are the rules of the NHS Pension
 * Scheme Regulations 2008 (SI 2008/653) as this library reads them; the
 * regulations themselves have not been read at source for these tests.
 *
 * Every expected figure is worked by hand from pay the test declares and a
 * factor transcribed from its published table, never from the library.
 */
import {describe, expect, it} from 'vitest';
import {isoDate} from '../src/iso-date.js';
import {memberBenefits, SECTIONS} from '../src/member-benefits.js';
import type {Member} from '../src/member-benefits.js';
import {PAY_BASES} from '../src/pay-path.js';
import type {PayPath} from '../src/pay-path.js';
import {meanOf3ConsecutiveIn10} from '../src/sections/final-salary.js';

/** A pay path from a table of scheme-year pay, for a measure to read. */
const pathOf = (pay: Readonly<Record<number, number>>): PayPath => ({
  payFor: (year) => {
    const amount = pay[year];
    if (amount === undefined) throw new RangeError(`no pay for ${year}`);
    return {pay: amount, basis: PAY_BASES.declared};
  },
});

describe('reckonable pay', () => {
  // The last ten scheme years end in 2031; the three-year windows inside
  // them end from 2024 to 2031.
  const years = (from: number, amounts: number[]) =>
    Object.fromEntries(amounts.map((a, i) => [from + i, a]));

  it('is the best average of three consecutive years, not the latest', () => {
    // 2025-2027 average 40,000; every later window is lower.
    const pay = pathOf(years(2020, [
      30000, 30000, 30000, 30000, 30000,
      39000, 40000, 41000, 35000, 35000, 35000, 35000,
    ]));
    expect(meanOf3ConsecutiveIn10(pay, 2031)).toBeCloseTo(40000, 9);
  });

  it('ignores a better window that ends outside the last ten years', () => {
    // 2019-2021 average 50,000, but 2021 is the eleventh year back.
    const pay = pathOf(years(2019, [
      50000, 50000, 50000, 20000, 20000, 20000, 20000,
      20000, 20000, 20000, 20000, 21000, 22000,
    ]));
    expect(meanOf3ConsecutiveIn10(pay, 2031)).toBeCloseTo(21000, 9);
  });

  it('reads a window starting in the tenth year back', () => {
    // 2022-2024 is the earliest window inside ten years ending 2031.
    const pay = pathOf(years(2021, [
      90000, 45000, 45000, 45000, 20000, 20000,
      20000, 20000, 20000, 20000, 20000,
    ]));
    expect(meanOf3ConsecutiveIn10(pay, 2031)).toBeCloseTo(45000, 9);
  });
});

describe('a 2008 Section member with a remedy window', () => {
  const TODAY = new Date(2026, 8, 23);
  // Invented: nobody is behind these figures. Joined and left on scheme
  // year boundaries so membership is whole years, and the ten scheme years
  // before leaving are declared, so reckonable pay is worked here.
  const declared = {
    2017: 30000, 2018: 31000, 2019: 36000, 2020: 37000, 2021: 38000,
    2022: 33000, 2023: 34000, 2024: 35000, 2025: 35000, 2026: 35000,
  };
  const member: Member = {
    dateOfBirth: isoDate('1975-01-01'),
    service: [
      {section: SECTIONS.s2008, joined: isoDate('2009-04-01'),
        left: isoDate('2022-03-31')},
      {section: SECTIONS.s2015, joined: isoDate('2022-04-01'), left: null},
    ],
    pay: {
      declared: Object.entries(declared).map(([year, todaysMoney]) =>
        ({schemeYearEnd: Number(year), todaysMoney})),
      current: {todaysMoney: 35000, asAt: isoDate('2026-09-01')},
      ladder: null,
    },
    statement: null,
  };
  const benefits = memberBenefits(member, {assumedCpi: 0}, TODAY);

  it('states the 2008 Section\'s rules: sixtieths, 65, no lump sum, an uplift',
    () => {
      expect(benefits.remedy).toBe(true);
      expect(benefits.legacy).toEqual({
        section: SECTIONS.s2008, pensionAge: 65, denominator: 60,
        automaticLumpSum: null, lateUplift: true,
      });
    });

  it('prices a late drawing from preserved benefits by hand', () => {
    const position = benefits.at({
      leaving: isoDate('2026-03-31'),
      drawing: isoDate('2042-03-31'),
      remedy: {kind: 'legacy-basis'},
      cash: {kind: 'automatic-only'},
    });
    const [legacy] = position.awards;
    expect(legacy.section).toBe(SECTIONS.s2008);
    if (legacy.provenance.accrual !== 'final-salary') {
      throw new Error('the 2008 award is not final salary');
    }
    // Membership 1 April 2009 to 31 March 2022, the remedy window on the
    // legacy basis: thirteen years.
    expect(legacy.provenance.membership).toBeCloseTo(13, 9);
    // Reckonable pay over the ten years to 2025-26: the best three
    // consecutive are 2018-19 to 2020-21, averaging 37,000.
    expect(legacy.provenance.finalPay).toBeCloseTo(37000, 6);
    expect(legacy.beforeFactor.real).toBeCloseTo(13 * 37000 / 60, 6);
    expect(legacy.automaticLumpSum.real).toBe(0);
    // Drawn at 67 years 2 months: NHSBSA Early and Late Retirement Factors
    // Table 2-416, issued 30 June 2023, age 67, 2 months: 1.078.
    expect(legacy.factor.factor).toBe(1.078);
    expect(legacy.pension.real).toBeCloseTo(13 * 37000 / 60 * 1.078, 6);
  });
});
