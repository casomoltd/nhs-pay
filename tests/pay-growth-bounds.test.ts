/**
 * How far a pay path can move a 2015 Section pension from the flat-pay
 * one, bounded exactly rather than judged.
 *
 * `projectPension` holds pay flat in today's money; `memberBenefits`
 * reads a pay path. A career average pot is a sum of each year's pay
 * with positive weights — the year's accrual, carried by revaluation —
 * and the drawing's factor is the same on both. So the ratio of the two
 * pensions is a weighted mean of the two pays' ratio year by year, and
 * must lie between its smallest and largest over the years that
 * accrued. A figure outside that range is the model wrong, not the
 * assumption moving it.
 */
import {describe, expect, it} from 'vitest';
import {isoDate} from '../src/iso-date.js';
import {memberBenefits, SECTIONS} from '../src/member-benefits.js';
import {projectPension} from '../src/pension-projection.js';
import {normalPensionAge} from '../src/npa.js';
import {getAfcScales} from '../src/index.js';
import {schemeYearEndFor} from '../src/pension/seed.js';

const TODAY = new Date(2026, 8, 23);
const band6 = getAfcScales('2026-27', 'england').bands
  .find((b) => b.band === '6');

const iso = (d: Date) => isoDate(
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-`
  + String(d.getDate()).padStart(2, '0'),
);

describe('a pay path moves a pension only within its pay ratios', () => {
  if (band6 === undefined) throw new Error('Band 6 missing');
  const cases = [
    {born: '1966-02-01', joined: '2015-04-01', point: 2, leaveAt: 0},
    {born: '1979-01-01', joined: '2016-10-01', point: 0, leaveAt: 0},
    {born: '1986-06-01', joined: '2019-04-01', point: 1, leaveAt: -5},
    {born: '1998-11-01', joined: '2021-04-01', point: 0, leaveAt: -10},
  ];
  it.each(cases)('born $born, joined $joined', (c) => {
    const born = new Date(`${c.born}T00:00:00`);
    const npa = normalPensionAge(born);
    const drawing = new Date(
      born.getFullYear() + npa, born.getMonth(), born.getDate(),
    );
    // The last 31 March on or before the drawing, `leaveAt` years off.
    const leaving = new Date(
      drawing.getFullYear() + c.leaveAt
        - (drawing.getMonth() >= 3 ? 0 : 1),
      2, 31,
    );
    const point = band6.points[c.point];
    const pay = point.salary;
    const benefits = memberBenefits({
      dateOfBirth: iso(born),
      service: [{
        section: SECTIONS.s2015, joined: isoDate(c.joined), left: null,
      }],
      pay: {
        declared: [],
        current: {todaysMoney: pay, asAt: iso(TODAY)},
        ladder: {points: band6.points, current: point},
      },
      statement: null,
    }, {assumedCpi: 0.02}, TODAY);
    const position = benefits.at({
      leaving: iso(leaving), drawing: iso(drawing),
      remedy: {kind: 'none'}, cash: {kind: 'automatic-only'},
    });
    const flat = projectPension({
      kind: 'estimation', joinDate: new Date(`${c.joined}T00:00:00`),
      currentSalary: pay, dateOfBirth: born, exitDate: leaving,
      retirementDate: drawing, npa, assumedCpi: 0.02,
    }, TODAY);

    const ratios: number[] = [];
    const first = schemeYearEndFor(new Date(`${c.joined}T00:00:00`));
    for (let y = first; y <= schemeYearEndFor(leaving); y++) {
      ratios.push(benefits.payPath.payFor(y).pay / pay);
    }
    const ratio = position.crystallised.pension.real
      / flat.annualPension.real;
    expect(position.awards[0].factor.factor).toBe(flat.factor);
    expect(ratio).toBeGreaterThanOrEqual(Math.min(...ratios) - 1e-9);
    expect(ratio).toBeLessThanOrEqual(Math.max(...ratios) + 1e-9);
  });
});
