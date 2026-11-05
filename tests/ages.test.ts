/**
 * Where each expected age comes from.
 *
 * Normal pension age: boundaries are dates of birth from gov.uk's "State
 * Pension age timetable" (legislated by the Pensions Acts 1995/2007/2011/2014;
 * page last updated 15 May 2014 and the dates unchanged since). Transitional
 * cohorts (SPA = whole years + months) round UP to the next whole year: see
 * src/pension/ages.ts for the convention.
 *
 * Minimum pension age:
 * - The rise to 57 for a late joiner, and the 3/4 November boundary, are DHSC's
 *   response to petition 779519 (docs/source-archive.md#sa-59).
 * - 55 for an earlier joiner is the declared inference from that sentence,
 *   pinned here as a decision (docs/how-it-works.md#minimum-pension-age).
 * - The rise's day, 6 April 2028, and 50 before 6 April 2010 are Finance Act 2004
 *   s.279(1), through paye-calc.
 */

import {minimumPensionAge} from '@casomoltd/paye-calc';
import {describe, expect, it} from 'vitest';
import {isoDate} from '../src/iso-date.js';
import {SECTIONS} from '../src/member-benefits.js';
import {
  memberMinimumPensionAge,
  MPA_KEPT_AGE,
  normalPensionAge,
} from '../src/pension/ages.js';

// The law's rise in the minimum pension age, from 55 to 57, takes effect on
// 6 April 2028 (Finance Act 2004 s.279(1)). These are drawing dates: the last day
// before it, and the day it takes effect.
const BEFORE_RISE = new Date(2028, 3, 5);
const AFTER_RISE = new Date(2028, 3, 6);

const joinedOn = (joined: string) => ({
  service: [{section: SECTIONS.s2015, joined: isoDate(joined), left: null}],
});

describe('normalPensionAge', () => {
  it.each([
    // [year, monthIndex, day, expected NPA]
    // Floor: SPA ≤ 65 (women's pre-equalisation SPA was
    // lower still; the 2015 scheme floors NPA at 65).
    [1950, 0, 1, 65],
    [1953, 11, 5, 65],
    // 6 Dec 1953 — first cohort with SPA above 65
    // (PA 2011 phasing), rounds up to 66.
    [1953, 11, 6, 66],
    // 6 Oct 1954 – 5 Apr 1960 — SPA exactly 66.
    [1954, 9, 6, 66],
    [1960, 3, 5, 66],
    // 6 Apr 1960 — "66 years and 1 month" (PA 2014 phasing),
    // rounds up to 67.
    [1960, 3, 6, 67],
    // 6 Mar 1961 – 5 Apr 1977 — SPA exactly 67.
    [1961, 2, 6, 67],
    [1977, 3, 5, 67],
    // 6 Apr 1977 — PA 2007 phasing to 68, rounds up.
    [1977, 3, 6, 68],
    // 6 Apr 1978 onwards — SPA exactly 68.
    [1978, 3, 6, 68],
    // The pension tool's default scenario (born Jun 1986).
    [1986, 5, 1, 68],
    [2000, 0, 1, 68],
  ])('born %i-%i-%i → NPA %i', (y, m, d, npa) => {
    expect(normalPensionAge(new Date(y, m, d))).toBe(npa);
  });

  it('fails loud on an invalid date', () => {
    expect(() => normalPensionAge(new Date('junk')))
      .toThrow(/invalid dateOfBirth/);
  });
});

describe('memberMinimumPensionAge', () => {
  it.each([
    ['2021-11-03', AFTER_RISE, 55],
    ['2021-11-04', BEFORE_RISE, 55],
    ['2021-11-04', AFTER_RISE, 57],
    ['2026-11-05', AFTER_RISE, 57],
  ])('at the boundary: joined %s, drawing on %s, %i', (joined, drawingOn, age) => {
    expect(memberMinimumPensionAge(joinedOn(joined), drawingOn)).toBe(age);
  });

  it.each([
    ['2001-04-01', BEFORE_RISE, 55],
    ['2001-04-01', AFTER_RISE, 55],
    ['2016-04-01', AFTER_RISE, 55],
  ])('earlier joiners keep 55: joined %s, drawing on %s', (joined, drawingOn, age) => {
    expect(memberMinimumPensionAge(joinedOn(joined), drawingOn)).toBe(age);
  });

  it('reads the first joining, not a later period', () => {
    const member = {
      service: [
        {
          section: SECTIONS.s2015,
          joined: isoDate('2022-04-01'),
          left: null,
        },
        {
          section: SECTIONS.s1995,
          joined: isoDate('2001-04-01'),
          left: isoDate('2022-03-31'),
        },
      ],
    };
    expect(memberMinimumPensionAge(member, AFTER_RISE)).toBe(55);
  });

  // The two are separate facts, the kept age DHSC's and the law's Parliament's,
  // and the report's "from 55 to 57" needs them to agree.
  it('keeps the age the law sets before the rise', () => {
    expect(minimumPensionAge(BEFORE_RISE)).toBe(MPA_KEPT_AGE);
  });

  it('never exceeds the law on the day', () => {
    expect(memberMinimumPensionAge(joinedOn('2001-04-01'), new Date(2009, 0, 1)))
      .toBe(50);
  });

  it('refuses a member with no service, and an invalid date', () => {
    expect(() => memberMinimumPensionAge({service: []}, AFTER_RISE))
      .toThrow(RangeError);
    expect(() => memberMinimumPensionAge(joinedOn('2001-04-01'), new Date('x')))
      .toThrow(RangeError);
  });
});
