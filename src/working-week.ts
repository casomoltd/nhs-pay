/**
 * The full-time week, and the hours in a year it gives: the Agenda for
 * Change week by nation and pay year, and a doctor's or salaried dentist's
 * by the national contract their grade is employed on
 * (`published/contract-weeks.ts` transcribes those, with their sources).
 * An hourly rate is an annual salary over these hours, so a Scottish rate
 * read at the rest of the UK's week comes out low by the difference.
 *
 * The AfC week's sources, by figure:
 * - 37.5 hours, England, Wales and Northern Ireland: "NHS Terms and
 *   Conditions of Service Handbook, amendment 62" (#sa-41). The section
 *   setting the week has not been re-read for this module.
 * - Scotland, 37 hours in 2025-26: "Scotland, PCS(AFC)2026/1" (#sa-13),
 *   Annex B p8, whose hourly rates are printed "Based on a 37 Hour Week".
 * - Scotland, 36 hours from 1 April 2026: the same circular's 2026-27
 *   Annex B prints its rates on a 36-hour week, the week
 *   `AFC_SCOTLAND_36_HOUR_WEEK` (PCS(AFC)2026/2, in `sources.ts`) sets.
 * Every nation's AfC week is held for 2025-26 and 2026-27 only, the years
 * these sources are read for; any other year throws rather than serve a
 * figure nobody has checked.
 * See docs/source-archive.md.
 */

import {NATION_KEYS} from '@casomoltd/paye-calc';
import type {Nation, PayYear} from '@casomoltd/paye-calc';
import {schemeYearOfPayYear} from './pay-year.js';
import {contractOfGrade} from './medical-dental-contracts.js';
import type {MedicalDentalGradeId} from './medical-dental-contracts.js';
import {CONTRACT_WEEKS} from './published/contract-weeks.js';
import type {ContractWeeks} from './published/contract-weeks.js';
import {schemeYearEndFor} from './pension/scheme-year.js';
import type {SchemeYearEnd} from './pension/scheme-year.js';

/** The handbook's week, everywhere but Scotland (#sa-41). */
const HANDBOOK_WEEK = 37.5;

/** Each nation's week, for the years a source sets it, keyed by the
 *  scheme year (1 April to 31 March) it holds over. A year outside it
 *  throws rather than assume the week held still. */
const AFC_WEEK: Readonly<Partial<Record<number, Readonly<Record<Nation, number>>>>> = {
  2026: withHandbookWeek({scotland: 37}), // 2025-26
  2027: withHandbookWeek({scotland: 36}), // 2026-27
};

/** A scheme year and the contract weeks held for it, if any. */
interface ContractYear {
  readonly end: SchemeYearEnd;
  readonly weeks: ContractWeeks | undefined;
}

// A year of weeks as payroll counts it: 365 days over 7.
const DAYS_PER_YEAR = 365;
const DAYS_PER_WEEK = 7;

/**
 * The full-time AfC week a pay round's scale is built on: the week its
 * circular divides by. A member paid on last year's round is on last
 * year's week.
 */
export function afcWeeklyHours(year: PayYear, nation: Nation): number {
  return weekFor(schemeYearOfPayYear(year), nation);
}

/**
 * The full-time AfC week in force on a date, whatever round a nation is
 * paying on. Keyed by date because a week changes on 1 April, by the
 * calendar, as Scotland's 36 hours did in 2026: that is neither a tax
 * year's boundary (6 April) nor a pay round's, which can run late. It
 * differs from `afcWeeklyHours` only for a nation still paying an earlier
 * round.
 */
export function afcWeekInForce(on: Date, nation: Nation): number {
  return weekFor(schemeYearEndFor(on), nation);
}

