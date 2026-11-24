/**
 * A salary sacrifice on the 2015 Section's ledger: the cash deducted
 * comes off each year's cash pay, and a part year takes the deductions
 * of the months served. Every expected figure is counted by hand from
 * the payslips the test declares, never read from the library, bar the
 * one test that holds the rows to the last digit.
 */
import {describe, expect, it} from 'vitest';
import {isoDate, isoMonth} from '../src/iso-date.js';
import {buildPayPath} from '../src/pay-path.js';
import {buildLedger} from '../src/pension/ledger.js';
import type {LedgerYear} from '../src/pension/ledger.js';
import {createPrices} from '../src/pension/prices.js';
import {schemeYearEnd, schemeYearEndDate} from '../src/pension/scheme-year.js';
import {seedFromStatement} from '../src/pension/seed.js';

const TODAY = new Date(2026, 7, 19);
const prices = createPrices(0.02, TODAY);
const SALARY = 54_000;

/** SALARY in the cash of a scheme year, as the ledger pays it. */
const payIn = (year: number) =>
  prices.payAt(SALARY, schemeYearEndDate(schemeYearEnd(year)));

const rowEnding = (rows: readonly LedgerYear[], year: number): LedgerYear => {
  const row = rows.find((r) => r.schemeYearEnd === year);
  if (row === undefined) throw new Error(`no row ending ${year}`);
  return row;
};

describe('a salary sacrifice on the ledger', () => {
  // Invented. Born in 1950, past the last row of GAD's curve, so pay
  // before the sacrifice is SALARY in every year. A lease of 510 a
  // month, first deducted in October 2024 and last in September 2027.
  const path = buildPayPath(isoDate('1950-01-01'), {
    declared: [],
    current: {todaysMoney: SALARY, asAt: isoDate('2026-08-19')},
    ladder: null,
    partTime: false,
    statedBeforeSacrifice: [],
    sacrifices: [{
      monthlyCash: 510, from: isoMonth('2024-10'), to: isoMonth('2027-09'),
    }],
  }, prices);
  const leaving = (exitDate: Date) => buildLedger({
    seed: seedFromStatement(1000, schemeYearEnd(2025)),
    payIn: (year, paid) => path.payForMonths(year, paid),
    exitDate,
    retirementDate: new Date(2045, 0, 1),
    prices,
    drawingFor: () => null,
    through: schemeYearEnd(2029),
  }).years;

  it('takes the cash deducted off a whole year\'s cash pay', () => {
    // 2026-27 has twelve payslips of 510: 6,120, in that year's cash
    // whatever the inflation assumption, because the lease fixed it.
    const row = rowEnding(leaving(new Date(2029, 2, 31)), 2027);
    expect(row.pensionableEarnings).toBeCloseTo(payIn(2027) - 6_120, 6);
    expect(row.earned).toBeCloseTo((payIn(2027) - 6_120) / 54, 6);
  });

  it('takes a leaver\'s deductions for the months served, not a share',
    () => {
      // Leaving 30 September 2027: six months' pay, and all six of that
      // year's deductions, April to September, 3,060. Scaling the year's
      // sacrifice with the pay would take 1,530.
      const row = rowEnding(leaving(new Date(2027, 8, 30)), 2028);
      expect(row.pensionableEarnings)
        .toBeCloseTo(payIn(2028) * 6 / 12 - 3_060, 6);
    });

  it('takes nothing once the lease has ended', () => {
    const row = rowEnding(leaving(new Date(2029, 2, 31)), 2029);
    expect(row.pensionableEarnings).toBeCloseTo(payIn(2029), 6);
  });

  // Recorded from the ledger, not counted by hand: a regression pin. Only
  // the cells the tests above count are verified; `closing` and the 2026
  // row are not. Any change to the ledger's arithmetic fails here, even
  // one a tolerance would pass, and is re-recorded deliberately.
  it('holds every row to the last digit, for a stayer and a leaver', () => {
    const figures = (rows: readonly LedgerYear[]) => rows.map((r) =>
      [r.schemeYearEnd, r.pensionableEarnings, r.earned, r.closing]);
    expect(figures(leaving(new Date(2029, 2, 31)))).toEqual([
      [2026, 46821.17647058823, 867.0588235294116, 1902.0588235294117],
      [2027, 47880, 886.6666666666666, 2855.2975490196077],
      [2028, 52020, 963.3333333333333, 3918.566296568627],
      [2029, 56181.6, 1040.3999999999999, 5274.480181041727],
    ]);
    expect(figures(leaving(new Date(2027, 8, 30)))).toEqual([
      [2026, 46821.17647058823, 867.0588235294116, 1902.0588235294117],
      [2027, 47880, 886.6666666666666, 2855.2975490196077],
      [2028, 24480, 453.3333333333333, 3468.2162067585787],
      [2029, null, 0, 3502.8983688261646],
    ]);
  });
});
