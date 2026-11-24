/**
 * The pay path against an invented member worked by hand.
 *
 * `fixtures/invented-member.json` was produced by an independent
 * implementation — its own curve, its own ages, its own ladder — kept
 * outside this repository beside the working it belongs to. It does
 * not import this library, so agreement means the rule was reached
 * twice rather than recorded once. The member is invented: no figure
 * in it belongs to anybody.
 */
import {describe, expect, it} from 'vitest';
import {promotionalIndex} from '../src/index.js';
import {buildPayPath} from '../src/pay-path.js';
import type {MemberPay, Sacrifice} from '../src/pay-path.js';
import {PayPathUnavailable} from '../src/errors.js';
import {isoDate, isoMonth} from '../src/iso-date.js';
import {createPrices} from '../src/pension/prices.js';
import {PROMOTIONAL_SCALE_2020} from '../src/gad/promotional-scale-2020.js';
import {inventedFixture, inventedMember, parseCsv} from './helpers.js';
import {schemeYearEnd} from '../src/pension/scheme-year.js';

const invented = inventedFixture();

const {member} = invented;
const {dateOfBirth, pay} = inventedMember();

describe('the promotional scale transcription', () => {
  // The mirror was taken from the text of the published PDF in a
  // separate pass, so agreement checks the transcription, every cell.
  it('matches the printed table, every cell', () => {
    const rows = parseCsv('gad-promotional-scale-2020.csv');
    const {ages, nonManual, manual} = PROMOTIONAL_SCALE_2020;
    expect(rows.map((r) => Number(r.age))).toEqual([...ages]);
    rows.forEach((r, i) => {
      expect([nonManual.male[i], nonManual.female[i],
        manual.male[i], manual.female[i]]).toEqual([
        Number(r.nonManualMale), Number(r.nonManualFemale),
        Number(r.manualMale), Number(r.manualFemale)]);
    });
  });
});

describe('promotionalIndex', () => {
  it('is GAD\'s two non-manual columns averaged, as worked by hand',
    () => {
      for (const [age, expected] of
        Object.entries(invented.promotionalIndex)) {
        expect(promotionalIndex(Number(age)), `age ${age}`)
          .toBeCloseTo(expected, 4);
      }
    });

  it('is 100 at 25, where GAD indexes it', () => {
    expect(promotionalIndex(25)).toBe(100);
  });

  it('interpolates between rows rather than stepping', () => {
    // 42.5 is halfway between the 40 and 45 rows: (173 + 186) / 2.
    expect(promotionalIndex(42.5)).toBeCloseTo(179.5, 10);
  });
});

/** No test below this line prices a sacrifice until the last block, so
 *  the series is read by none of them: the run date is only a date. */
const NO_INFLATION = createPrices(0, new Date(2026, 8, 1));
const pathFor = (given: MemberPay) =>
  buildPayPath(dateOfBirth, given, NO_INFLATION);

