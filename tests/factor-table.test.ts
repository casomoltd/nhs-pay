/**
 * FactorTable VO + full-table transcription mirrors.
 *
 * Every table has a mirror CSV in tests/fixtures/gad-*.csv, taken
 * from the published PDF's text in a separate pass from the TS issue
 * files, so agreement here checks the transcription, not our own
 * typos. The suites assert every printed cell: a handful of spot
 * cells would let a whole mis-pasted row through.
 */

import {describe, expect, it} from 'vitest';
import {FactorTable} from '../src/gad/factor-table.js';
import type {AgeIndex} from '../src/gad/factor-table.js';
import type {
  FactorTableData,
} from '../src/gad/factor-table.js';
import {ERF_0_420} from '../src/gad/erf-2023-06-30.js';
import {LRF_0_421} from '../src/gad/lrf-2023-06-30.js';
import {ERF_1_401} from '../src/gad/erf-1-401-2023-06-30.js';
import {ERF_1_402} from '../src/gad/erf-1-402-2023-06-30.js';
import {ERF_1_407} from '../src/gad/erf-1-407-2023-06-30.js';
import {LRF_2_416} from '../src/gad/lrf-2-416-2023-06-30.js';
import {RetirementFactorOutOfRange} from '../src/errors.js';
import {parseCsv} from './helpers.js';

// One construction per table, shared by every suite — the
// invariants suite below builds its own corrupted instances.
const erf0420 = new FactorTable(ERF_0_420);
const lrf0421 = new FactorTable(LRF_0_421);

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
    table: erf0420,
    mirror: 'gad-erf1-2023-06-30.csv',
    cellCount: 157,
  },
  {
    name: 'LRF1 (Table 0-421)',
    data: LRF_0_421,
    table: lrf0421,
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

// The legacy tables are keyed by AGE, so a row is looked up by the age
// printed at its head. Same third pin as above: cellCount is counted
// from the printed tables, not from either transcription.
describe.each([
  {name: '1-401', data: ERF_1_401,
    mirror: 'gad-erf-1-401-2023-06-30.csv', cellCount: 121},
  {name: '1-407', data: ERF_1_407,
    mirror: 'gad-erf-1-407-2023-06-30.csv', cellCount: 121},
  {name: '1-402', data: ERF_1_402,
    mirror: 'gad-erf-1-402-2023-06-30.csv', cellCount: 181},
  {name: '2-416', data: LRF_2_416,
    mirror: 'gad-lrf-2-416-2023-06-30.csv', cellCount: 121},
])('Table $name mirror', ({data, mirror, cellCount}) => {
  const table = new FactorTable<AgeIndex>(data);
  const records = parseCsv(mirror);
  const rows = mirrorRows(mirror);

  it('matches the printed shape (ragged last row)', () => {
    expect(rows.length).toBe(data.rows.length);
    const total = rows.reduce((n, r) => n + r.length, 0);
    expect(total).toBe(cellCount);
  });

  it('every printed cell equals the lookup at its printed age', () => {
    rows.forEach((row, y) => {
      const years = Number(records[y].age);
      row.forEach((factor, months) => {
        expect(table.factorAtAge({years, months, days: 0}))
          .toBe(factor);
      });
    });
  });
});

describe('FactorTable keyed by age', () => {
  const erf = new FactorTable(ERF_1_401);

  it('drops the days beyond a complete month', () => {
    // 57y 10m 19d reads the 57y 10m cell: the age in complete years
    // and months, as the table's own header defines it.
    expect(erf.factorAtAge({years: 57, months: 10, days: 19}))
      .toBe(erf.factorAtAge({years: 57, months: 10, days: 0}));
  });

  it('names the printed age when it runs off the table', () => {
    expect(() => erf.factorAtAge({years: 49, months: 11, days: 0}))
      .toThrow(RetirementFactorOutOfRange);
    expect(() => erf.factorAtAge({years: 49, months: 11, days: 0}))
      .toThrow('1-401 (ERF1): age 49yr 11mo is outside 50yr 0mo to 60yr 0mo');
  });

  it('does not compile a key of the other kind', () => {
    // The table's type carries how it is keyed, so the wrong lookup is
    // refused by the compiler; these lines fail the typecheck if it
    // ever accepts them.
    const neverRun = () => {
      // @ts-expect-error an age table has no period lookup
      erf.factorFor({years: 5, months: 0, days: 0});
      // @ts-expect-error a period table has no age lookup
      erf0420.factorAtAge({years: 60, months: 0, days: 0});
    };
    expect(neverRun).toBeTypeOf('function');
  });

  it('checks an age-keyed ERF runs upwards', () => {
    const reversed: FactorTableData = {
      ...ERF_1_401,
      // Two ages pasted in the wrong order: the defect the direction
      // check exists for.
      rows: [ERF_1_401.rows[1], ERF_1_401.rows[0],
        ...ERF_1_401.rows.slice(2)],
    };
    expect(() => new FactorTable(reversed)).toThrow(/non-decreasing/);
  });
});

// ── The audit's defeater, pinned forever ────────────

describe('2015 5y0m early reads 0.777, the current 0-420 cell', () => {
  it('2015 scheme 5y0m early → 0.777, not 0.792', () => {
    expect(erf0420.factorFor({years: 5, months: 0, days: 0}))
      .toBe(0.777);
  });
});

// ── Rounding policy lives on the table ──────────────

describe('FactorTable rounding', () => {
  it('erf: part-months round UP (§2.3)', () => {
    expect(erf0420.factorFor({years: 4, months: 0, days: 1}))
      .toBe(erf0420.factorFor({years: 4, months: 1, days: 0}));
  });

  it('erf: round-up carries across the year', () => {
    expect(erf0420.factorFor({years: 3, months: 11, days: 15}))
      .toBe(erf0420.factorFor({years: 4, months: 0, days: 0}));
  });

  it('lrf: part-months round DOWN (§3.4)', () => {
    expect(lrf0421.factorFor({years: 5, months: 4, days: 15}))
      .toBe(lrf0421.factorFor({years: 5, months: 4, days: 0}));
  });

  it('out-of-range names the table and its bounds', () => {
    expect(() => erf0420.factorFor(
      {years: 13, months: 1, days: 0},
    )).toThrow('0-420 (ERF1) out of range: 13yr 1mo (max 13yr 0mo)');
    expect(() => lrf0421.factorFor(
      {years: 10, months: 1, days: 0},
    )).toThrow('0-421 (LRF1) out of range: 10yr 1mo (max 10yr 0mo)');
  });

  it('malformed periods fail the precondition, never the'
    + ' out-of-range path', () => {
    expect(() => erf0420.factorFor(
      {years: 5, months: 12, days: 0},
    )).toThrow(/malformed period/);
    expect(() => erf0420.factorFor(
      {years: 0, months: -1, days: 0},
    )).toThrow(/malformed period/);
    expect(() => lrf0421.factorFor(
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
