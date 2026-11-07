/**
 * A member's pension input period, read by paye-calc's
 * `definedBenefitInput` (HMRC PTM053301,
 * https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm053301):
 * a 2015 Section year worked by hand, a leaver, and a remedy member whose
 * legacy section and remedy window are one arrangement, serving and left.
 */
import {describe, expect, it} from 'vitest';
import {
  DB_PENSION_INPUT_MULTIPLIER, definedBenefitInput, taxYearEnd,
  taxYearEndDate, taxYearEndFor,
} from '@casomoltd/paye-calc';
import {isoDate} from '../src/iso-date.js';
import {memberBenefits, REMEDY_BASES} from '../src/member/index.js';
import type {
  Award, Member, RetirementChoices,
} from '../src/member/index.js';
import type {MemberLedger} from '../src/pension/ledger.js';
import {inventedMember} from './helpers.js';
import type {MadeElection} from './helpers.js';
import {schemeYearEnd} from '../src/pension/seed.js';

const TODAY = new Date(2026, 8, 23);
/** 2026-27, the tax year `TODAY` falls in. */
const THIS_TAX_YEAR = taxYearEnd(2027);
const NEXT_TAX_YEAR = taxYearEnd(2028);
/** The choices a pension input period reads. */
type PeriodChoices = Pick<RetirementChoices, 'leaving' | 'remedy'>;
/** A serving member's leaving, after every tax year read here, and no
 *  election: a member with no remedy window. */
const NONE: PeriodChoices = {
  leaving: isoDate('2045-03-31'), remedy: {kind: REMEDY_BASES.none},
};
/** The leaving declared for the leavers here, six months into 2026-27. */
const LEFT_2026 = isoDate('2026-09-30');
/** The CPI assumed for every year, as a decimal. */
const CPI = 0.02;
const ASSUMED = {assumedCpi: CPI, pastYears: 'assumed'} as const;

/** A member in the 2015 Section alone, joined in 2016, on £54,000 now,
 *  with a statement of £10,000 at 31 March 2026. */
function member2015(left: string | null): Member {
  return {
    dateOfBirth: isoDate('1980-06-15'),
    service: [{
      section: 'section-2015', joined: isoDate('2016-04-01'),
      left: left === null ? null : isoDate(left),
    }],
    pay: {
      declared: [],
      current: {todaysMoney: 54_000, asAt: isoDate('2026-09-23')},
      ladder: null,
      partTime: false,
    },
    statement: {accruedPension: 10_000, asAt: isoDate('2026-03-31')},
  };
}

/** An award's cash ledger: a career average award always walks one. */
function cashLedger(award: Award): MemberLedger {
  if (award.ledgers === null) {
    throw new Error(`${award.section}: a career average award with no ledger`);
  }
  return award.ledgers.cash;
}

it('names the tax year TODAY falls in', () => {
  expect(taxYearEndFor(TODAY)).toBe(THIS_TAX_YEAR);
});