describe('buildPayPath', () => {
  const built = pathFor(pay);

  it('matches the invented member\'s pay, year by year', () => {
    for (const year of invented.payPath) {
      const got = built.payFor(schemeYearEnd(year.schemeYearEnd));
      expect(got.basis, `${year.schemeYearEnd}`).toBe(year.basis);
      expect(got.pay, `${year.schemeYearEnd}`)
        .toBeCloseTo(year.pay, 2);
    }
  });

  it('says what every year is, and covers every kind', () => {
    const kinds = new Set(invented.payPath.map(
      (y) => built.payFor(schemeYearEnd(y.schemeYearEnd)).basis,
    ));
    expect([...kinds].sort((a, b) => a.localeCompare(b))).toEqual(
      ['contractual', 'declared', 'projected', 'reconstructed'],
    );
  });

  it('prefers a year the member declared over any worked figure',
    () => {
      const withDeclared = pathFor({
        ...pay,
        declared: [{schemeYearEnd: schemeYearEnd(2020), todaysMoney: 44_000}],
      });
      expect(withDeclared.payFor(schemeYearEnd(2020)))
        .toEqual({pay: 44_000, basis: 'declared', sacrificed: 0});
      expect(withDeclared.payFor(schemeYearEnd(2019)))
        .toEqual(built.payFor(schemeYearEnd(2019)));
    });

  it('projects from today on the curve when no steps remain', () => {
    const flat = pathFor({...pay, ladder: null});
    expect(flat.payFor(schemeYearEnd(2028)).basis).toBe('projected');
    expect(flat.payFor(schemeYearEnd(2028)).pay).toBeCloseTo(
      member.currentPay * promotionalIndex(49) / promotionalIndex(48),
      6,
    );
  });

  it('keeps a part-time member\'s steps in proportion', () => {
    const half = pathFor({
      ...pay,
      current: {...pay.current, todaysMoney: member.currentPay / 2},
    });
    for (const year of [2020, 2028, 2030, 2040]) {
      expect(half.payFor(schemeYearEnd(year)).pay)
        .toBeCloseTo(built.payFor(schemeYearEnd(year)).pay / 2, 6);
    }
  });

  it('refuses a current pay that is not a figure', () => {
    expect(() => pathFor({
      ...pay, current: {...pay.current, todaysMoney: -1},
    })).toThrow(PayPathUnavailable);
    expect(() => pathFor({
      ...pay, current: {...pay.current, todaysMoney: Number.NaN},
    })).toThrow(PayPathUnavailable);
  });

  it('takes a nought pay now, as a year paid nothing', () => {
    const unpaid = pathFor({
      ...pay, current: {...pay.current, todaysMoney: 0},
    });
    for (const year of [2020, 2027, 2028, 2040]) {
      expect(unpaid.payFor(schemeYearEnd(year)).pay).toBe(0);
    }
  });

  it('takes a declared year of nought, the same test as pay now', () => {
    // Unpaid leave in a past year: nothing accrues for it, and it is
    // not a break in service.
    const withUnpaid = pathFor({
      ...pay,
      declared: [{schemeYearEnd: schemeYearEnd(2020), todaysMoney: 0}],
    });
    expect(withUnpaid.payFor(schemeYearEnd(2020)))
      .toEqual({pay: 0, basis: 'declared', sacrificed: 0});
    expect(withUnpaid.payFor(schemeYearEnd(2019)))
      .toEqual(built.payFor(schemeYearEnd(2019)));
  });

  it('refuses a declared year that is not a pay figure', () => {
    for (const todaysMoney of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => pathFor({
        ...pay,
        declared: [{schemeYearEnd: schemeYearEnd(2020), todaysMoney}],
      })).toThrow(RangeError);
    }
  });

  it('does not compile a ladder whose points do not say when they pay', () => {
    // A rung is a `SteppedPoint`, so a point with no year of service is
    // refused by the compiler; this fails the typecheck if it is ever
    // accepted.
    const entryAndTop = [{label: 'Entry', salary: 1}, {label: 'Top', salary: 2}];
    const neverRun = () => pathFor({
      ...pay,
      // @ts-expect-error a point with no year of service is not a rung
      ladder: {points: entryAndTop, current: entryAndTop[0]},
    });
    expect(neverRun).toBeTypeOf('function');
  });
});

