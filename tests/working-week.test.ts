// The AfC full-time week and the hourly rate it gives, pinned against
// rates the circulars print beside the salaries they come from.
//
// Both columns come from the publisher, which is what makes this an
// oracle rather than a restatement: `salary / hoursPerYear(week)` is
// checked against a number nobody here computed. Three weeks across two
// publishers, so a divisor that happened to fit one would fail the
// others.

import {describe, it, expect} from 'vitest';
import {NATION_KEYS, payYear} from '@casomoltd/paye-calc';
import {SCOTLAND_PCS_AFC_2026_01} from '../src/circulars/scotland-pcs-afc-2026-01';
import {WALES_LIVING_WAGE} from '../src/published/wales-living-wage';
import {AFC_W_01_2026} from '../src/sources';
import {DENTAL_GRADES} from '../src/dental-grades';
import {MEDICAL_GRADES} from '../src/medical-grades';
import {
  afcWeekInForce, afcWeeklyHours, annualiseHourly, contractWeekInForce,
  hoursPerYear,
} from '../src/working-week';

const HALF_PENNY = 0.005;
const {annexB2025, annexB2026} = SCOTLAND_PCS_AFC_2026_01;
const SCOTLAND = [
  ...annexB2025.map((row) => ({...row, year: payYear('2025-26')})),
  ...annexB2026.map((row) => ({...row, year: payYear('2026-27')})),
].map((row) => ({
  ...row,
  case: `Scotland, ${row.band} point ${row.point}, ${row.year}: `
    + `£${row.salary} a year is £${row.hourly.toFixed(2)} an hour`,
}));

describe('AfC working week', () => {
  it.each(SCOTLAND)('$case', ({year, salary, hourly}) => {
    const week = afcWeeklyHours(year, NATION_KEYS.scotland);
    expect(salary / hoursPerYear(week)).toBeCloseTo(hourly, 2);
  });

  it(`Wales, 2026-27: the living-wage pair in ${AFC_W_01_2026.reference}`, () => {
    const pair = WALES_LIVING_WAGE['2026-27'];
    if (!pair) throw new Error('no Welsh living-wage pair for 2026-27');
    const week = afcWeeklyHours(payYear('2026-27'), NATION_KEYS.wales);
    expect(pair.annual / hoursPerYear(week)).toBeCloseTo(pair.hourly, 2);
  });

  it('is 37.5 hours outside Scotland in every year it holds', () => {
    const {england, wales, northernIreland} = NATION_KEYS;
    for (const label of ['2025-26', '2026-27'] as const) {
      for (const nation of [england, wales, northernIreland]) {
        expect(afcWeeklyHours(payYear(label), nation)).toBe(37.5);
      }
    }
  });

  it('refuses a year with no sourced week, in every nation', () => {
    expect(() => afcWeeklyHours(payYear('2024-25'), NATION_KEYS.england))
      .toThrow(RangeError);
  });

  it('reads the week in force by date, turning on 1 April', () => {
    const {scotland} = NATION_KEYS;
    expect(afcWeekInForce(new Date(2026, 3, 1), scotland)).toBe(36);
    expect(afcWeekInForce(new Date(2026, 2, 31), scotland)).toBe(37);
    // 1 to 5 April is the old tax year but the new week.
    expect(afcWeekInForce(new Date(2026, 3, 5), scotland)).toBe(36);
    expect(afcWeekInForce(new Date(2025, 3, 1), scotland)).toBe(37);
  });

  it('refuses a date with no sourced Scottish week', () => {
    expect(() => afcWeekInForce(new Date(2025, 2, 31), NATION_KEYS.scotland))
      .toThrow(RangeError);
  });

  it('refuses Scotland before 2025-26, which has no sourced week', () => {
    expect(() => afcWeeklyHours(payYear('2024-25'), NATION_KEYS.scotland))
      .toThrow(RangeError);
  });

  // A printed rate is rounded to the penny, so multiplying it back can
  // miss the salary by up to half a penny an hour, plus a pound for the
  // whole-pound rounding of the result.
  it.each([
    ['2025-26', annexB2025],
    ['2026-27', annexB2026],
  ] as const)('annualises %s printed hourly rates back to their salaries',
    (label, rows) => {
      const week = afcWeeklyHours(payYear(label), NATION_KEYS.scotland);
      const bound = HALF_PENNY * hoursPerYear(week) + 1;
      for (const {salary, hourly} of rows) {
        expect(Math.abs(annualiseHourly(hourly, week) - salary))
          .toBeLessThanOrEqual(bound);
      }
    });
});

