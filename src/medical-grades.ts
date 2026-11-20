/**
 * The doctor grades wired into the domain, in their own module so a
 * module that names a grade (the award table, roles, the resolvers) need
 * not import the translation layer in `medical-scales.ts`, as `afc-band.ts`
 * is for AfC bands.
 */

/** Doctor grade identifiers wired into the domain. */
export const MEDICAL_GRADES = {
  resident: 'resident',
  consultant: 'consultant',
  specialtyDoctor: 'specialty-doctor',
  specialist: 'specialist',
  salariedGp: 'salaried-gp',
  gpEducator: 'gp-educator',
  locallyEmployedDoctor: 'locally-employed-doctor',
  fho1: 'fho1',
  fho2: 'fho2',
  sho: 'sho',
  spr: 'spr',
  str: 'str',
  specialtyRegistrarCore: 'specialty-registrar-core',
  specialtyRegistrarFixed: 'specialty-registrar-fixed',
  gpRegistrarSho: 'gp-registrar-sho',
  gpRegistrarSpr: 'gp-registrar-spr',
  gpRegistrarStr: 'gp-registrar-str',
  staffGrade: 'staff-grade',
  associateSpecialist: 'associate-specialist',
  specialtyDoctor2008: 'specialty-doctor-2008',
  associateSpecialist2008: 'associate-specialist-2008',
  hospitalPractitioner: 'hospital-practitioner',
} as const;

export type MedicalGradeId =
  (typeof MEDICAL_GRADES)[keyof typeof MEDICAL_GRADES];

/** Ordered grade IDs — stable iteration/enumeration. */
export const MEDICAL_GRADE_IDS: MedicalGradeId[] =
  Object.values(MEDICAL_GRADES);
