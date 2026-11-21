/**
 * Additional pension: the purchase tables transcribed cell for cell, and
 * the prices read from them.
 *
 * The mirrors in tests/fixtures/gad-ap-*.csv were read from the workbook's
 * sheet XML as plain text, a separate pass from the XML parser the issue
 * files were written from, so agreement here checks the transcription.
 * The tables, their mirrors and cell counts are listed in ap-mirrors.ts.
 *
 * The purchase figures under "additionalPensionToBuy" are regression
 * pins, not an oracle: each cited factor cell is independent, but
 * dividing by it after prices-only revaluation is the library's own
 * reading of Sch 9 paras 1 and 4, restated. What would settle it is a
 * worked example published by NHSBSA or GAD, or its calculator's
 * answer for the same member.
 */

import {describe, expect, it} from 'vitest';
import {
  ADDITIONAL_PENSION_LIMIT,
  ADDITIONAL_PENSION_PAYMENTS,
  additionalPensionCost,
  additionalPensionToBuy,
} from '../src/additional-pension.js';
import {ADDITIONAL_PENSION_REFUSALS} from '../src/errors.js';
import {ADDITIONAL_PENSION_COVERS} from '../src/gad/additional-pension-table.js';
import type {
  AdditionalPensionCover,
} from '../src/gad/additional-pension-table.js';
import {AP_INSTALMENT_MIRRORS, AP_LUMP_SUM_MIRROR} from './ap-mirrors.js';
import {parseCsv} from './helpers.js';

const PERSONAL = ADDITIONAL_PENSION_COVERS.personal;
const DEPENDANTS = ADDITIONAL_PENSION_COVERS.withDependants;

// ── Full-table mirrors ──────────────────────────────

describe('Table 0-703 (Table S) mirror', () => {
  const {data: table, mirror} = AP_LUMP_SUM_MIRROR;
  const records = parseCsv(mirror);

  it('prints 52 ages, two prices each', () => {
    expect(table.rows).toHaveLength(records.length);
    expect(table.rows.length * 2).toBe(104);
  });

  it('every printed cell equals the transcription', () => {
    records.forEach((record, i) => {
      expect(table.firstAge + i).toBe(Number(record.age));
      expect(table.rows[i]).toEqual({
        [PERSONAL]: Number(record.personal),
        [DEPENDANTS]: Number(record.personal_and_dependants),
      });
    });
  });
});

/** The longest payment period an instalment table prints, in years. */
const LONGEST_PERIOD = 20;

const INSTALMENT_TITLE = 'Table $data.provenance.tableRef mirror';

describe.each(AP_INSTALMENT_MIRRORS)(INSTALMENT_TITLE, ({data, mirror, cellCount}) => {
  const records = parseCsv(mirror);
  const printed = records.map((record) => {
    const cells: number[] = [];
    for (let y = 1; y <= LONGEST_PERIOD; y++) {
      const cell = record[`y${y}`];
      if (cell === '') break;
      cells.push(Number(cell));
    }
    return cells;
  });

  it('stops each row at the pension age', () => {
    data.rows.forEach((row, i) => {
      expect(row).toHaveLength(Math.min(LONGEST_PERIOD, data.npa - data.firstAge - i));
    });
    expect(data.rows.reduce((n, r) => n + r.length, 0)).toBe(cellCount);
  });

  it('every printed cell equals the transcription', () => {
    expect(data.rows.map((r) => [...r])).toEqual(printed);
    records.forEach((record, i) => {
      expect(data.firstAge + i).toBe(Number(record.age));
    });
  });
});

// ── Prices ──────────────────────────────────────────

/** A member aged 56 on the election date, Normal Pension Age 67 on 28
 *  April 2037. */
const BORN = new Date(1970, 3, 28);
const ELECTION = new Date(2026, 8, 24);

/** What a refused call was refused for. */
function refusal(call: () => unknown): string | undefined {
  try {
    call();
  } catch (error) {
    return (error as {code?: string}).code;
  }
  return undefined;
}

