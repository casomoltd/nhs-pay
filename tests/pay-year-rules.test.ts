// The pay-year rules a consumer asks of the award and source tables: when a
// pay year starts, whether a document landed after that and left arrears,
// and how many months of back pay a late award's first payslip carries.

import {describe, expect, it} from 'vitest';
import {NATION_KEYS, payYear} from '@casomoltd/paye-calc';
import type {Nation} from '@casomoltd/paye-calc';
import {afcScaleSource, latestAfcYear} from '../src/index.js';
import {backdatedMonths} from '../src/award.js';
import type {PayAward} from '../src/award.js';
import {isoDate, isoMonth} from '../src/iso-date.js';
import {payYearStartDate} from '../src/pay-year.js';

describe('payYearStartDate', () => {
  it('is 1 April of the year the pay year opens in, not 6 April', () => {
    const start = payYearStartDate(payYear('2026-27'));
    expect([start.getFullYear(), start.getMonth(), start.getDate()])
      .toEqual([2026, 3, 1]);
  });
});

describe('DocumentSource.paidInArrears', () => {
  const NATIONS = Object.values(NATION_KEYS) as Nation[];

  it.each(NATIONS)('%s: arrears exactly when its circular landed after 1 April',
    (nation) => {
      const year = latestAfcYear(nation);
      const source = afcScaleSource(year, nation);
      expect(source.paidInArrears(year))
        .toBe(source.issued > `${year.slice(0, 4)}-04-01`);
    });

  it('a document issued on 1 April itself leaves nothing to backdate', () => {
    const source = afcScaleSource(latestAfcYear('england'), 'england');
    const onTheDay = Object.create(source, {
      issued: {value: isoDate('2026-04-01')},
    }) as typeof source;
    expect(onTheDay.paidInArrears(payYear('2026-27'))).toBe(false);
  });
});

describe('backdatedMonths', () => {
  const award = (expectedInPay?: string): PayAward => ({
    effectiveFrom: isoDate('2026-04-01'),
    ...(expectedInPay ? {expectedInPay: isoMonth(expectedInPay)} : {}),
  }) as PayAward;

  it('counts April to August for an award landing in September: five', () => {
    expect(backdatedMonths(award('2026-09'))).toBe(5);
  });

  it('counts nothing where no landing month was published', () => {
    expect(backdatedMonths(award())).toBeUndefined();
  });

  it('counts across a year end', () => {
    expect(backdatedMonths(award('2027-01'))).toBe(9);
  });
});
