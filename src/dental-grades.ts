/**
 * The salaried-dental grades wired into the domain, in their own module so
 * a module that names a grade (the award table, roles, the resolvers) need
 * not import the translation layer in `dental-scales.ts`. The dental
 * counterpart of `medical-grades.ts`.
 */

/** Salaried-dental grade identifiers wired into the domain. */
export const DENTAL_GRADES = {
  salariedDental: 'salaried-dental',
  dentalCoreTraining: 'dental-core-training',
  dentalSpecialtyTraining: 'dental-specialty-training',
  dentalEducator: 'dental-educator',
  salariedDentist: 'salaried-dentist',
  seniorSalariedDentist: 'senior-salaried-dentist',
  assistantClinicalDirectorDentist: 'assistant-clinical-director-dentist',
  clinicalDirectorDentist: 'clinical-director-dentist',
  communityDentalOfficer: 'community-dental-officer',
  seniorCommunityDentalOfficer: 'senior-community-dental-officer',
  assistantCommunityDentalClinicalDirector:
    'assistant-community-dental-clinical-director',
  specialistCommunityDentist: 'specialist-community-dentist',
  communityDentalClinicalDirector: 'community-dental-clinical-director',
} as const;

export type DentalGradeId =
  (typeof DENTAL_GRADES)[keyof typeof DENTAL_GRADES];

/** Ordered grade IDs — stable iteration/enumeration. */
export const DENTAL_GRADE_IDS: DentalGradeId[] =
  Object.values(DENTAL_GRADES);