describe('a 2015 Section year, worked by hand', () => {
  const benefits = memberBenefits(member2015(null), ASSUMED, TODAY);
  const period = benefits.pensionInputPeriod(THIS_TAX_YEAR, NONE, CPI);

  it('is one arrangement, with no automatic lump sum', () => {
    expect(period.arrangements).toHaveLength(1);
    const [own] = period.arrangements;
    expect([own.lumpSumOpening, own.lumpSumClosing]).toEqual([0, 0]);
  });

  it('gives the input PTM053301 works out', () => {
    // The premise: 2026-27's pay is the pay given now, and on an assumed
    // 2% a year it is the same cash on 31 March 2027, before the next
    // April step.
    // The scheme year ending 31 March 2027, a scheme year and not a tax
    // year: the path holds pay by scheme year.
    const pay = benefits.payPath.payFor(schemeYearEnd(2027)).pay;
    expect(pay).toBe(54_000);
    // Opening, 5 April 2026: the statement's balance, before the
    // revaluation of 6 April 2026.                         £10,000.00
    // Closing, 5 April 2027: revalued at CPI + 1.5 = 3.5%,
    //   10,000 x 1.035 = 10,350, plus 54,000 / 54 = 1,000.  £11,350.00
    // Opening uplifted by the September CPI before the year, 2%:
    //   10,000 x 1.02.                                      £10,200.00
    // Growth 11,350 - 10,200 = 1,150, times 16.             £18,400.00
    const [own] = period.arrangements;
    expect(own.pensionOpening).toBeCloseTo(10_000, 6);
    expect(own.pensionClosing).toBeCloseTo(11_350, 6);
    expect(period.cpi).toBeCloseTo(CPI, 12);
    // PTM053301, opening and closing value step 2: "multiply the annual
    // amount of that pension by 16".
    expect(DB_PENSION_INPUT_MULTIPLIER).toBe(16);
    expect(definedBenefitInput(period)).toBeCloseTo(18_400, 6);
  });

  it('opens each year on the last one\'s close', () => {
    const next = benefits.pensionInputPeriod(NEXT_TAX_YEAR, NONE, CPI);
    expect(next.arrangements[0].pensionOpening)
      .toBeCloseTo(period.arrangements[0].pensionClosing, 9);
  });

  it('opens its first period at nil', () => {
    // Joined on 1 April 2016, after 8 July 2015: Finance Act 2004 s.238ZB
    // starts its first period then, holding nothing, so 2016-17 opens at
    // nil (https://www.legislation.gov.uk/ukpga/2004/12/section/238ZB).
    // With no statement, the walk starts on the day the member joined.
    const joined = memberBenefits(
      {...member2015(null), statement: null}, ASSUMED, TODAY,
    );
    const [own] = joined.pensionInputPeriod(taxYearEnd(2017), NONE, CPI)
      .arrangements;
    expect(own.pensionOpening).toBe(0);
    // It closes on the year's accrual, as `at()`'s walk holds it that day.
    const [award] = joined.at({
      leaving: NONE.leaving, drawing: NONE.leaving, remedy: NONE.remedy,
      cash: {kind: 'automatic-only'},
    }).awards;
    const closes = taxYearEndDate(taxYearEnd(2017));
    expect(cashLedger(award).accruedAt(closes)).toBeGreaterThan(0);
    expect(own.pensionClosing)
      .toBeCloseTo(cashLedger(award).accruedAt(closes), 6);
  });

  it('reads a year alike whatever was asked of it before', () => {
    // The walks are kept, and a first read walks to the pension age, in
    // 2047-48, or to a later year asked. Either order of an early and a far
    // year reads each as a fresh instance does. The member serves on past
    // both, to 2052.
    const far = taxYearEnd(2050);
    const late: PeriodChoices = {...NONE, leaving: isoDate('2052-03-31')};
    const fresh = memberBenefits(member2015(null), ASSUMED, TODAY);
    const walkedFar = memberBenefits(member2015(null), ASSUMED, TODAY);
    const farFirst = walkedFar.pensionInputPeriod(far, late, CPI);
    expect(walkedFar.pensionInputPeriod(NEXT_TAX_YEAR, late, CPI))
      .toEqual(fresh.pensionInputPeriod(NEXT_TAX_YEAR, late, CPI));
    expect(fresh.pensionInputPeriod(far, late, CPI)).toEqual(farFirst);
  });

  it('refuses an election, and a year before 2016-17', () => {
    expect(() => benefits.pensionInputPeriod(
      THIS_TAX_YEAR, {...NONE, remedy: {kind: REMEDY_BASES.legacy}}, CPI))
      .toThrow('pensionInputPeriod: an election for a member with no '
        + 'remediable service');
    expect(() => benefits.pensionInputPeriod(taxYearEnd(2016), NONE, CPI))
      .toThrow('pensionInputPeriod: 2015-16 is before the first tax year');
    expect(() => benefits.pensionInputPeriod(taxYearEnd(2017), NONE, CPI))
      .not.toThrow();
  });
});

describe('a period on the published past', () => {
  const benefits = memberBenefits(
    member2015(null), {assumedCpi: CPI, pastYears: 'published'}, TODAY);

  it('reads the September CPI before the year from the Order', () => {
    // 2025-26 is uplifted by September 2024's CPI, 1.7%: the Public
    // Service Pensions Revaluation Order 2025, SI 2025/252
    // (https://www.legislation.gov.uk/uksi/2025/252), and ONS series D7G7.
    const period = benefits.pensionInputPeriod(taxYearEnd(2026), NONE, CPI);
    expect(period.cpi).toBeCloseTo(0.017, 12);
  });
});

