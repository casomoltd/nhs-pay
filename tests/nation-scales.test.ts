/**
 * Nation-aware getAfcScales tests — Scotland tables,
 * Wales floor, and backward compatibility.
 */

import {describe, it, expect} from 'vitest';
import {
  AFC_REGIONS,
  getAfcScales,
  grossSalary,
} from '../src/index.js';

describe('getAfcScales nation param', () => {
  it('Scotland B5(1) = 33295 for 2025-26', () => {
    const {bands} =
      getAfcScales('2025-26', 'scotland');
    const b5 = bands.find((b) => b.band === '5');
    expect(b5?.points[0].salary).toBe(33295);
  });

  it('Scotland B5(1) = 34544 for 2026-27', () => {
    const {bands} =
      getAfcScales('2026-27', 'scotland');
    const b5 = bands.find((b) => b.band === '5');
    expect(b5?.points[0].salary).toBe(34544);
  });

  it('Scotland B8a has 2 points', () => {
    const {bands} =
      getAfcScales('2026-27', 'scotland');
    const b8a = bands.find(
      (b) => b.band === '8a',
    );
    expect(b8a?.points).toHaveLength(2);
  });

  it('Scotland differs from England', () => {
    const sco =
      getAfcScales('2025-26', 'scotland');
    const eng = getAfcScales('2025-26');
    const scoB5 = sco.bands.find(
      (b) => b.band === '5',
    );
    const engB5 = eng.bands.find(
      (b) => b.band === '5',
    );
    expect(scoB5?.salaryMin).not.toBe(
      engB5?.salaryMin,
    );
  });

  it('england explicit === no nation', () => {
    const eng =
      getAfcScales('2026-27', 'england');
    const def = getAfcScales('2026-27');
    expect(eng).toEqual(def);
  });

  it('Wales B2 >= 26300 for 2026-27', () => {
    const {bands} =
      getAfcScales('2026-27', 'wales');
    const b2 = bands.find((b) => b.band === '2');
    expect(
      b2?.points[0].salary,
    ).toBeGreaterThanOrEqual(26300);
  });
});

// Regression guard for a leak the domain remodel introduced:
// the Wales living-wage floor moved into the nation scale table
// (getScalesForYear) but was dropped from grossSalary, so
// callers that regionalise an England base for Wales (the
// hub-site band pages) silently stopped flooring low bands.
// Assert the table path and the grossSalary path agree, so the
// floor cannot leak out of one of them again.
describe('Wales floor via grossSalary', () => {
  const YEAR = '2026-27';

  function bandOf(nation: 'england' | 'wales', id: string) {
    const {bands} = getAfcScales(YEAR, nation);
    const band = bands.find((b) => b.band === id);
    if (!band) {
      throw new Error(`band ${id} missing`);
    }
    return band;
  }

  it('regionalising an England base for Wales floors low bands', () => {
    const {hcas} = getAfcScales(YEAR, 'england');
    for (const id of ['2', '3']) {
      const eng = bandOf('england', id);
      const wal = bandOf('wales', id);
      eng.points.forEach((pt, i) => {
        expect(
          grossSalary(pt.salary, AFC_REGIONS.WAL, hcas, YEAR),
        ).toBe(wal.points[i].salary);
      });
    }
  });

  // £26,300 is the 2026-27 Welsh AfC pay floor, set by the NHS
  // Wales living-wage pay circular AfC(W) 01/2026 (Welsh
  // Government, 6 Jan 2026):
  // https://www.nhs.wales/files/pc-resources/2026-afc-1-2026-living-wage-pdf-pdf/
  // A Band 2 entry (England £25,272) sits below it, so a Welsh
  // post is lifted to the floor. This is an external-reference
  // assertion, not a check of the library against itself.
  it('lifts a below-floor Band 2 entry to the £26,300 Welsh floor', () => {
    const {hcas} = getAfcScales(YEAR, 'england');
    const entry = bandOf('england', '2').points[0].salary;
    expect(entry).toBeLessThan(26300);
    expect(
      grossSalary(entry, AFC_REGIONS.WAL, hcas, YEAR),
    ).toBe(26300);
  });
});