/**
 * The full-time week of the national contract a doctor's or salaried
 * dentist's grade is employed on, in force on a date in the nation they
 * work in. Keyed by date, as `afcWeekInForce` is, since it turns on
 * 1 April with the scheme year.
 *
 * Throws `RangeError` for a grade no national contract is read for (the
 * closed grades, among others: `contractOfGrade` says why), and for a year
 * no source sets, rather than lend a doctor the Agenda for Change week.
 */
export function contractWeekInForce(
  on: Date,
  nation: Nation,
  grade: MedicalDentalGradeId,
): number {
  const contract = contractOfGrade(grade);
  const {end, weeks} = contractWeeksOn(on);
  if (weeks === undefined) {
    throw new RangeError(
      `No sourced ${contract} contract week for the year to 31 March ${end}`);
  }
  return weeks[contract][nation];
}

/**
 * The longest full-time week any national contract held sets, in any
 * nation, in force on a date: the most hours a doctor's or salaried
 * dentist's standard week can be, whatever their grade. Read over every
 * contract the library holds, so a contract added to the table is counted.
 *
 * Throws `RangeError` for a year no source sets, as `contractWeekInForce`
 * does.
 */
export function longestContractWeekInForce(on: Date): number {
  const {end, weeks} = contractWeeksOn(on);
  if (weeks === undefined) {
    throw new RangeError(
      `No sourced contract week for the year to 31 March ${end}`);
  }
  return Math.max(
    ...Object.values(weeks).flatMap((byNation) => Object.values(byNation)),
  );
}

/**
 * Hours in a year at a given week: the divisor for an hourly rate.
 *
 * Not 52 weeks. A year is 52 weeks and a day, and the circulars this
 * library pins (Scotland's PCS(AFC)2026/1 and the Welsh living-wage
 * letter) divide by the longer year; 52 would give a rate neither
 * prints, about 0.3% high. Leap years are ignored, as those tables
 * ignore them. `tests/working-week.test.ts` pins it.
 */
export function hoursPerYear(weeklyHours: number): number {
  return (weeklyHours * DAYS_PER_YEAR) / DAYS_PER_WEEK;
}

/**
 * Annualise an hourly rate at given weekly hours.
 *
 * `weeklyHours` is required: the standard week varies by
 * nation and year (`afcWeeklyHours`), so defaulting it
 * would silently return an rUK answer for a Scottish rate.
 * Pass `afcWeeklyHours(year, nation)`, or a doctor's or salaried
 * dentist's `contractWeekInForce(on, nation, grade)`.
 *
 * The inverse of dividing by `hoursPerYear`, which it reads, so the two
 * agree up to the rounding of the hourly rate and of the result.
 */
export function annualiseHourly(
  hourly: number,
  weeklyHours: number,
): number {
  return Math.round(hourly * hoursPerYear(weeklyHours));
}

/** The scheme year `on` falls in, and every contract's week over it:
 *  `undefined` for a year no source sets, which each caller refuses in
 *  the words of the week it was asked for. */
function contractWeeksOn(on: Date): ContractYear {
  const end = schemeYearEndFor(on);
  return {end, weeks: CONTRACT_WEEKS[end]};
}

/** The week over the scheme year (1 April to 31 March) ending in `end`,
 *  whichever question asks it. */
function weekFor(end: SchemeYearEnd, nation: Nation): number {
  const weeks = AFC_WEEK[end];
  if (weeks === undefined) {
    throw new RangeError(`No sourced AfC week for the year to 31 March ${end}`);
  }
  return weeks[nation];
}

/** One scheme year's weeks: the handbook's in England, Wales and Northern
 *  Ireland, and Scotland's own. */
function withHandbookWeek(
  {scotland}: {readonly scotland: number},
): Readonly<Record<Nation, number>> {
  return {
    [NATION_KEYS.england]: HANDBOOK_WEEK,
    [NATION_KEYS.wales]: HANDBOOK_WEEK,
    [NATION_KEYS.northernIreland]: HANDBOOK_WEEK,
    [NATION_KEYS.scotland]: scotland,
  };
}