// Each contract's week, re-typed from its terms (the `#sa-NN` row in
// docs/source-archive.md) rather than read off the transcription, so a cell
// changed in `src/published/contract-weeks.ts` fails here. Each case reaches
// its contract through a grade, which pins the grade's contract too.
describe('a doctor\'s or salaried dentist\'s contract week', () => {
  const {england, wales, scotland, northernIreland} = NATION_KEYS;
  const IN_2026_27 = new Date(2026, 8, 23);
  const {consultant, str, specialtyDoctor, salariedGp} = MEDICAL_GRADES;
  const {salariedDental, communityDentalOfficer} = DENTAL_GRADES;

  it.each([
    {grade: consultant, nation: england, hours: 40, source: 'sa-93'},
    {grade: consultant, nation: wales, hours: 37.5, source: 'sa-99'},
    {grade: consultant, nation: scotland, hours: 40, source: 'sa-107'},
    {grade: consultant, nation: northernIreland, hours: 40, source: 'sa-113'},
    {grade: str, nation: england, hours: 40, source: 'sa-94'},
    {grade: str, nation: wales, hours: 40, source: 'sa-100, sa-102'},
    {grade: str, nation: scotland, hours: 40, source: 'sa-108'},
    {grade: str, nation: northernIreland, hours: 40, source: 'sa-114'},
    {grade: specialtyDoctor, nation: england, hours: 40, source: 'sa-95'},
    {grade: specialtyDoctor, nation: wales, hours: 40, source: 'sa-103'},
    {grade: specialtyDoctor, nation: scotland, hours: 40, source: 'sa-109'},
    {grade: specialtyDoctor, nation: northernIreland, hours: 40, source: 'sa-115'},
    {grade: salariedGp, nation: england, hours: 37.5, source: 'sa-97'},
    {grade: salariedGp, nation: wales, hours: 37.5, source: 'sa-97, sa-106'},
    {grade: salariedGp, nation: scotland, hours: 37.5, source: 'sa-97, sa-112'},
    {grade: salariedGp, nation: northernIreland, hours: 37.5, source: 'sa-118'},
    {grade: salariedDental, nation: england, hours: 37.5, source: 'sa-98'},
    {grade: salariedDental, nation: wales, hours: 37.5, source: 'sa-105'},
    // Not the 36 hours Scotland's Agenda for Change staff work.
    {grade: salariedDental, nation: scotland, hours: 37.5, source: 'sa-111'},
    {grade: communityDentalOfficer, nation: northernIreland, hours: 37.5,
      source: 'sa-117'},
  ] as const)('$grade in $nation works $hours hours ($source)',
    ({grade, nation, hours}) => {
      expect(contractWeekInForce(IN_2026_27, nation, grade)).toBe(hours);
    });

  it('reads a dentist in training on the training contract', () => {
    expect(contractWeekInForce(IN_2026_27, england,
      DENTAL_GRADES.dentalCoreTraining)).toBe(40);
  });

  it.each([
    [MEDICAL_GRADES.staffGrade, /closed grade/],
    [MEDICAL_GRADES.specialtyDoctor2008, /closed grade/],
    [MEDICAL_GRADES.locallyEmployedDoctor, /local terms/],
    [MEDICAL_GRADES.gpEducator, /educator post/],
    [DENTAL_GRADES.salariedDentist, /salaried-dentist band/],
  ])('refuses %s, saying why', (grade, why) => {
    expect(() => contractWeekInForce(IN_2026_27, england, grade))
      .toThrow(why);
  });

  it('refuses a date outside 2026-27, turning on 1 April', () => {
    expect(contractWeekInForce(new Date(2026, 3, 1), england, consultant))
      .toBe(40);
    expect(() => contractWeekInForce(new Date(2026, 2, 31), england, consultant))
      .toThrow(RangeError);
    expect(() => contractWeekInForce(new Date(2027, 3, 1), england, consultant))
      .toThrow(RangeError);
  });
});