describe('additionalPensionCost', () => {
  const at = (
    annual: number, cover: AdditionalPensionCover = PERSONAL, years?: number,
    election = ELECTION,
  ) => additionalPensionCost({
    annual, dateOfBirth: BORN, election, cover,
    payment: years === undefined
      ? {kind: ADDITIONAL_PENSION_PAYMENTS.lumpSum}
      : {kind: ADDITIONAL_PENSION_PAYMENTS.instalments, years},
  });

  it('prices a lump sum from Table S at the age on the election date', () => {
    // 0-703, age 56: £3,600 personal, £3,860 with dependants, per £250.
    expect(at(3_000).cost).toBe(12 * 3_600);
    expect(at(3_000, DEPENDANTS).cost).toBe(12 * 3_860);
  });

  it('prices instalments from the pension age\'s own table', () => {
    // 0-714 (P67) and 0-718 (D67), age 56, 11 years: £34.60 and £37.00,
    // so 12 units cost £415.20 a month and 18 units £666.00.
    expect(at(3_000, PERSONAL, 11).cost).toBeCloseTo(415.2, 9);
    expect(at(3_000, PERSONAL, 11).table.tableRef).toBe('0-714');
    expect(at(4_500, DEPENDANTS, 11).cost).toBeCloseTo(666, 9);
    expect(at(4_500, DEPENDANTS, 11).table.tableRef).toBe('0-718');
  });

  it('refuses each purchase the tables or the rules do not allow', () => {
    const {offUnit, overLimit, outsideTable, outsideDates} =
      ADDITIONAL_PENSION_REFUSALS;
    // Instalments past the pension age: row 56 of P67 stops at 11 years.
    expect(refusal(() => at(3_000, PERSONAL, 12))).toBe(outsideTable);
    expect(refusal(() => at(3_100))).toBe(offUnit);
    expect(refusal(() => at(9_250))).toBe(overLimit);
    // Before the April 2026 limit, and from April 2027, when it is uprated.
    expect(refusal(() => at(3_000, PERSONAL, undefined,
      new Date(2026, 2, 31)))).toBe(outsideDates);
    expect(refusal(() => at(3_000, PERSONAL, undefined,
      new Date(2027, 3, 1)))).toBe(outsideDates);
  });

  it('prices an election inside the limit\'s dates on the current tables',
    () => {
      // The limit's first day, 1 April 2026, before the tables' in-use date
      // of 15 August 2026: age 55, so 0-703's £3,540 per £250, times 12.
      const first = at(3_000, PERSONAL, undefined, new Date(2026, 3, 1));
      expect(first.cost).toBe(12 * 3_540);
      expect(first.table.issued).toBe('2026-07-08');
    });

  it('holds the limit the factsheet states', () => {
    // NHSBSA, Additional pension factsheet V15, 1 April 2026: "up to a
    // maximum of £9,053 for members of the 2015 Scheme".
    expect(ADDITIONAL_PENSION_LIMIT.annual).toBe(9_053);
  });
});

describe('additionalPensionToBuy', () => {
  /** Drawn 31 March 2038, 11 months and 3 days after the pension age. */
  const LATE = new Date(2038, 2, 31);
  const buy = (wanted: number, drawing = LATE, leaving = drawing) =>
    additionalPensionToBuy({wanted, dateOfBirth: BORN,
      election: ELECTION, leaving, drawing});
  // Additional pension is revalued for prices alone (SI 2015/94 Sch 9
  // paras 1 and 4), so in today's money it does not grow between the
  // election and the drawing. 0-422 at 0 years 11 months is 1.052. So
  // each £1 bought now is £1.052 then.
  const late = 1.052;

  it('buys the smallest whole units that reach the pension wanted', () => {
    // £3,466 / 1.052 is £3,294.68, so fourteen units; £5,492 / 1.052 is
    // £5,220.53, so twenty-one.
    expect(buy(3_466)).toBe(3_500);
    expect(buy(5_492)).toBe(5_250);
  });

  it('stops at a unit exactly, and moves up for a penny more', () => {
    const twelveUnits = 3_000 * late;
    expect(buy(twelveUnits)).toBe(3_000);
    expect(buy(twelveUnits + 0.01)).toBe(3_250);
  });

  it('reads no factor at the pension age, and 0-420 before it', () => {
    // Drawn on the 67th birthday: no factor, and no growth either.
    const atNpa = new Date(2037, 3, 28);
    expect(buy(3_000, atNpa)).toBe(3_000);
    expect(buy(3_000.01, atNpa)).toBe(3_250);
    // Drawn a year early, 28 April 2036: 0-420 at 1 year 0 months is
    // 0.946. £3,000 / 0.946 is £3,171.25, so it takes thirteen units.
    const early = new Date(2036, 3, 28);
    expect(buy(3_000, early)).toBe(3_250);
  });

  it('refuses a member who leaves before drawing', () => {
    expect(refusal(() => buy(3_466, LATE, new Date(2036, 2, 31))))
      .toBe(ADDITIONAL_PENSION_REFUSALS.leftBeforeDrawing);
  });

  it('refuses a purchase over the limit', () => {
    expect(refusal(() => buy(20_000)))
      .toBe(ADDITIONAL_PENSION_REFUSALS.overLimit);
  });
});
