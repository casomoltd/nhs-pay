/**
 * `memberBenefits` refuses a drawing below the member's minimum pension
 * age, and names that age for a drawing date.
 *
 * Every member here is born on 1 January 1979 and paid Band 6. Finance
 * Act 2004 s.279(1) puts the law's age at 57 from 6 April 2028; Sch 36
 * para 23ZB(3) and (7) keep "the higher of 55" and the age a member had
 * a right from, for one in the scheme immediately before 4 November 2021.
 */
import {describe, expect, it} from 'vitest';
import {getAfcScales, mayDrawOn} from '../src/index.js';
import {isoDate} from '../src/iso-date.js';
import {memberBenefits, SECTIONS} from '../src/member/index.js';
import type {DeclaredPeriod, MemberBenefits} from '../src/member/index.js';

const TODAY = new Date(2026, 8, 23);
const band6 = getAfcScales('2026-27', 'england').bands
  .find((b) => b.band === '6');
if (band6 === undefined) throw new Error('Band 6 missing');
const point = band6.points[0];

const withService = (service: DeclaredPeriod[]) => memberBenefits({
  dateOfBirth: isoDate('1979-01-01'),
  service,
  pay: {
    declared: [],
    current: {todaysMoney: point.salary, asAt: isoDate('2026-09-23')},
    ladder: {points: band6.points, current: point},
    partTime: false,
  },
  statement: null,
}, {assumedCpi: 0.02, pastYears: 'assumed'}, TODAY);

const joinedOn = (joined: string) => withService([
  {section: SECTIONS.s2015, joined: isoDate(joined), left: null},
]);

const drawnOn = (who: MemberBenefits, day: string) => who.at({
  leaving: isoDate(day),
  drawing: isoDate(day),
  remedy: who.remedy ? {kind: 'legacy-basis'} : {kind: 'none'},
  cash: {kind: 'automatic-only'},
});

describe('a member in the scheme before 4 November 2021', () => {
  const earlier = joinedOn('2016-04-01');

  it('keeps a protected 55 after the rise', () => {
    expect(earlier.minimumPensionAgeOn(isoDate('2034-01-01'))).toBe(55);
  });

  it('is refused a drawing the day before the 55th birthday', () => {
    expect(() => drawnOn(earlier, '2033-12-31'))
      .toThrow(/minimum pension age, 55/);
  });

  it('is valued on the 55th birthday', () => {
    expect(drawnOn(earlier, '2034-01-01').crystallised.pension.nominal)
      .toBeGreaterThan(0);
  });
});

describe('a member who first joined after 3 November 2021', () => {
  const later = joinedOn('2022-04-01');

  it('takes the law\'s 57 once the rise takes effect', () => {
    expect(later.minimumPensionAgeOn(isoDate('2036-01-01'))).toBe(57);
  });

  it('is refused a drawing at 55 or 56', () => {
    expect(() => drawnOn(later, '2034-01-01'))
      .toThrow(/minimum pension age, 57/);
    expect(() => drawnOn(later, '2035-12-31'))
      .toThrow(/minimum pension age, 57/);
  });

  it('is valued on the 57th birthday', () => {
    expect(drawnOn(later, '2036-01-01').crystallised.pension.nominal)
      .toBeGreaterThan(0);
  });
});

describe('a legacy member', () => {
  it('is refused below 55, the age the 2015 Section is drawn from', () => {
    // A protected 50 would be the 1995 Section's alone; `at()` draws the
    // 2015 Section with it (docs/how-it-works.md#minimum-pension-age).
    const legacy = withService([
      {section: SECTIONS.s1995, joined: isoDate('2004-04-01'),
        left: isoDate('2015-03-31')},
      {section: SECTIONS.s2015, joined: isoDate('2015-04-01'), left: null},
    ]);
    expect(legacy.minimumPensionAgeOn(isoDate('2033-12-31'))).toBe(55);
    expect(() => drawnOn(legacy, '2033-12-31'))
      .toThrow(/minimum pension age, 55/);
  });
});

describe('the minimum age a member is told, and whether they may draw', () => {
  // Born on 1 January 1979, a drawing on 1 January is a birthday, so the
  // member is that year less 1979 old and may draw exactly when that age
  // reaches the one `minimumPensionAgeOn` names.
  it.each(['2016-04-01', '2021-11-03', '2021-11-04', '2022-04-01'])(
    'agree for a member who first joined on %s', (joined) => {
      const who = joinedOn(joined);
      for (let year = 2032; year <= 2038; year += 1) {
        const drawing = isoDate(`${year}-01-01`);
        const told = who.minimumPensionAgeOn(drawing);
        expect(who.mayDrawOn(drawing), `${joined}, ${drawing}`)
          .toBe(year - 1979 >= told);
        expect(mayDrawOn(
          {born: isoDate('1979-01-01'), firstJoined: isoDate(joined)}, drawing,
        )).toBe(who.mayDrawOn(drawing));
      }
    });
});
