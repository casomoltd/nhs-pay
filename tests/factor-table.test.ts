/**
 * FactorTable VO + full-table transcription mirrors.
 *
 * The mirror CSVs (gad-erf1-2023-06-30.csv /
 * gad-lrf1-2023-06-30.csv) were transcribed from the published
 * PDF's text extraction in a separate pass from the TS issue
 * files, so agreement here checks the transcription, not our own
 * typos. Five spot cells pinning ~420 transcribed values is how
 * the previous (2019) staleness shipped — these suites assert
 * every printed cell.
 */

import {describe, expect, it} from 'vitest';
import {FactorTable} from '../src/gad/factor-table.js';
import type {
  FactorTableData,
} from '../src/gad/factor-table.js';
import {ERF_0_420} from '../src/gad/erf-2023-06-30.js';
import {LRF_0_421} from '../src/gad/lrf-2023-06-30.js';
import {parseCsv} from './helpers.js';

// One construction per table, shared by every suite — the
// invariants suite below builds its own corrupted instances.
const erf1 = new FactorTable(ERF_0_420);
const lrf1 = new FactorTable(LRF_0_421);

/** Parse a wide mirror CSV into ragged rows of factors. */
function mirrorRows(file: string): number[][] {
  return parseCsv(file).map((record) => {
    const cells: number[] = [];
    for (let m = 0; m < 12; m++) {
      const cell = record[`m${m}`];
      if (cell === '') break;
      cells.push(Number(cell));
    }
    return cells;
  });
}

// ── Full-table mirrors ──────────────────────────────

// cellCount is a THIRD independent pin, hand-counted from the
// printed PDF tables — it guards both the fixture and the issue
// file dropping the same row. Recount from the document on each
// issue swap; never copy a failing test's "received" value.
describe.each([
  {
    name: 'ERF1 (Table 0-420)',
    data: ERF_0_420,
    table: erf1,
    mirror: 'gad-erf1-2023-06-30.csv',
    cellCount: 157,
  },
  {
    name: 'LRF1 (Table 0-421)',
    data: LRF_0_421,
    table: lrf1,
    mirror: 'gad-lrf1-2023-06-30.csv',
    cellCount: 121,
  },
])('$name mirror', ({data, table, mirror, cellCount}) => {
  const rows = mirrorRows(mirror);

  it('matches the printed shape (ragged last row)', () => {
    expect(rows.length).toBe(data.rows.length);
    rows.forEach((row, y) => {
      expect(row.length).toBe(data.rows[y].length);
    });
    const total = rows.reduce((n, r) => n + r.length, 0);
    expect(total).toBe(cellCount);
  });

  it('every printed cell equals the table lookup', () => {
    rows.forEach((row, years) => {
      row.forEach((factor, months) => {
        expect(
          table.factorFor({years, months, days: 0}),
        ).toBe(factor);
      });
    });
  });
});

// ── The audit's defeater, pinned forever ────────────

describe('accuracy-audit defeater (15 Jul 2026)', () => {
  it('2015 scheme 5y0m early → 0.777, not 0.792', () => {
    expect(erf1.factorFor({years: 5, months: 0, days: 0}))
      .toBe(0.777);
  });
});

// ── Rounding policy lives on the table ──────────────

describe('FactorTable rounding', () => {
  it('erf: part-months round UP (§2.3)', () => {
    expect(erf1.factorFor({years: 4, months: 0, days: 1}))
      .toBe(erf1.factorFor({years: 4, months: 1, days: 0}));
  });

  it('erf: round-up carries across the year', () => {
    expect(erf1.factorFor({years: 3, months: 11, days: 15}))
      .toBe(erf1.factorFor({years: 4, months: 0, days: 0}));
  });

  it('lrf: part-months round DOWN (§3.4)', () => {
    expect(lrf1.factorFor({years: 5, months: 4, days: 15}))
      .toBe(lrf1.factorFor({years: 5, months: 4, days: 0}));
  });

  it('out-of-range names the table and its bounds', () => {
    expect(() => erf1.factorFor(
      {years: 13, months: 1, days: 0},
    )).toThrow('ERF1 out of range: 13yr 1mo (max 13yr 0mo)');
    expect(() => lrf1.factorFor(
      {years: 10, months: 1, days: 0},
    )).toThrow('LRF1 out of range: 10yr 1mo (max 10yr 0mo)');
  });

  it('malformed periods fail the precondition, never the'
    + ' out-of-range path', () => {
    expect(() => erf1.factorFor(
      {years: 5, months: 12, days: 0},
    )).toThrow(/malformed period/);
    expect(() => erf1.factorFor(
      {years: 0, months: -1, days: 0},
    )).toThrow(/malformed period/);
    expect(() => lrf1.factorFor(
      {years: 5, months: 4, days: -2},
    )).toThrow(/malformed period/);
  });
});

// ── Construction invariants ─────────────────────────

describe('FactorTable construction invariants', () => {
  const base = ERF_0_420;

  function withRows(
    rows: readonly (readonly number[])[],
  ): FactorTableData {
    return {...base, rows};
  }

  it('accepts both real 2023 tables', () => {
    expect(() => new FactorTable(ERF_0_420)).not.toThrow();
    expect(() => new FactorTable(LRF_0_421)).not.toThrow();
  });

  it('rejects a wrong-direction jump (the 2019 corruption'
    + ' signature)', () => {
    // A mis-pasted final row that jumps back up, as the
    // superseded 2019 transcription's 13yr row did.
    const rows = [...base.rows.slice(0, 13), [0.740]];
    expect(() => new FactorTable(withRows(rows)))
      .toThrow(/order violation/);
  });

  it('accepts equal adjacent cells — a 3dp plateau is a'
    + ' legitimate print, not a corruption', () => {
    const rows = [[0.900, 0.900, 0.899]];
    expect(() => new FactorTable(withRows(rows)))
      .not.toThrow();
  });

  it('rejects a final row longer than 12 cells', () => {
    const rows = [
      ...base.rows.slice(0, 13),
      [...base.rows[12].map((f) => f - 0.03), 0.520],
    ];
    expect(() => new FactorTable(withRows(rows)))
      .toThrow(/only the final row/);
  });

  it('rejects a short row before the final row', () => {
    const rows = base.rows.map((row, i) =>
      i === 3 ? row.slice(0, 6) : row);
    expect(() => new FactorTable(withRows(rows)))
      .toThrow(/only the final row/);
  });

  it('rejects factors outside the kind range', () => {
    const rows = [[1.100, 1.000, 0.900]];
    expect(() => new FactorTable(withRows(rows)))
      .toThrow(/outside the \(0, 1\] range/);
  });

  it('rejects an empty table', () => {
    expect(() => new FactorTable(withRows([])))
      .toThrow(/no rows/);
  });
});
