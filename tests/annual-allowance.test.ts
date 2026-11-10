// The arrangement maths (PTM053301) is paye-calc's `definedBenefitInput`,
// tested there, and each year's arrangements are `pensionInputPeriod`,
// tested in member-benefits; this tests the allowance reading itself: the
// status against the allowance, money purchase contributions added to the
// input, and which years are read.
import {describe, expect, it} from 'vitest';
import {
  CURRENT_TAX_YEAR, getTaxYearConfig, TAX_REGIONS, taxYearEndOf,
} from '@casomoltd/paye-calc';
import type {PensionInputPeriod} from '@casomoltd/paye-calc';
import {
  ALLOWANCE_STATUS, allowanceReading, firstYearOver,
  isoDate, isoDateOf, memberBenefits, PAST_YEARS, REMEDY_BASES, schemeYearEnd,
  SECTIONS, TODAYS_MONEY_CPI,
} from '../src/index.js';
import type {Member} from '../src/index.js';

const ALLOWANCE = getTaxYearConfig(CURRENT_TAX_YEAR, TAX_REGIONS.rUK)
  .annualAllowance.standard;

/** A year whose one arrangement's pension grows by `growth`, in the tax
 *  year {@link ALLOWANCE} is read for. */
const growing = (growth: number): PensionInputPeriod => ({
  taxYearEnd: taxYearEndOf(CURRENT_TAX_YEAR),
  arrangements: [{
    pensionOpening: 10_000, pensionClosing: 10_000 + growth,
    lumpSumOpening: 0, lumpSumClosing: 0,
  }],
  cpi: 0,
});

/** The pension growth that gives an input of `input`: a defined
 *  benefit pension's growth counts sixteen times (HMRC PTM053301,
 *  https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm053301). */
const growthFor = (input: number) => input / 16;

describe('allowanceReading', () => {
  it('is clear below the allowance', () => {
    const reading = allowanceReading(
      growing(growthFor(ALLOWANCE / 2)), 0, ALLOWANCE);
    expect(reading.input).toBeCloseTo(ALLOWANCE / 2);
    expect(reading.status).toBe(ALLOWANCE_STATUS.clear);
    expect(reading.allowance).toBe(ALLOWANCE);
  });

  it('is clear at the allowance itself: only an input over it is '
    + 'charged', () => {
    const reading = allowanceReading(
      growing(growthFor(ALLOWANCE)), 0, ALLOWANCE);
    expect(reading.input).toBeCloseTo(ALLOWANCE);
    expect(reading.status).toBe(ALLOWANCE_STATUS.clear);
  });

  it('is over above the allowance, counting pot contributions', () => {
    const reading = allowanceReading(
      growing(growthFor(ALLOWANCE)), 1, ALLOWANCE);
    expect(reading.input).toBe(ALLOWANCE + 1);
    expect(reading.status).toBe(ALLOWANCE_STATUS.over);
  });

  it('adds contributions to a nought defined benefit input', () => {
    const reading = allowanceReading(growing(-500), 100, ALLOWANCE);
    expect(reading.input).toBe(100);
  });
});

describe('firstYearOver', () => {
  const TODAY = new Date(2026, 8, 23);
  /** A 2015 Section member on `pay`, still in service. */
  const memberOn = (pay: number): Member => ({
    dateOfBirth: isoDate('1980-06-15'),
    service: [{section: SECTIONS.s2015, joined: isoDate('2016-04-01'),
      left: null}],
    pay: {
      declared: [], current: {todaysMoney: pay, asAt: isoDateOf(TODAY)},
      ladder: null, partTime: false,
    },
    statement: null,
  });
  const read = (member: Member, leaving: Date, contributions = 0) =>
    firstYearOver({
      benefits: memberBenefits(member, {
        assumedCpi: TODAYS_MONEY_CPI, pastYears: PAST_YEARS.assumed,
      }, TODAY),
      today: TODAY, leaving, contributions, allowance: ALLOWANCE,
    });
  const over = (pay: number, leaving: Date, contributions = 0) =>
    read(memberOn(pay), leaving, contributions);
  const LEAVING = new Date(2046, 5, 15);

  it('starts at the tax year today falls in', () => {
    expect(over(200_000, LEAVING)?.taxYearEnd).toBe(2027);
  });

  it('reads the year the member leaves in, and none after', () => {
    // 2026-27 ends on 5 April 2027: a leaving the day before is read in it,
    // as a leaver's part year; a leaving before today reads no year.
    expect(over(200_000, new Date(2027, 3, 4))?.taxYearEnd).toBe(2027);
    expect(over(200_000, new Date(2026, 8, 22))).toBeNull();
  });

  it('counts a year\'s pot contributions', () => {
    expect(over(30_000, LEAVING)).toBeNull();
    expect(over(30_000, LEAVING, ALLOWANCE)?.taxYearEnd).toBe(2027);
  });

  it('flags a final-salary member\'s leaving year', () => {
    // A 1995 Section member with a remedy window, whose pay rises from
    // £100,000 to £130,000 in the scheme year they leave at the end of,
    // 2026-27: the one tax year read is that part year, which closes on the
    // leaving date as a leaver, and the rise in final pay takes it over on
    // the legacy option. A reading of whole years alone would skip it.
    const member: Member = {
      dateOfBirth: isoDate('1975-06-15'),
      service: [
        {section: SECTIONS.s1995, joined: isoDate('2004-04-01'),
          left: isoDate('2022-03-31')},
        {section: SECTIONS.s2015, joined: isoDate('2022-04-01'), left: null},
      ],
      pay: {
        declared: [2024, 2025, 2026].map((year) =>
          ({schemeYearEnd: schemeYearEnd(year), todaysMoney: 100_000})),
        current: {todaysMoney: 130_000, asAt: isoDateOf(TODAY)},
        ladder: null, partTime: false,
      },
      statement: null,
    };
    const flagged = read(member, new Date(2027, 2, 31));
    expect(flagged?.taxYearEnd).toBe(2027);
    expect(flagged?.basis).toBe(REMEDY_BASES.legacy);
  });
});
