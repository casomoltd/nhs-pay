/**
 * A contract's full-time week, in the unit the contract counts it in, and
 * the fraction of it a member works. FTE is a contracted week over the
 * family's standard week, so a reader can enter the hours or sessions on
 * their contract and see the fraction beside them.
 *
 * Sources, by family and nation (see docs/source-archive.md):
 * - Agenda for Change: hours, from `afcWeekInForce`.
 * - Resident doctors, 40 hours: England "TCS for NHS Doctors and Dentists
 *   in Training 2016, version 14" (#sa-76); Wales "TCS Resident Doctors and
 *   Dentists (Wales) 2026, version 1.3" (#sa-77). Scotland's 40 hours is
 *   derived from the hourly basis of "Scotland, PCS(DD)2026/01" (#sa-07),
 *   not from a terms-and-conditions clause. Northern Ireland: unsourced.
 * - Consultants, 10 programmed activities: England (#sa-78), Scotland
 *   (#sa-80), Northern Ireland (#sa-81). Wales counts 10 sessions
 *   (#sa-79), in 37.5 hours.
 * - Specialty doctors and specialists (SAS), 10 programmed activities in
 *   every nation (#sa-82 to #sa-89).
 * - Salaried GPs, 37.5 hours: England's model GMS terms (#sa-90).
 *   Elsewhere: unsourced.
 * - Community (salaried) dentists, 37.5 hours: England (#sa-91).
 *   Elsewhere: unsourced.
 * An unsourced week throws {@link RuleUnsourced} rather than borrowing
 * another nation's.
 */

import {NATION_KEYS} from '@casomoltd/paye-calc';
import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {RuleUnsourced} from './errors.js';
import {afcWeekInForce} from './working-week.js';

/** The contract a post is on, which decides how its week is counted. */
export const CONTRACT_FAMILIES = {
  afc: 'afc',
  resident: 'resident',
  consultant: 'consultant',
  sas: 'sas',
  salariedGp: 'salaried-gp',
  communityDental: 'community-dental',
} as const;

export type ContractFamily =
  (typeof CONTRACT_FAMILIES)[keyof typeof CONTRACT_FAMILIES];

/** A working week in the unit the contract counts it in. */
export type ContractedWeek =
  | {readonly unit: 'hours'; readonly hours: number}
  | {readonly unit: 'pas'; readonly pas: number}
  | {readonly unit: 'sessions'; readonly sessions: number};

/** A resident doctor's basic week, in hours. */
const RESIDENT_HOURS = 40;
/** A consultant's or SAS doctor's full-time job plan. */
const FULL_TIME_PAS = 10;
/** A Welsh consultant's full-time sessions. */
const WALES_CONSULTANT_SESSIONS = 10;
/** A salaried GP's and an English community dentist's week. */
const SALARIED_HOURS = 37.5;

const hours = (h: number): ContractedWeek => ({unit: 'hours', hours: h});

function unsourced(family: ContractFamily, nation: Nation): never {
  throw new RuleUnsourced(`the ${family} full-time week in ${nation}`);
}

/**
 * The family's full-time week in a nation. The year matters for Agenda
 * for Change, whose week changes on 1 April (Scotland's 36 hours from
 * 2026); it is required for every family so no caller defaults it.
 */
export function standardWeek(
  family: ContractFamily,
  nation: Nation,
  year: TaxYear,
): ContractedWeek {
  switch (family) {
    case CONTRACT_FAMILIES.afc:
      return hours(afcWeekInForce(year, nation));
    case CONTRACT_FAMILIES.resident:
      return nation === NATION_KEYS.northernIreland
        ? unsourced(family, nation)
        : hours(RESIDENT_HOURS);
    case CONTRACT_FAMILIES.consultant:
      return nation === NATION_KEYS.wales
        ? {unit: 'sessions', sessions: WALES_CONSULTANT_SESSIONS}
        : {unit: 'pas', pas: FULL_TIME_PAS};
    case CONTRACT_FAMILIES.sas:
      return {unit: 'pas', pas: FULL_TIME_PAS};
    case CONTRACT_FAMILIES.salariedGp:
    case CONTRACT_FAMILIES.communityDental:
      return nation === NATION_KEYS.england
        ? hours(SALARIED_HOURS)
        : unsourced(family, nation);
  }
}

/** The week's size in its own unit. */
function sizeOf(week: ContractedWeek): number {
  switch (week.unit) {
    case 'hours':
      return week.hours;
    case 'pas':
      return week.pas;
    case 'sessions':
      return week.sessions;
  }
}

/**
 * FTE for a contracted week: the week over the family's standard week,
 * capped at 1. A resident doctor's rota above 40 hours is additional
 * hours, not a larger post. A week in a unit the contract does not count
 * in (hours for a consultant in England, say) is refused: converting it
 * would need a programmed activity's length, which varies with the time
 * of day it is worked.
 */
export function fteOf(
  week: ContractedWeek,
  family: ContractFamily,
  nation: Nation,
  year: TaxYear,
): number {
  const standard = standardWeek(family, nation, year);
  if (week.unit !== standard.unit) {
    throw new RangeError(
      `A ${family} week in ${nation} is counted in ${standard.unit},`
        + ` not ${week.unit}`,
    );
  }
  const size = sizeOf(week);
  if (Number.isNaN(size) || size <= 0) {
    throw new RangeError(`A contracted week must be positive, got ${size}`);
  }
  return Math.min(1, size / sizeOf(standard));
}
