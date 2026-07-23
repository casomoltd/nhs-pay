/**
 * Nation-aware getAfcScales tests — Scotland tables,
 * Wales floor, and backward compatibility.
 */

import {describe, it, expect} from 'vitest';
import type {Nation, TaxYear} from '../src/index.js';
import {
  AFC_REGIONS,
  getAfcScales,
  grossSalary,
} from '../src/index.js';
import {parseCsv} from './helpers.js';

describe('getAfcScales nation param', () => {
  // Per-nation salary values are pinned to the cited
  // pay-scales.csv fixture below; these cases cover
  // structure and cross-nation relationships only.
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
    const eng = getAfcScales('2025-26', 'england');
    const scoB5 = sco.bands.find(
      (b) => b.band === '5',
    );
    const engB5 = eng.bands.find(
      (b) => b.band === '5',
    );
    expect(scoB5?.salary.min).not.toBe(
      engB5?.salary.min,
    );
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

// ── Pin every figure to its published source ────────
//
// The pay tables are transcribed from their published
// sources (England: NHS Employers; Scotland: the MSG
// consolidated table). This asserts getAfcScales matches
// that fixture row-for-row — code-vs-source, not
// code-vs-code — so a bad re-transcription (a whole table
// on a wrong uplift factor stays internally consistent and
// passes every code-vs-code check) fails HERE instead of
// shipping. The fixture cites each row's source.
const scaleRows = parseCsv('pay-scales.csv');

describe('code matches the cited pay-scales fixture', () => {
  it.each(scaleRows)(
    '$nation $taxYear band $band $point',
    (row) => {
      const {bands} = getAfcScales(
        row.taxYear as TaxYear, row.nation as Nation,
      );
      const band = bands.find((b) => b.band === row.band);
      const point = band?.points.find(
        (p) => p.label === row.point,
      );
      expect(point?.salary).toBe(Number(row.salary));
    },
  );
});

describe('derived nations', () => {
  it('Northern Ireland uses the England table', () => {
    for (const year of ['2025-26', '2026-27'] as const) {
      expect(
        getAfcScales(year, 'northern-ireland'),
      ).toEqual(getAfcScales(year, 'england'));
    }
  });
});
