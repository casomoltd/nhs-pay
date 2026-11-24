/**
 * A salary sacrifice on every route a member's pay is read by: the two
 * cash series, a tax year's pension input, a final-salary measure at a
 * leaving date, and a part year. Every expected figure is counted by
 * hand from the payslips the test declares, never read from the library.
 * The members are invented.
 */
import {taxYearEnd} from '@casomoltd/paye-calc';
import {describe, expect, it} from 'vitest';
import {isoDate, isoMonth} from '../src/iso-date.js';
import {memberBenefits, REMEDY_BASES} from '../src/member/index.js';
import type {Member} from '../src/member/index.js';
import {buildPayPath} from '../src/pay-path.js';
import type {MemberPay, Sacrifice} from '../src/pay-path.js';
import {buildLedger} from '../src/pension/ledger.js';
import {
  createPrices, createPublishedPrices,
} from '../src/pension/prices.js';
import {schemeYearEnd, schemeYearEndDate} from '../src/pension/scheme-year.js';
import {seedFromJoinDate} from '../src/pension/seed.js';
import {
  bestSingleOf3, meanOf3ConsecutiveIn10,
} from '../src/sections/final-salary.js';

const TODAY = new Date(2026, 8, 23);
const NO_INFLATION = createPrices(0, TODAY);
// Born in 1950, past the last row of GAD's curve, so pay before a
// sacrifice is the same in every year.
const BORN = isoDate('1950-01-01');
const payOf = (todaysMoney: number, sacrifices: Sacrifice[]): MemberPay => ({
  declared: [],
  current: {todaysMoney, asAt: isoDate('2026-09-23')},
  ladder: null,
  partTime: false,
  sacrifices,
  statedBeforeSacrifice: [],
});
const lease = (from: string, to: string, monthlyCash = 510): Sacrifice => ({
  monthlyCash, from: isoMonth(from), to: isoMonth(to),
});

describe('a cash series takes off the cash deducted', () => {
  const series = {
    assumed: createPrices(0.03, TODAY),
    published: createPublishedPrices(0.03, TODAY),
  };
  for (const [name, prices] of Object.entries(series)) {
    it(`on the ${name} series`, () => {
      const path = buildPayPath(
        BORN, payOf(54_000, [lease('2024-10', '2027-09')]), prices,
      );
      // Payslips in each scheme year: 6, 12, 12, 6.
      for (const [year, cash] of [
        [2025, 3_060], [2026, 6_120], [2027, 6_120], [2028, 3_060],
      ] as const) {
        const end = schemeYearEnd(year);
        expect(prices.payAt(
          path.payFor(end).sacrificed, schemeYearEndDate(end),
        )).toBeCloseTo(cash, 6);
      }
    });
  }

  it('reads the same when its methods are taken off the path', () => {
    const {payFor} = buildPayPath(
      BORN, payOf(54_000, [lease('2026-04', '2027-03')]), NO_INFLATION,
    );
    expect(payFor(schemeYearEnd(2027)).sacrificed).toBe(6_120);
  });
});

describe('a tax year\'s pension input', () => {
  const member: Member = {
    dateOfBirth: isoDate('1980-06-15'),
    service: [{
      section: 'section-2015', joined: isoDate('2016-04-01'), left: null,
    }],
    pay: payOf(54_000, [lease('2026-04', '2027-03')]),
    statement: {accruedPension: 10_000, yearEnd: schemeYearEnd(2026)},
  };

  it('does not depend on the CPI the member was built at', () => {
    for (const assumedCpi of [0, 0.02, 0.05]) {
      const benefits = memberBenefits(
        member, {assumedCpi, pastYears: 'assumed'}, TODAY,
      );
      const {arrangements: [own]} = benefits.pensionInputPeriod(
        taxYearEnd(2027),
        {leaving: isoDate('2045-03-31'), remedy: {kind: REMEDY_BASES.none}},
        0,
      );
      // Read at no inflation: 10,000 revalued at 1.5% is 10,150, plus
      // (54,000 - 12 x 510) / 54 = 47,880 / 54.
      expect(own.pensionClosing, `built at ${assumedCpi}`)
        .toBeCloseTo(10_150 + 47_880 / 54, 6);
    }
  });
});

describe('final pay at a leaving date', () => {
  const LEFT = new Date(2027, 8, 30);
  const pathWith = (sacrifice: Sacrifice) =>
    buildPayPath(BORN, payOf(36_500, [sacrifice]), NO_INFLATION);

  it('never reads a deduction after leaving', () => {
    // First deducted the month after the last day of service.
    const path = pathWith(lease('2027-10', '2030-09'));
    expect(bestSingleOf3(path, LEFT)).toBeCloseTo(36_500, 9);
  });

  it('takes twelve deductions from every year measured', () => {
    // Running to the leaving month through all ten years measured.
    const path = pathWith(lease('2015-04', '2027-09'));
    expect(meanOf3ConsecutiveIn10(path, LEFT))
      .toBeCloseTo(36_500 - 6_120, 9);
  });
});

