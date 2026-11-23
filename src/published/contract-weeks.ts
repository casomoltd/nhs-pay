/**
 * The full-time week of each national contract a doctor or salaried dentist
 * is employed on, by nation, as its terms and conditions print it, keyed by
 * the scheme year (1 April to 31 March) the instruments below are in force
 * for. `working-week.ts` refuses a year with no entry rather than assume a
 * week held still.
 *
 * Where a contract counts its week in sessions or programmed activities,
 * the hours are the count times the timetabled length it prints: ten of
 * four hours is 40. Wales's consultant contract is the exception: its ten
 * sessions run "three to four hours each", so its 37½ is the total it
 * states, not a product.
 *
 * Every source is a row in docs/source-archive.md, cited here by its id.
 */

import type {Nation} from '@casomoltd/paye-calc';
import {MEDICAL_DENTAL_CONTRACTS} from '../medical-dental-contracts.js';
import type {MedicalDentalContractId} from '../medical-dental-contracts.js';

/** One scheme year's weeks: every contract, in every nation, in hours. */
type ContractWeeks = Readonly<Record<
  MedicalDentalContractId, Readonly<Record<Nation, number>>
>>;

/** Each scheme year's weeks, by the year its 31 March falls in. */
export const CONTRACT_WEEKS: Readonly<Partial<Record<number, ContractWeeks>>> = {
  2027: { // 2026-27
    [MEDICAL_DENTAL_CONTRACTS.consultant]: {
      // #sa-93, Schedule 3 para 2 (p8): "A standard full-time Job Plan will
      // contain ten Programmed Activities", each "a timetable value of four
      // hours".
      england: 40,
      // #sa-99, the Amendment's para 2.19 (p63): "The total normal hours in
      // the working week will be 37½ hours."
      wales: 37.5,
      // #sa-107, para 4.1.2 (printed p16; the source is a .doc): "10
      // programmed activities with a timetabled value of 4 hours each".
      scotland: 40,
      // #sa-113, Schedule 3 para 2 (p8): ten Programmed Activities of "a
      // timetable value of four hours".
      'northern-ireland': 40,
    },
    [MEDICAL_DENTAL_CONTRACTS.resident]: {
      // #sa-94, Schedule 02 para 2 (p14): "calculated on an average of 40
      // hours' work per week".
      england: 40,
      // Two contracts, one week. #sa-100 (from 1 August 2026, #sa-101),
      // Schedule 02 para 13 (p14): "an average of 40 hours' work per week";
      // #sa-102, para 18.a.i (p12), for those still on the 2002 terms: "40
      // hours per week".
      wales: 40,
      // #sa-108, Annex C para 18.a.i (p41): "40 hours per week".
      scotland: 40,
      // #sa-114, para 18.a.i (p12): "40 hours per week".
      'northern-ireland': 40,
    },
    [MEDICAL_DENTAL_CONTRACTS.sas]: {
      // #sa-95 and #sa-96, Schedule 4 para 4 (p10): "A standard full-time Job
      // Plan will contain 10 Programmed Activities", each "a timetable value
      // of four hours".
      england: 40,
      // #sa-103 and #sa-104, Schedule 4 para 4 (p9): "10 Sessions", each "a
      // timetable value of four hours".
      wales: 40,
      // #sa-109 and #sa-110, Schedule 4 para 7 (p12): "10 Programmed
      // Activities", each "a timetable value of four hours".
      scotland: 40,
      // #sa-115 and #sa-116, Schedule 4 para 4 (p10 and p9): "10 Programmed
      // Activities", each "a timetable value of four hours".
      'northern-ireland': 40,
    },
    [MEDICAL_DENTAL_CONTRACTS.salariedGp]: {
      // The model terms (#sa-97), para 4 (p2): "Full-time general
      // practitioners will normally be contracted to work for 37½ hours per
      // working week". The GMS regulations bind a practice to terms no less
      // favourable: Wales by #sa-106, Sch 3 para 70 (as substituted from 2
      // March 2026); Scotland by #sa-112, Sch 6 para 56. England's are the
      // terms' own subject; no English regulation binding them was read.
      england: 37.5,
      wales: 37.5,
      scotland: 37.5,
      // Northern Ireland's own model contract (#sa-118), para 4 (p5), in the
      // same words. Hosted by the BMA alone: no Department copy was found.
      'northern-ireland': 37.5,
    },
    [MEDICAL_DENTAL_CONTRACTS.salariedDental]: {
      // #sa-98, Schedule 3 para 3.1 (p6): "37.5 hours per week".
      england: 37.5,
      // #sa-105, Schedule 3 para 3.1 (p6): "37.5 hours per week".
      wales: 37.5,
      // #sa-111, section 4 para 1 (p13): "37½ hours, excluding meal breaks".
      // The Agenda for Change move to 36 hours (#sa-56) is for staff on that
      // pay system alone, and does not reach it.
      scotland: 37.5,
      // #sa-117, Schedule 4 para 4.6 (p11): "37.5 hours per week".
      'northern-ireland': 37.5,
    },
  },
};
