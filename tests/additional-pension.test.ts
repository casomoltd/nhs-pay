/**
 * Additional pension: the purchase tables transcribed cell for cell, and
 * the prices read from them.
 *
 * The mirrors in tests/fixtures/gad-ap-*.csv were read from the workbook's
 * own cells, a separate pass from the text export the issue files were
 * written from, so agreement here checks the transcription. The cell
 * counts are a third pin, from the tables' shape: a row stops where age
 * plus the payment period would pass the pension age.
 *
 * The purchase figures under "additionalPensionToBuy" are regression
 * pins, not an oracle: each cited cell and Order count is independent,
 * but compounding by Orders and then applying the factor is the
 * library's own model, restated. What would settle the model is a
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
import {AP_0_703} from '../src/gad/additional-pension-0-703-2023-10-03.js';
import {AP_0_712} from '../src/gad/additional-pension-0-712-2023-10-03.js';
import {AP_0_713} from '../src/gad/additional-pension-0-713-2023-10-03.js';
import {AP_0_714} from '../src/gad/additional-pension-0-714-2023-10-03.js';
import {AP_0_715} from '../src/gad/additional-pension-0-715-2023-10-03.js';
import {AP_0_716} from '../src/gad/additional-pension-0-716-2023-10-03.js';
import {AP_0_717} from '../src/gad/additional-pension-0-717-2023-10-03.js';
import {AP_0_718} from '../src/gad/additional-pension-0-718-2023-10-03.js';
import {AP_0_719} from '../src/gad/additional-pension-0-719-2023-10-03.js';
import {ADDITIONAL_PENSION_COVERS} from '../src/gad/additional-pension-table.js';
import type {
  AdditionalPensionCover,
} from '../src/gad/additional-pension-table.js';
import {parseCsv} from './helpers.js';

const PERSONAL = ADDITIONAL_PENSION_COVERS.personal;
const DEPENDANTS = ADDITIONAL_PENSION_COVERS.withDependants;

// ── Full-table mirrors ──────────────────────────────

describe('Table 0-703 (Table S) mirror', () => {
  const records = parseCsv('gad-ap-0-703-2023-10-03.csv');

  it('prints 50 ages, two prices each', () => {
    expect(AP_0_703.rows).toHaveLength(records.length);
    expect(AP_0_703.rows.length * 2).toBe(100);
  });

  it('every printed cell equals the transcription', () => {
    records.forEach((record, i) => {
      expect(AP_0_703.firstAge + i).toBe(Number(record.age));
      expect(AP_0_703.rows[i]).toEqual({
        [PERSONAL]: Number(record.personal),
        [DEPENDANTS]: Number(record.personal_and_dependants),
      });
    });
  });
});

/** The longest payment period an instalment table prints, in years. */
const LONGEST_PERIOD = 20;

describe.each([
  {data: AP_0_712, cellCount: 790},
  {data: AP_0_713, cellCount: 810},
  {data: AP_0_714, cellCount: 830},
  {data: AP_0_715, cellCount: 850},
  {data: AP_0_716, cellCount: 790},
  {data: AP_0_717, cellCount: 810},
  {data: AP_0_718, cellCount: 830},
  {data: AP_0_719, cellCount: 850},
])('Table $data.provenance.tableRef mirror', ({data, cellCount}) => {
  const records = parseCsv(
    `gad-ap-${data.provenance.tableRef}-2023-10-03.csv`);
  const mirror = records.map((record) => {
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
    expect(data.rows.map((r) => [...r])).toEqual(mirror);
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
    // 0-703, age 56: £3,820 personal, £4,090 with dependants, per £250.
    expect(at(3_000).cost).toBe(12 * 3_820);
    expect(at(3_000, DEPENDANTS).cost).toBe(12 * 4_090);
  });

  it('prices instalments from the pension age\'s own table', () => {
    // 0-714 (P67) and 0-718 (D67), age 56, 11 years: £36.20 and £38.70.
    expect(at(3_000, PERSONAL, 11).cost).toBe(434.4);
    expect(at(3_000, PERSONAL, 11).table.tableRef).toBe('0-714');
    expect(at(4_500, DEPENDANTS, 11).cost).toBe(696.6);
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
  // Eleven Orders land between the election and that drawing (6 April
  // 2027 to 6 April 2037), each 1.5% in today's money; 0-422 at 0 years
  // 11 months is 1.051. So each £1 bought now is £1.015^11 × 1.051 then.
  const lateGrowth = 1.015 ** 11 * 1.051;

  it('buys the smallest whole units that reach the pension wanted', () => {
    expect(buy(3_466)).toBe(3_000);
    expect(buy(5_492)).toBe(4_500);
  });

  it('stops at a unit exactly, and moves up for a penny more', () => {
    const twelveUnits = 3_000 * lateGrowth;
    expect(buy(twelveUnits)).toBe(3_000);
    expect(buy(twelveUnits + 0.01)).toBe(3_250);
  });

  it('reads no factor at the pension age, and 0-420 before it', () => {
    // Drawn on the 67th birthday: no factor; ten Orders, 2027 to 2036.
    const atNpa = new Date(2037, 3, 28);
    expect(buy(3_000 * 1.015 ** 10, atNpa)).toBe(3_000);
    // Drawn a year early, 28 April 2036: nine Orders, and 0-420 at 1
    // year 0 months is 0.948. £3,000 × 1.015 / 0.948 is £3,212, so it
    // takes thirteen units, not twelve.
    const early = new Date(2036, 3, 28);
    expect(buy(3_000 * 1.015 ** 10, early)).toBe(3_250);
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