describe('a leaver', () => {
  // The same member, leaving on 30 September 2026, six months into
  // 2026-27.
  const benefits = memberBenefits(member2015(LEFT_2026), ASSUMED, TODAY);
  const LEFT: PeriodChoices = {...NONE, leaving: LEFT_2026};

  it('counts the leaving year\'s part pay and its leaver adjustment', () => {
    // Closing: (10,350 + 54,000 x 6/12 / 54) = 10,850, then the leaver
    // adjustment of 3.5% x 6/12 = 1.75%: 10,850 x 1.0175 = 11,039.875.
    // Growth over 10,200 is 839.875, times 16 = 13,438.
    const period = benefits.pensionInputPeriod(THIS_TAX_YEAR, LEFT, CPI);
    expect(period.arrangements[0].pensionClosing).toBeCloseTo(11_039.875, 6);
    expect(definedBenefitInput(period)).toBeCloseTo(13_438, 6);
  });

  it('reads a leaving asked of a serving member as a declared one', () => {
    const asked = memberBenefits(member2015(null), ASSUMED, TODAY)
      .pensionInputPeriod(THIS_TAX_YEAR, LEFT, CPI);
    expect(asked)
      .toEqual(benefits.pensionInputPeriod(THIS_TAX_YEAR, LEFT, CPI));
  });

  it('refuses a leaving after the one declared', () => {
    expect(() => benefits.pensionInputPeriod(THIS_TAX_YEAR, NONE, CPI))
      .toThrow('pensionInputPeriod: leaving after the member already left, '
        + 'on 2026-09-30');
  });

  it('holds the deferred value after it, which puts nothing in', () => {
    // The first increase after leaving is the share of the year since:
    // 1 October to 6 April is six months, so 2% x 6/12 = 1%, less than
    // the 2% the opening value is uplifted by, and the input is nought.
    const after = benefits.pensionInputPeriod(NEXT_TAX_YEAR, LEFT, CPI);
    const [own] = after.arrangements;
    expect(own.pensionOpening).toBeCloseTo(11_039.875, 6);
    expect(own.pensionClosing).toBeCloseTo(11_039.875 * 1.01, 6);
    expect(definedBenefitInput(after)).toBe(0);
  });
});

describe('a remedy member', () => {
  // The invented member: the 1995 Section, its remedy window, then the
  // 2015 Section from 1 April 2022.
  const benefits = memberBenefits(inventedMember(), ASSUMED, TODAY);
  /** Valued on the 2015 basis, which walks the window as career average;
   *  the dates are any a member could draw on. */
  const reformedAt = benefits.at({
    leaving: isoDate('2039-09-30'), drawing: isoDate('2039-09-30'),
    remedy: {kind: REMEDY_BASES.section2015}, cash: {kind: 'automatic-only'},
  });
  const on = (basis: MadeElection) =>
    benefits.pensionInputPeriod(
      THIS_TAX_YEAR, {...NONE, remedy: {kind: basis}}, CPI);

  it('holds the legacy section and its window as one arrangement', () => {
    // Two arrangements: the legacy section with its window, and the 2015
    // Section.
    expect(on(REMEDY_BASES.legacy).arrangements).toHaveLength(2);
    expect(on(REMEDY_BASES.section2015).arrangements).toHaveLength(2);
  });

  it('values the window on final salary on the legacy basis', () => {
    // SI 1995/300: the automatic lump sum is three times the pension, and
    // on this basis all of the 1995 Section's pension is final salary.
    const [legacy] = on(REMEDY_BASES.legacy).arrangements;
    expect(legacy.lumpSumClosing).toBeCloseTo(3 * legacy.pensionClosing, 6);
    expect(legacy.lumpSumOpening).toBeCloseTo(3 * legacy.pensionOpening, 6);
  });

  it.each([REMEDY_BASES.legacy, REMEDY_BASES.section2015])(
    'holds on the %s what a leaving on the 5 April closing it would be paid',
    (basis) => {
      // The member serves through 2026-27, so the close is valued as a
      // leaving on 5 April 2027 is: `at()`'s final-salary award before any
      // factor, taken from today's money to that day's cash in the same
      // series. On the 2015 basis the window's pot sits beside it.
      const [legacy] = on(basis).arrangements;
      const closes = taxYearEndDate(THIS_TAX_YEAR);
      const leaving = benefits.at({
        leaving: isoDate('2027-04-05'), drawing: isoDate('2039-09-30'),
        remedy: {kind: basis}, cash: {kind: 'automatic-only'},
      });
      const [finalSalary, window] = leaving.awards;
      const pot = basis === REMEDY_BASES.section2015
        ? cashLedger(window).accruedAt(closes)
        : 0;
      const toCash = leaving.prices.payAt(1, closes);
      expect((legacy.pensionClosing - pot) / toCash)
        .toBeCloseTo(finalSalary.pensionBeforeFactor.real, 6);
      expect(legacy.lumpSumClosing / toCash)
        .toBeCloseTo(finalSalary.automaticLumpSumBeforeFactor.real, 6);
    },
  );

  it('adds the window\'s career average pot on the 2015 basis', () => {
    // The pot pays no lump sum, so the pension is a third of the lump sum
    // plus the pot; and the pot is the one `at()` walks for the window,
    // read on the same day, so the two routes cannot drift apart.
    const [reformed] = on(REMEDY_BASES.section2015).arrangements;
    const [, window, own] = reformedAt.awards;
    const closes = taxYearEndDate(THIS_TAX_YEAR);
    const pot = cashLedger(window).accruedAt(closes);
    expect(pot).toBeGreaterThan(0);
    expect(reformed.pensionClosing)
      .toBeCloseTo(reformed.lumpSumClosing / 3 + pot, 6);
    expect(on(REMEDY_BASES.section2015).arrangements[1].pensionClosing)
      .toBeCloseTo(cashLedger(own).accruedAt(closes), 6);
  });

  it('counts a 1 April Order in the tax year it falls in', () => {
    // 2021-22 closes on 5 April 2022, after the Order applied on 1 April
    // 2022 (SI 2022/215): the window's pot at the close is the 31 March
    // balance revalued at the assumed CPI + 1.5, 3.5%.
    const [reformed] = benefits.pensionInputPeriod(taxYearEnd(2022),
      {...NONE, remedy: {kind: REMEDY_BASES.section2015}}, CPI).arrangements;
    const window = cashLedger(reformedAt.awards[1]);
    const before = window.accruedAt(new Date(2022, 2, 31));
    const pot = reformed.pensionClosing - reformed.lumpSumClosing / 3;
    expect(before).toBeGreaterThan(0);
    expect(pot).toBeCloseTo(before * 1.035, 6);
  });

  it('leaves the 2015 Section\'s own arrangement alike on either basis',
    () => {
      expect(on(REMEDY_BASES.legacy).arrangements[1])
        .toEqual(on(REMEDY_BASES.section2015).arrangements[1]);
    });

  it('needs an election', () => {
    expect(() => benefits.pensionInputPeriod(THIS_TAX_YEAR, NONE, CPI))
      .toThrow('pensionInputPeriod: a remedy member needs an election');
  });
});

