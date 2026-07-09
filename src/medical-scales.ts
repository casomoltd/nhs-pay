/**
 * Medical (doctors) translation layer.
 *
 * Imports the verbatim circular files (src/circulars/*) and maps their
 * pay tables into the canonical `getMedicalScales(year, nation)` view
 * the resolver reads. This is where the *selection* lives — which
 * scales feed the calculator domain — and the default is inclusive:
 * every substantive salary scale a member could be on is wired,
 * including the devolved training variants and the closed grades.
 *
 * Point granularity: one canonical point per source row, labelled by
 * that row's own step identity (stage / years / pay-scale code /
 * increment), so no pay step is collapsed away.
 *
 * Grades captured in the circulars but not yet wired here (add when a
 * page needs them — they are one mapping line each): England's ultra-
 * legacy closed grades SCMO (KB11), CMO (KB01), pre-2003 consultant
 * (MC21), closed Specialist Registrar (MN25) and closed training
 * variants (MN13/15/21/35/37/39); the second staff-grade scales
 * (England MH03/05, NI M212).
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, TAX_YEARS} from '@casomoltd/paye-calc';
import type {ScalePoint} from './scale-point.js';
import type {GradeMeta, GradeScaleTables} from './scale-tables.js';
import {
  byCode,
  byStage,
  numbered,
  range,
  resolveGradeMetas,
  scaleSalaries,
  stepped,
} from './scale-tables.js';
import {ENGLAND_MD_1_2026R as ENG} from './circulars/england-md-1-2026r.js';
import {SCOTLAND_PCS_DD_2026_01 as SCO} from './circulars/scotland-pcs-dd-2026-01.js';
import {WALES_MDW_01_2025 as WAL} from './circulars/wales-mdw-01-2025.js';
import {NI_HSC_TC8_05_2025 as NI} from './circulars/ni-hsc-tc8-05-2025.js';

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

/** A doctor grade's scale points in a nation/year, with its range. */
export type MedicalGradeMeta = GradeMeta<MedicalGradeId>;

// ── Mapping helpers ─────────────────────────────

/** Consultant year-point rows → points labelled by threshold, with the
 *  year of completed service carried on the point (not baked into the
 *  label) — the same `yearsExperience` axis the SAS scales use. */
const consultantByYear = (
  rows: readonly {threshold: string; yearCompleted: number; salary: number}[],
): readonly ScalePoint[] =>
  rows.map((r) => ({
    label: `Threshold ${r.threshold}`,
    salary: r.salary,
    yearsExperience: r.yearCompleted,
  }));

// ── Per-nation translation ──────────────────────

type NationScales = Partial<Record<MedicalGradeId, readonly ScalePoint[]>>;

const england: NationScales = {
  resident: byStage(ENG.doctorsInTraining),
  consultant: consultantByYear(ENG.consultant),
  'specialty-doctor': byCode(ENG.specialtyDoctor),
  specialist: byCode(ENG.specialist),
  'salaried-gp': range(ENG.salariedGpRange),
  'gp-educator': byCode(ENG.gpEducators),
  'locally-employed-doctor': byCode(ENG.locallyEmployedDoctors),
  'staff-grade': stepped(scaleSalaries(ENG.closedGrades, (g) => g.code === 'MH01', 'MH01')),
  'associate-specialist': stepped(
    scaleSalaries(ENG.closedGrades, (g) => g.code === 'MC01', 'MC01'),
  ),
  'specialty-doctor-2008': byCode(ENG.specialtyDoctor2008),
  'associate-specialist-2008': byCode(ENG.associateSpecialist2008),
};

const scotland: NationScales = {
  fho1: stepped(scaleSalaries(SCO.trainingGrades, (g) => g.grade === 'Foundation House Officer 1', 'Sco FHO1')),
  fho2: stepped(scaleSalaries(SCO.trainingGrades, (g) => g.grade === 'Foundation House Officer 2', 'Sco FHO2')),
  sho: stepped(scaleSalaries(SCO.trainingGrades, (g) => g.grade.startsWith('Senior House Officer'), 'Sco SHO')),
  spr: stepped(scaleSalaries(SCO.trainingGrades, (g) => g.grade === 'Specialist Registrar', 'Sco SpR')),
  str: stepped(scaleSalaries(SCO.trainingGrades, (g) => g.grade === 'Specialty Registrar (Full)', 'Sco StR')),
  'specialty-registrar-core': stepped(
    scaleSalaries(SCO.trainingGrades, (g) => g.grade === 'Specialty Registrar (Core Training)', 'Sco StR core'),
  ),
  'specialty-registrar-fixed': stepped(
    scaleSalaries(SCO.trainingGrades, (g) => g.grade === 'Specialty Registrar (Fixed Term)', 'Sco StR fixed'),
  ),
  'gp-registrar-sho': stepped(scaleSalaries(SCO.trainingGrades, (g) => g.grade === 'GP Specialty Registrar (SHO)', 'Sco GP SHO')),
  'gp-registrar-spr': stepped(scaleSalaries(SCO.trainingGrades, (g) => g.grade === 'GP Specialty Registrar (SpR)', 'Sco GP SpR')),
  'gp-registrar-str': stepped(scaleSalaries(SCO.trainingGrades, (g) => g.grade === 'GP Specialty Registrar (StR)', 'Sco GP StR')),
};

