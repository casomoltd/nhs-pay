/**
 * The contracts that set a doctor's or salaried dentist's full-time week,
 * and which contract each grade is employed on. A grade names its contract:
 * a consultant is on the consultant contract of the nation they work in, a
 * dentist in core training on the training contract doctors share. Its own
 * module so the week's transcription (`published/contract-weeks.ts`) and
 * the lookup over it (`working-week.ts`) name a contract without a cycle.
 *
 * Every grade is listed, each with its contract or the reason it has none,
 * so a grade added to either registry is a compile error here until someone
 * reads its contract, rather than a refusal nobody chose.
 */

import type {DentalGradeId} from './dental-grades.js';
import {DENTAL_GRADES, DENTAL_GRADE_IDS} from './dental-grades.js';
import type {MedicalGradeId} from './medical-grades.js';
import {MEDICAL_GRADES, MEDICAL_GRADE_IDS} from './medical-grades.js';

/** A doctor's or salaried dentist's grade, as the scales name it. */
export type MedicalDentalGradeId = MedicalGradeId | DentalGradeId;

/** A grade with no national contract to read its week from, and why. */
interface NoNationalContract {
  readonly contract: null;
  readonly reason: string;
}

/** The national contracts a full-time week is read from. Each names a
 *  family: the instrument behind it differs by nation (England's 2016
 *  training contract, Wales's 2026 one), which the week's table cites. The
 *  values carry a `contract-` prefix because several grades share a bare
 *  name with their contract, and a grade must never pass as a contract. */
export const MEDICAL_DENTAL_CONTRACTS = {
  consultant: 'contract-consultant',
  /** Doctors and dentists in training: resident doctors. */
  resident: 'contract-resident',
  /** Specialty doctors and specialists on the current SAS contract. */
  sas: 'contract-sas',
  salariedGp: 'contract-salaried-gp',
  /** The salaried and community dental services. */
  salariedDental: 'contract-salaried-dental',
} as const;

export type MedicalDentalContractId =
  (typeof MEDICAL_DENTAL_CONTRACTS)[keyof typeof MEDICAL_DENTAL_CONTRACTS];

/** Every doctor's and salaried dentist's grade, doctors first. */
export const MEDICAL_DENTAL_GRADE_IDS: readonly MedicalDentalGradeId[] = [
  ...MEDICAL_GRADE_IDS, ...DENTAL_GRADE_IDS,
];

const {consultant, resident, sas, salariedGp, salariedDental} =
  MEDICAL_DENTAL_CONTRACTS;

const CLOSED: NoNationalContract = {
  contract: null, reason: 'a closed grade, whose contract has not been read',
};
// Local terms in England, Scotland and Northern Ireland; Wales publishes
// national terms for them, which have not been read.
const LOCAL: NoNationalContract = {
  contract: null, reason: 'local terms, or national terms not yet read',
};
// Northern Ireland's salaried-dentist bands are not its Community Dental
// Service, whose terms are the ones read.
const NI_SALARIED: NoNationalContract = {
  contract: null, reason: 'a salaried-dentist band whose contract has not been read',
};
const EDUCATOR: NoNationalContract = {
  contract: null, reason: 'an educator post, whose contract has not been read',
};

/** The contract each grade is employed on, or why it has none. */
const CONTRACT_OF_GRADE: Readonly<Record<
  MedicalDentalGradeId, MedicalDentalContractId | NoNationalContract
>> = {
  [MEDICAL_GRADES.consultant]: consultant,
  [MEDICAL_GRADES.resident]: resident,
  [MEDICAL_GRADES.fho1]: resident,
  [MEDICAL_GRADES.fho2]: resident,
  [MEDICAL_GRADES.sho]: resident,
  [MEDICAL_GRADES.spr]: resident,
  [MEDICAL_GRADES.str]: resident,
  [MEDICAL_GRADES.specialtyRegistrarCore]: resident,
  [MEDICAL_GRADES.specialtyRegistrarFixed]: resident,
  [MEDICAL_GRADES.gpRegistrarSho]: resident,
  [MEDICAL_GRADES.gpRegistrarSpr]: resident,
  [MEDICAL_GRADES.gpRegistrarStr]: resident,
  [MEDICAL_GRADES.specialtyDoctor]: sas,
  [MEDICAL_GRADES.specialist]: sas,
  [MEDICAL_GRADES.salariedGp]: salariedGp,
  [MEDICAL_GRADES.gpEducator]: EDUCATOR,
  [MEDICAL_GRADES.locallyEmployedDoctor]: LOCAL,
  [MEDICAL_GRADES.staffGrade]: CLOSED,
  [MEDICAL_GRADES.associateSpecialist]: CLOSED,
  [MEDICAL_GRADES.specialtyDoctor2008]: CLOSED,
  [MEDICAL_GRADES.associateSpecialist2008]: CLOSED,
  [MEDICAL_GRADES.hospitalPractitioner]: CLOSED,
  [DENTAL_GRADES.dentalCoreTraining]: resident,
  [DENTAL_GRADES.dentalSpecialtyTraining]: resident,
  [DENTAL_GRADES.dentalEducator]: EDUCATOR,
  [DENTAL_GRADES.salariedDental]: salariedDental,
  [DENTAL_GRADES.communityDentalOfficer]: salariedDental,
  [DENTAL_GRADES.seniorCommunityDentalOfficer]: salariedDental,
  [DENTAL_GRADES.assistantCommunityDentalClinicalDirector]: salariedDental,
  [DENTAL_GRADES.specialistCommunityDentist]: salariedDental,
  [DENTAL_GRADES.communityDentalClinicalDirector]: salariedDental,
  [DENTAL_GRADES.salariedDentist]: NI_SALARIED,
  [DENTAL_GRADES.seniorSalariedDentist]: NI_SALARIED,
  [DENTAL_GRADES.assistantClinicalDirectorDentist]: NI_SALARIED,
  [DENTAL_GRADES.clinicalDirectorDentist]: NI_SALARIED,
};

/**
 * The national contract a grade is employed on. Throws `RangeError`, with
 * the reason, for a grade no national contract is read for, rather than
 * lend it another grade's week.
 */
export function contractOfGrade(
  grade: MedicalDentalGradeId,
): MedicalDentalContractId {
  const contract = CONTRACT_OF_GRADE[grade];
  if (typeof contract !== 'string') {
    throw new RangeError(
      `No national contract is read for the ${grade} grade: ${contract.reason}`);
  }
  return contract;
}