describe('a remedy member who has left', () => {
  // The invented member, leaving the 2015 Section on 30 September 2030,
  // six months into 2030-31, valued on the legacy basis.
  const left = new Date(2030, 8, 30);
  const member = inventedMember();
  const leaver: Member = {
    ...member,
    service: member.service.map((p) => (p.left === null
      ? {...p, left: isoDate('2030-09-30')}
      : p)),
  };
  const benefits = memberBenefits(leaver, ASSUMED, TODAY);
  const choices: PeriodChoices = {
    leaving: isoDate('2030-09-30'), remedy: {kind: REMEDY_BASES.legacy},
  };
  const atLeaving = benefits.at({
    ...choices, drawing: isoDate('2039-09-30'),
    cash: {kind: 'automatic-only'},
  });
  const [finalSalary] = atLeaving.awards;
  const real = finalSalary.pensionBeforeFactor.real;
  const lumpSumReal = finalSalary.automaticLumpSumBeforeFactor.real;
  const inCash = (on: Date) => atLeaving.prices.payAt(1, on);

  it('closes the leaving year on the leaving date, as at() values it', () => {
    const [legacy] = benefits.pensionInputPeriod(
      taxYearEnd(2031), choices, CPI).arrangements;
    expect(legacy.pensionClosing / inCash(left)).toBeCloseTo(real, 6);
    expect(legacy.lumpSumClosing / inCash(left)).toBeCloseTo(lumpSumReal, 6);
  });

  it('carries the deferred final-salary values in cash the year after', () => {
    // Measured at leaving, the pension and lump sum hold still in today's
    // money; each date reads them in that day's cash.
    const [legacy] = benefits.pensionInputPeriod(
      taxYearEnd(2032), choices, CPI).arrangements;
    const opens = taxYearEndDate(taxYearEnd(2031));
    const closes = taxYearEndDate(taxYearEnd(2032));
    expect(legacy.pensionOpening).toBeCloseTo(real * inCash(opens), 6);
    expect(legacy.pensionClosing).toBeCloseTo(real * inCash(closes), 6);
    expect(legacy.lumpSumClosing).toBeCloseTo(lumpSumReal * inCash(closes), 6);
  });
});
