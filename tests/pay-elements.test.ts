/**
 * Pay above the scale salary: each element's price, its pensionability
 * by scheme, a contract's full-time week and FTE, and what elements do to
 * a Post. With no elements a Post is unchanged (post.test.ts holds that).
 */

import {describe, expect, it} from 'vitest';
import {
  CONTRACT_FAMILIES,
  PENSION_SCHEMES,
  Post,
  RuleUnsourced,
  SESSION_ALLOWANCES,
  elementPay,
  fteOf,
  isPensionable,
  pensionSchemeOf,
  standardWeek,
} from '../src/index.js';
import type {PayElement} from '../src/index.js';
import {NATION_KEYS} from '@casomoltd/paye-calc';

const YEAR = '2026-27';
const post = (salary: number, nation: 'england' | 'scotland' | 'wales') =>
  Post.fromSalary(salary, nation, YEAR, YEAR);

describe('standardWeek', () => {
  it('reads each family in the unit its contract counts', () => {
    expect(standardWeek(CONTRACT_FAMILIES.afc, 'england', YEAR))
      .toEqual({unit: 'hours', hours: 37.5});
    expect(standardWeek(CONTRACT_FAMILIES.afc, 'scotland', YEAR))
      .toEqual({unit: 'hours', hours: 36});
    expect(standardWeek(CONTRACT_FAMILIES.resident, 'england', YEAR))
      .toEqual({unit: 'hours', hours: 40});
    expect(standardWeek(CONTRACT_FAMILIES.consultant, 'england', YEAR))
      .toEqual({unit: 'pas', pas: 10});
    expect(standardWeek(CONTRACT_FAMILIES.consultant, 'wales', YEAR))
      .toEqual({unit: 'sessions', sessions: 10});
    expect(standardWeek(CONTRACT_FAMILIES.sas, NATION_KEYS.northernIreland, YEAR))
      .toEqual({unit: 'pas', pas: 10});
  });

  it('refuses a week it has not read rather than borrow one', () => {
    expect(() => standardWeek(
      CONTRACT_FAMILIES.resident, NATION_KEYS.northernIreland, YEAR,
    )).toThrow(RuleUnsourced);
    expect(() => standardWeek(CONTRACT_FAMILIES.salariedGp, 'wales', YEAR))
      .toThrow(RuleUnsourced);
    expect(() => standardWeek(
      CONTRACT_FAMILIES.communityDental, 'scotland', YEAR,
    )).toThrow(RuleUnsourced);
  });
});

describe('fteOf', () => {
  it('is the week over the standard week', () => {
    expect(fteOf({unit: 'hours', hours: 30}, 'afc', 'england', YEAR))
      .toBeCloseTo(0.8, 10);
    expect(fteOf({unit: 'pas', pas: 7}, 'consultant', 'england', YEAR))
      .toBeCloseTo(0.7, 10);
  });

  it('stops at 1: hours above full-time are not a larger post', () => {
    expect(fteOf({unit: 'hours', hours: 48}, 'resident', 'england', YEAR))
      .toBe(1);
  });

  it('refuses a week in a unit the contract does not count', () => {
    expect(() => fteOf(
      {unit: 'hours', hours: 40}, 'consultant', 'england', YEAR,
    )).toThrow(RangeError);
  });
});

describe('elementPay', () => {
  it('prices a percentage on the pro-rated scale salary', () => {
    const p = post(40_000, 'england').withAdjustments({fte: 0.5});
    const rrp: PayElement = {
      kind: 'rrp', amount: {basis: 'percent', pct: 10}, term: 'long',
    };
    expect(elementPay(rrp, p)).toBe(2_000);
  });

  it('prices a session allowance from its published rate', () => {
    const p = post(40_000, 'scotland');
    expect(elementPay({
      kind: 'session-allowance',
      id: SESSION_ALLOWANCES.scotlandOnCallAvailability,
      sessionsPerYear: 52,
    }, p)).toBeCloseTo(27.51 * 52, 2);
  });

  it('refuses an allowance the post\'s nation does not pay', () => {
    expect(() => elementPay({
      kind: 'session-allowance',
      id: SESSION_ALLOWANCES.scotlandOnCallAvailability,
      sessionsPerYear: 52,
    }, post(40_000, 'england'))).toThrow(RangeError);
  });
});

describe('isPensionable', () => {
  const ew = PENSION_SCHEMES.englandWales;

  it('counts a long-term premium and not a short-term one', () => {
    const rrp = (term: 'long' | 'short'): PayElement => ({
      kind: 'rrp', amount: {basis: 'annual', pounds: 1_000}, term,
    });
    expect(isPensionable(rrp('long'), ew)).toBe(true);
    expect(isPensionable(rrp('short'), ew)).toBe(false);
  });

  it('never counts overtime, and counts additional hours', () => {
    expect(isPensionable({kind: 'overtime', amount: 1}, ew)).toBe(false);
    expect(isPensionable({kind: 'additional-hours', amount: 1}, ew))
      .toBe(true);
  });

  it('refuses the Welsh sleeping-in allowance until it is sourced', () => {
    expect(() => isPensionable({
      kind: 'session-allowance',
      id: SESSION_ALLOWANCES.walesSleepingIn,
      sessionsPerYear: 10,
    }, ew)).toThrow(RuleUnsourced);
  });

  it('puts each nation in its scheme', () => {
    expect(pensionSchemeOf('wales')).toBe(ew);
    expect(pensionSchemeOf(NATION_KEYS.northernIreland))
      .toBe(PENSION_SCHEMES.northernIreland);
  });
});

describe('a Post with pay elements', () => {
  const base = post(40_000, 'england');
  const withOvertime = base.withAdjustments({
    elements: [{kind: 'overtime', amount: 5_000}],
  });

  it('adds every element to gross and only the pensionable to the base', () => {
    expect(withOvertime.grossPay).toBe(45_000);
    expect(withOvertime.pensionablePay).toBe(40_000);
  });

  it('takes the contribution on pensionable pay and taxes the gross', () => {
    expect(withOvertime.pensionContribution)
      .toBeCloseTo(base.pensionContribution, 2);
    expect(withOvertime.tax).toBeGreaterThan(base.tax);
    expect(withOvertime.nationalInsurance)
      .toBeGreaterThan(base.nationalInsurance);
  });

  it('raises the tier when a pensionable element crosses a threshold', () => {
    const unsocial = base.withAdjustments({
      elements: [{kind: 'unsocial-hours', amount: 20_000}],
    });
    expect(unsocial.pensionablePay).toBe(60_000);
    expect(unsocial.pensionRate).toBeGreaterThan(base.pensionRate);
  });
});