describe('a salary sacrifice', () => {
  // Invented: nobody is behind these figures. Born in 1950, so every
  // year below is past the last row of GAD's curve, where the index is
  // flat: pay before the sacrifice is 60,000 in every year, and each
  // year's reduction is the sacrifice alone.
  const PAY = 60_000;
  const TODAY = new Date(2026, 8, 1);
  const flat: MemberPay = {
    declared: [],
    current: {todaysMoney: PAY, asAt: isoDate('2026-09-01')},
    ladder: null,
    partTime: false,
    sacrifices: [],
    statedBeforeSacrifice: [],
  };
  // A lease of 510 a month, first deducted in October 2024 and last in
  // September 2027: 36 payslips.
  const lease: Sacrifice = {
    monthlyCash: 510, from: isoMonth('2024-10'), to: isoMonth('2027-09'),
  };
  const born = isoDate('1950-01-01');
  const pathWith = (given: Partial<MemberPay>, assumedCpi = 0) =>
    buildPayPath(
      born, {...flat, ...given}, createPrices(assumedCpi, TODAY),
    );
  const sacrificedIn = (path: ReturnType<typeof pathWith>, year: number) =>
    path.payFor(schemeYearEnd(year)).sacrificed;

  it('takes each month\'s deduction off the scheme year it falls in', () => {
    const path = pathWith({sacrifices: [lease]});
    // Counted by hand, a scheme year running April to March. 2024-25:
    // October to March, 6 payslips, 3,060. 2025-26 and 2026-27: 12 each,
    // 6,120. 2027-28: April to September, 6, 3,060. None before or after.
    const expected = new Map([
      [2024, 0], [2025, 3_060], [2026, 6_120], [2027, 6_120], [2028, 3_060],
      [2029, 0],
    ]);
    for (const [year, sacrificed] of expected) {
      expect(path.payFor(schemeYearEnd(year)), `${year}`).toEqual({
        pay: PAY - sacrificed,
        basis: path.payFor(schemeYearEnd(year)).basis,
        sacrificed,
      });
    }
    // 36 payslips of 510 are 18,360 of pensionable pay, which at the 2015
    // Section's 1/54 is 340 a year of pension before revaluation.
    const total = [...expected.keys()]
      .reduce((sum, year) => sum + sacrificedIn(path, year), 0);
    expect(total).toBe(18_360);
    expect(total / 54).toBe(340);
  });

  it('leaves a declared year as the scheme recorded it', () => {
    const path = pathWith({
      sacrifices: [lease],
      declared: [{schemeYearEnd: schemeYearEnd(2026), todaysMoney: 50_000}],
    });
    expect(path.payFor(schemeYearEnd(2026)))
      .toEqual({pay: 50_000, basis: 'declared', sacrificed: 0});
    expect(sacrificedIn(path, 2027)).toBe(6_120);
  });

  it('takes only the deductions of the months a member is paid for', () => {
    const path = pathWith({sacrifices: [lease]});
    // A leaver paid April to September 2027 has all six of that year's
    // deductions taken, not half of them.
    expect(path.payForMonths(
      schemeYearEnd(2028), {from: isoMonth('2027-04'), count: 6},
    )).toMatchObject({beforeSacrifice: PAY, sacrificed: 3_060});
    // A joiner paid from October 2027 has none: the lease has ended.
    expect(path.payForMonths(
      schemeYearEnd(2028), {from: isoMonth('2027-10'), count: 6},
    ).sacrificed).toBe(0);
    // Paid April to December 2024, three of that year's six.
    expect(path.payForMonths(
      schemeYearEnd(2025), {from: isoMonth('2024-04'), count: 9},
    ).sacrificed).toBe(1_530);
  });

  it('adds sacrifices that run together', () => {
    const second: Sacrifice = {
      monthlyCash: 100, from: isoMonth('2026-04'), to: isoMonth('2026-06'),
    };
    const path = pathWith({sacrifices: [lease, second]});
    expect(sacrificedIn(path, 2027)).toBe(6_120 + 300);
  });

  it('holds the deduction fixed in cash, so worth less each later year',
    () => {
      // At 2% a year, stepping each 6 April, from a run date of
      // 1 September 2026. A scheme year is read at its 31 March.
      const path = pathWith({sacrifices: [lease]}, 0.02);
      // 2024-25, read at 31 March 2025: two steps behind the run date
      // (6 April 2025 and 2026), so its cash is worth more today.
      expect(sacrificedIn(path, 2025)).toBeCloseTo(3_060 * 1.02 * 1.02, 9);
      // 2025-26: one step behind.
      expect(sacrificedIn(path, 2026)).toBeCloseTo(6_120 * 1.02, 9);
      // 2026-27, read at 31 March 2027: no step since the run date.
      expect(sacrificedIn(path, 2027)).toBeCloseTo(6_120, 9);
      // 2027-28: one step ahead (6 April 2027), so worth less today.
      expect(sacrificedIn(path, 2028)).toBeCloseTo(3_060 / 1.02, 9);
    });

  it('refuses a sacrifice that is not an amount given up', () => {
    for (const monthlyCash of [0, -510, Number.NaN]) {
      expect(() => pathWith({sacrifices: [{...lease, monthlyCash}]}))
        .toThrow(RangeError);
    }
  });

  it('refuses a sacrifice that ends before it starts', () => {
    expect(() => pathWith({
      sacrifices: [{...lease, from: isoMonth('2027-10')}],
    })).toThrow(RangeError);
  });

  it('refuses a sacrifice larger than the pay it comes off', () => {
    const path = pathWith({sacrifices: [{...lease, monthlyCash: 6_000}]});
    expect(() => path.payFor(schemeYearEnd(2027))).toThrow(RangeError);
  });
});