describe('final pay across a declared year', () => {
  // Leaving mid-month, so a measured year blends two scheme years by days
  // while its deductions fall by whole months.
  const LEFT = new Date(2027, 9, 16);
  const running = lease('2015-04', '2030-03');

  it('does not move when a year is declared at the path\'s own figure',
    () => {
      const undeclared = buildPayPath(
        BORN, payOf(36_500, [running]), NO_INFLATION,
      );
      const declared = buildPayPath(BORN, {
        ...payOf(36_500, [running]),
        // 36,500 less twelve payslips of 510.
        declared: [{schemeYearEnd: schemeYearEnd(2028), todaysMoney: 30_380}],
      }, NO_INFLATION);
      expect(bestSingleOf3(declared, LEFT))
        .toBeCloseTo(bestSingleOf3(undeclared, LEFT), 6);
      expect(bestSingleOf3(declared, LEFT)).toBeCloseTo(30_380, 6);
    });

  it('refuses a sacrifice larger than a year\'s pay it reads', () => {
    const path = buildPayPath(BORN, {
      ...payOf(20_000, [lease('2025-10', '2026-03', 5_000)]),
      current: {todaysMoney: 20_000, asAt: isoDate('2025-09-23')},
      declared: [{schemeYearEnd: schemeYearEnd(2027), todaysMoney: 60_000}],
    }, NO_INFLATION);
    expect(() => bestSingleOf3(path, new Date(2026, 8, 30)))
      .toThrow(RangeError);
  });
});

describe('pay stated before the sacrifice', () => {
  const lease2027 = lease('2024-10', '2027-09');
  const stating = buildPayPath(BORN, {
    ...payOf(54_000, [lease2027]),
    statedBeforeSacrifice: [
      {schemeYearEnd: schemeYearEnd(2028), todaysMoney: 54_000},
    ],
  }, NO_INFLATION);
  const own = buildPayPath(BORN, payOf(54_000, [lease2027]), NO_INFLATION);

  it('keeps a leaver\'s deductions in their own months', () => {
    // Leaving 30 September 2027: April to September, all six of the
    // year's deductions, 3,060, whatever pay was stated.
    const months = {from: isoMonth('2027-04'), count: 6};
    // Not the basis: one was stated, the other worked out.
    expect(stating.payForMonths(schemeYearEnd(2028), months))
      .toMatchObject({
        beforeSacrifice: own.payBeforeSacrifice(schemeYearEnd(2028)),
        sacrificed: own.payForMonths(schemeYearEnd(2028), months).sacrificed,
      });
    expect(stating.payForMonths(schemeYearEnd(2028), months).sacrificed)
      .toBe(3_060);
  });

  it('refuses a year also declared', () => {
    expect(() => buildPayPath(BORN, {
      ...payOf(54_000, []),
      declared: [{schemeYearEnd: schemeYearEnd(2028), todaysMoney: 1}],
      statedBeforeSacrifice: [
        {schemeYearEnd: schemeYearEnd(2028), todaysMoney: 2},
      ],
    }, NO_INFLATION)).toThrow(/given both declared and before sacrifice/);
  });
});

describe('a member who joins and leaves in one scheme year', () => {
  // Joining 20 June 2026 and leaving 31 March 2027 is 9 months and 12
  // days, so 9 months counted, the last of them March: July to March.
  const earnings = (sacrifice: Sacrifice) => {
    const path = buildPayPath(
      BORN, payOf(54_000, [sacrifice]), NO_INFLATION,
    );
    const [row] = buildLedger({
      seed: seedFromJoinDate(new Date(2026, 5, 20)),
      payIn: (year, paid) => path.payForMonths(year, paid),
      exitDate: new Date(2027, 2, 31),
      retirementDate: new Date(2045, 0, 1),
      prices: NO_INFLATION,
      drawingFor: () => null,
      through: schemeYearEnd(2027),
    }).years;
    return row.pensionableEarnings;
  };

  it('takes a deduction in the last month served', () => {
    expect(earnings(lease('2027-03', '2027-03', 100)))
      .toBeCloseTo(54_000 * 9 / 12 - 100, 6);
  });

  it('takes none in the part month that did not count', () => {
    expect(earnings(lease('2026-06', '2026-06', 100)))
      .toBeCloseTo(54_000 * 9 / 12, 6);
  });
});
