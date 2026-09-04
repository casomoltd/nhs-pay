/**
 * The two date precisions, proved at both levels.
 *
 * The type assertions are checked by `npm run typecheck` (tsconfig
 * includes `tests`), because the failure they prevent is invisible at
 * runtime: a month and a date are both just strings.
 */

import {describe, expect, it} from 'vitest';
import {
  firstOfMonth,
  isoDate,
  isoMonth,
  isoToDate,
  monthOf,
  monthToDate,
  awardsFor,
  AFC_BAND_IDS,
  NATION_KEYS,
} from '../src/index.js';
import type {IsoDate, IsoMonth} from '../src/index.js';

declare const someMonth: IsoMonth;
declare const someDate: IsoDate;

declare function needsADate(d: IsoDate): Date;
declare function needsAMonth(m: IsoMonth): Date;

/** Never called — its body is the assertion. */
function typeAssertions(): void {
  // @ts-expect-error a month is not a date: it has no day
  void needsADate(someMonth);

  // @ts-expect-error a date is not a month: it carries a day it should not
  void needsAMonth(someDate);

  // Neither precision may be minted from bare text without the
  // constructor, which is what makes the shape check unskippable.
  // @ts-expect-error a plain string is not an IsoDate
  void needsADate('2026-04-01');
}

describe('the constructors are the only way in', () => {
  it('accepts a well-shaped month and date', () => {
    expect(isoMonth('2026-09')).toBe('2026-09');
    expect(isoDate('2026-09-04')).toBe('2026-09-04');
    expect(typeof typeAssertions).toBe('function');
  });

  it('refuses the other precision', () => {
    expect(() => isoMonth('2026-09-04')).toThrow(/not a 'YYYY-MM' month/);
    expect(() => isoDate('2026-09')).toThrow(/not a 'YYYY-MM-DD' date/);
  });

  it('refuses text that is not a date at all', () => {
    expect(() => isoDate('4 September 2026')).toThrow();
    expect(() => isoMonth('')).toThrow();
  });
});

describe('conversions', () => {
  it('drops the day only where it is named', () => {
    expect(monthOf(isoDate('2026-09-04'))).toBe('2026-09');
  });

  it('widens a month to its first day', () => {
    expect(firstOfMonth(isoMonth('2026-09'))).toBe('2026-09-01');
  });

  it('parses by parts, so the calendar day survives the timezone', () => {
    // `new Date('2026-04-01')` is UTC midnight, which formats as
    // 31 March anywhere west of Greenwich. A stored date names a
    // calendar day, so the day parsed must be the day stored.
    const d = isoToDate(isoDate('2026-04-01'));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(1);
    expect(monthToDate(isoMonth('2026-04')).getDate()).toBe(1);
  });
});

/** Every AfC award a page can reach, across all four nations. */
const AWARDS = Object.values(NATION_KEYS).flatMap(
  (nation) => awardsFor(nation, AFC_BAND_IDS[4]),
);

describe('the library data carries the right precision', () => {
  it('has awards to sweep', () => {
    expect(AWARDS.length).toBeGreaterThan(0);
  });

  it('every award effective date is a full date', () => {
    for (const award of AWARDS) {
      expect(award.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('every expectedInPay is a MONTH, never a date', () => {
    // The field an earlier consumer bridged by writing
    // `${award.expectedInPay}-01` by hand. Month precision is the
    // published claim — an announcement says which month, not which
    // payroll day — so the type has to say so too.
    for (const award of AWARDS) {
      if (award.expectedInPay === undefined) {
        continue;
      }
      expect(award.expectedInPay).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it('every cited document is dated', () => {
    for (const award of AWARDS) {
      expect(award.source.issued).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (award.source.nextExpected !== undefined) {
        expect(award.source.nextExpected)
          .toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
