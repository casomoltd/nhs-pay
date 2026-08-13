/**
 * DOB-band oracle for normalPensionAge. Boundaries are dates of
 * birth from gov.uk's "State Pension age timetable" (legislated
 * by the Pensions Acts 1995/2007/2011/2014; page last updated
 * 15 May 2014 and the dates unchanged since). Transitional
 * cohorts (SPA = whole years + months) round UP to the next
 * whole year — see src/npa.ts for the convention.
 */

import {describe, expect, it} from 'vitest';
import {normalPensionAge} from '../src/npa.js';

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
