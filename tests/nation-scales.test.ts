/**
 * Per-nation AfC scale tables: that each nation resolves to its own
 * transcribed ladder, and that the four do not silently share one.
 */

import {describe, it, expect} from 'vitest';
import type {Nation, TaxYear} from '../src/index.js';
import {
  NLW_HOURLY,
  getAfcScales,
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
describe('Wales publishes its own ladder', () => {
  const YEAR = '2026-27';

  // Wales's ladder is its own, ~1.5% above England at every band
  // from 4 up. Exact figures, not a `>` comparison: the latter
  // passes for any Welsh number above England's, including one
  // that is wrong by thousands. Source: AfC(W) 02/2026 Annex 1.
  it.each([
    ['4', 31626, 31157],
    ['5', 39631, 39043],
    ['6', 48841, 48117],
    ['7', 57365, 56515],
    ['8a', 65723, 64750],
    ['9', 131732, 129783],
  ])('Band %s tops at Wales £%i vs England £%i',
    (id, wales, england) => {
      const top = (n: Nation) =>
        getAfcScales(YEAR, n).bands
          .find((b) => b.band === id)?.points.at(-1)?.salary;
      expect(top('wales')).toBe(wales);
      expect(top('england')).toBe(england);
    });

  // A floor lifts the bottom of a ladder and cannot raise its
  // top, so Band 9 is the clinching case: £131,732 against
  // England's £129,783, both years' figures read from each
  // nation's own circular.
  it('is higher at Band 9 top, which no floor could explain', () => {
    const top = (n: 'wales' | 'england') =>
      getAfcScales(YEAR, n).bands
        .find((b) => b.band === '9')?.points.at(-1)?.salary;
    expect(top('wales')).toBe(131732);
    expect(top('england')).toBe(129783);
  });

  // Structure differs too, not only values.
  it('carries two Band 2 points where England has one', () => {
    const pts = (n: 'wales' | 'england') =>
      getAfcScales(YEAR, n).bands
        .find((b) => b.band === '2')?.points.length;
    expect(pts('wales')).toBe(2);
    expect(pts('england')).toBe(1);
  });
});

// ── Pin every figure to its published source ────────
//
// The pay tables are transcribed from their published
// sources (England: NHS Employers; Scotland: circular
// PCS(AFC)2026/1). This asserts getAfcScales matches
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

// The statutory floor the AfC chart draws its reference line
// from. Re-typed from the publisher rather than read back from
// the constant, and pinned per year because the rate changes
// every April: an entry that silently keeps last April's figure
// is the failure this guards, and it renders as a wage line a
// reader compares their band against.
// Source: "GOV.UK — national minimum wage rates" (#sa-30).
describe('National Living Wage', () => {
  it.each([
    ['2025-26', 12.21],
    ['2026-27', 12.71],
  ] as const)('%s is £%s an hour', (year, hourly) => {
    expect(NLW_HOURLY[year]).toBe(hourly);
  });
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