const wales: NationScales = {
  consultant: consultantByYear(WAL.consultant),
  str: stepped(scaleSalaries(WAL.trainingGrades, (g) => g.code === 'MN37', 'Wal MN37')),
  'specialty-registrar-core': stepped(scaleSalaries(WAL.trainingGrades, (g) => g.code === 'MN39', 'Wal MN39')),
  'specialty-registrar-fixed': stepped(scaleSalaries(WAL.trainingGrades, (g) => g.code === 'MN35', 'Wal MN35')),
  fho1: stepped(scaleSalaries(WAL.trainingGrades, (g) => g.code === 'MN13', 'Wal MN13')),
  fho2: stepped(scaleSalaries(WAL.trainingGrades, (g) => g.code === 'MN15', 'Wal MN15')),
  'specialty-doctor': byCode(WAL.specialtyDoctor),
  specialist: byCode(WAL.specialist),
  'salaried-gp': stepped(WAL.salariedGp.salaries),
  'staff-grade': stepped(scaleSalaries(WAL.closedGrades, (g) => g.code === 'MH01', 'Wal MH01')),
  'associate-specialist': stepped(scaleSalaries(WAL.closedGrades, (g) => g.code === 'MC01', 'Wal MC01')),
  'specialty-doctor-2008': byCode(WAL.specialtyDoctor2008),
  'associate-specialist-2008': byCode(WAL.associateSpecialist2008),
  'hospital-practitioner': stepped(scaleSalaries(WAL.closedGrades, (g) => g.code === 'MD01-41', 'Wal HP')),
};

const northernIreland: NationScales = {
  fho1: stepped(scaleSalaries(NI.residentGrades, (g) => g.code === 'M220', 'NI M220')),
  fho2: stepped(scaleSalaries(NI.residentGrades, (g) => g.code === 'M230', 'NI M230')),
  str: stepped(scaleSalaries(NI.residentGrades, (g) => g.code === 'M241', 'NI M241')),
  'specialty-registrar-fixed': stepped(scaleSalaries(NI.residentGrades, (g) => g.code === 'M240', 'NI M240')),
  'specialty-registrar-core': stepped(scaleSalaries(NI.residentGrades, (g) => g.code === 'M242', 'NI M242')),
  'specialty-doctor': NI.specialtyDoctor.map((r) => ({
    label: `Point ${r.payPoint}`, salary: r.salary,
    yearsExperience: r.yearsExperience,
  })),
  specialist: NI.specialist.map((r) => ({
    label: `Point ${r.payPoint}`, salary: r.salary,
    yearsExperience: r.yearsExperience,
  })),
  consultant: NI.consultant.map((r) => ({
    label: `Threshold ${r.threshold} · pt ${r.payPoint}`, salary: r.salary,
  })),
  'salaried-gp': range(NI.salariedGpRange),
  'gp-educator': NI.gpEducators.map((r) => ({label: r.point, salary: r.salary})),
  'hospital-practitioner': numbered(NI.hospitalPractitioner),
  'specialty-doctor-2008': byCode(NI.specialtyDoctor2008),
  'associate-specialist-2008': byCode(NI.associateSpecialist2008),
  'associate-specialist': stepped(scaleSalaries(NI.closedGrades, (g) => g.code === 'M080', 'NI M080')),
  'staff-grade': stepped(scaleSalaries(NI.closedGrades, (g) => g.code === 'M211', 'NI M211')),
};

const MEDICAL_SCALES: GradeScaleTables<MedicalGradeId> = {
  [TAX_YEARS.Y2026_27]: {
    [NATION_KEYS.england]: england,
    [NATION_KEYS.scotland]: scotland,
  },
  [TAX_YEARS.Y2025_26]: {
    [NATION_KEYS.wales]: wales,
    [NATION_KEYS.northernIreland]: northernIreland,
  },
};

/**
 * Tax years this family publishes, newest first — derived from the
 * data so a new pay round can't leave a hand-maintained list stale.
 */
export const MEDICAL_TAX_YEARS: readonly TaxYear[] = (
  Object.keys(MEDICAL_SCALES) as TaxYear[]
).sort().reverse();

/**
 * Published doctor grades for a nation and tax year, each with its
 * scale points and salary range. Both args required — no default;
 * an absent grade set throws `ScaleUnavailable`.
 */
export function getMedicalScales(
  year: TaxYear,
  nation: Nation,
): MedicalGradeMeta[] {
  return resolveGradeMetas(
    MEDICAL_SCALES, MEDICAL_GRADE_IDS, year, nation,
  );
}
