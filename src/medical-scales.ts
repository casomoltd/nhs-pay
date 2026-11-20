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
 * consumer needs them — they are one mapping line each): England's ultra-
 * legacy closed grades SCMO (KB11), CMO (KB01), pre-2003 consultant
 * (MC21), closed Specialist Registrar (MN25) and closed training
 * variants (MN13/15/21/35/37/39); the second staff-grade scales
 * (England MH03/05, NI M212).
 */

import type {Nation, PayYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, YEAR_LABELS} from '@casomoltd/paye-calc';
import type {ScalePoint} from './scale-point.js';
import type {DocumentSource} from './document-source.js';
import {ScaleUnavailable} from './errors.js';
import {MEDICAL_GRADE_IDS} from './medical-grades.js';
import type {MedicalGradeId} from './medical-grades.js';
import type {
  GradeMeta, GradeScale, GradeScaleTables,
} from './scale-tables.js';
import {
  byCode,
  combineScales,
  fromDocument,
  byStage,
  numbered,
  range,
  resolveGradeMetas,
  salariesOfCode,
  stepped,
} from './scale-tables.js';
import {
  HSC_TC8_05_2025,
  MD_W_01_2025,
  MD_W_01_2026,
  PC_MD_1_2026_R2,
  PCS_DD_2025_01,
  PCS_DD_2025_01_ADDENDUM,
  PCS_DD_2026_01,
  PCS_DD_2026_02,
} from './sources.js';
import {
  ENGLAND_MD_1_2026_R2 as ENG,
  ENGLAND_MD_1_2026_R2_CODES as ENG_CODES,
} from './circulars/england-md-1-2026-r2.js';
import {
  SCOTLAND_PCS_DD_2026_01 as SCO,
  SCOTLAND_PCS_DD_2026_01_CODES as SCO_CODES,
} from './circulars/scotland-pcs-dd-2026-01.js';
import {
  SCOTLAND_PCS_DD_2025_01 as SCO25,
  SCOTLAND_PCS_DD_2025_01_CODES as SCO25_CODES,
} from './circulars/scotland-pcs-dd-2025-01.js';
import {
  SCOTLAND_PCS_DD_2026_02 as SCO2,
  SCOTLAND_PCS_DD_2026_02_CODES as SCO2_CODES,
} from './circulars/scotland-pcs-dd-2026-02.js';
import {
  WALES_MDW_01_2025 as WAL,
  WALES_MDW_01_2025_CODES as WAL_CODES,
} from './circulars/wales-mdw-01-2025.js';
import {
  WALES_MDW_01_2026 as WAL26,
  WALES_MDW_01_2026_CODES as WAL26_CODES,
} from './circulars/wales-mdw-01-2026.js';
import {
  NI_HSC_TC8_05_2025 as NI,
  NI_HSC_TC8_05_2025_CODES as NI_CODES,
} from './circulars/ni-hsc-tc8-05-2025.js';

/** A doctor grade's scale points in a nation/year, with its range. */
export type MedicalGradeMeta = GradeMeta<MedicalGradeId>;

/** One nation's doctor scales, by grade. */
type NationScales = Partial<Record<MedicalGradeId, GradeScale>>;

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


const england: NationScales = fromDocument<MedicalGradeId>(PC_MD_1_2026_R2, {
  resident: byStage(ENG.doctorsInTraining),
  consultant: consultantByYear(ENG.consultant),
  'specialty-doctor': byCode(ENG.specialtyDoctor),
  specialist: byCode(ENG.specialist),
  'salaried-gp': range(ENG.salariedGpRange),
  'gp-educator': byCode(ENG.gpEducators),
  'locally-employed-doctor': byCode(ENG.locallyEmployedDoctors),
  'staff-grade': stepped(
    salariesOfCode(ENG.closedGrades, ENG_CODES.staffGrade),
  ),
  'associate-specialist': stepped(
    salariesOfCode(ENG.closedGrades, ENG_CODES.associateSpecialist),
  ),
  'specialty-doctor-2008': byCode(ENG.specialtyDoctor2008),
  'associate-specialist-2008': byCode(ENG.associateSpecialist2008),
});

// Non-training grades from PCS(DD)2026/02 (12 Aug 2026); training
// grades from PCS(DD)2026/01, which deferred the rest to it. The
// two together are Scotland's complete 2026/27 round.
const scotland: NationScales = combineScales(
  fromDocument<MedicalGradeId>(PCS_DD_2026_02, {
    consultant: consultantByYear(SCO2.consultant),
    'specialty-doctor': SCO2.specialtyDoctor2022.map((r) => ({
      label: r.scalePoint === 0 ? 'Minimum' : `Point ${r.scalePoint}`,
      salary: r.salary,
      yearsExperience: r.scalePoint,
    })),
    specialist: SCO2.specialist2022.map((r) => ({
      label: r.scalePoint === 0 ? 'Minimum' : `Point ${r.scalePoint}`,
      salary: r.salary,
      yearsExperience: r.scalePoint,
    })),
    'specialty-doctor-2008': stepped(SCO2.specialtyDoctor2008),
    'associate-specialist-2008': stepped(SCO2.associateSpecialist2008),
    'associate-specialist': stepped(
      salariesOfCode(SCO2.closedGrades, SCO2_CODES.associateSpecialistPre2008),
    ),
    'staff-grade': stepped(
      salariesOfCode(SCO2.closedGrades, SCO2_CODES.staffGradePre1997),
    ),
    'salaried-gp': range(SCO2.salariedGpRange),
    'gp-educator': SCO2.associateAdvisers.map((r) => ({
      label: r.grade, salary: r.salary,
    })),
  }),
  fromDocument<MedicalGradeId>(PCS_DD_2026_01, {
    fho1: stepped(
      salariesOfCode(SCO.trainingGrades, SCO_CODES.foundationYear1),
    ),
    fho2: stepped(
      salariesOfCode(SCO.trainingGrades, SCO_CODES.foundationYear2),
    ),
    sho: stepped(
      salariesOfCode(SCO.trainingGrades, SCO_CODES.seniorHouseOfficer),
    ),
    spr: stepped(
      salariesOfCode(SCO.trainingGrades, SCO_CODES.specialistRegistrar),
    ),
    str: stepped(
      salariesOfCode(SCO.trainingGrades, SCO_CODES.specialtyRegistrarFull),
    ),
    'specialty-registrar-core': stepped(
      salariesOfCode(SCO.trainingGrades, SCO_CODES.specialtyRegistrarCore),
    ),
    'specialty-registrar-fixed': stepped(
      salariesOfCode(SCO.trainingGrades, SCO_CODES.specialtyRegistrarFixed),
    ),
    'gp-registrar-sho': stepped(
      salariesOfCode(SCO.trainingGrades, SCO_CODES.gpRegistrarSho),
    ),
    'gp-registrar-spr': stepped(
      salariesOfCode(SCO.trainingGrades, SCO_CODES.gpRegistrarSpr),
    ),
    'gp-registrar-str': stepped(
      salariesOfCode(SCO.trainingGrades, SCO_CODES.gpRegistrarStr),
    ),
  }),
);

const wales: NationScales = fromDocument<MedicalGradeId>(MD_W_01_2025, {
  consultant: consultantByYear(WAL.consultant),
  str: stepped(salariesOfCode(WAL.trainingGrades, WAL_CODES.specialtyRegistrarFull)),
  'specialty-registrar-core': stepped(
    salariesOfCode(WAL.trainingGrades, WAL_CODES.specialtyRegistrarCore),
  ),
  'specialty-registrar-fixed': stepped(
    salariesOfCode(WAL.trainingGrades, WAL_CODES.specialtyRegistrarFixed),
  ),
  fho1: stepped(
    salariesOfCode(WAL.trainingGrades, WAL_CODES.foundationYear1),
  ),
  fho2: stepped(
    salariesOfCode(WAL.trainingGrades, WAL_CODES.foundationYear2),
  ),
  'specialty-doctor': byCode(WAL.specialtyDoctor),
  specialist: byCode(WAL.specialist),
  'salaried-gp': stepped(WAL.salariedGp.salaries),
  'staff-grade': stepped(
    salariesOfCode(WAL.closedGrades, WAL_CODES.staffGrade),
  ),
  'associate-specialist': stepped(
    salariesOfCode(WAL.closedGrades, WAL_CODES.associateSpecialist),
  ),
  'specialty-doctor-2008': byCode(WAL.specialtyDoctor2008),
  'associate-specialist-2008': byCode(WAL.associateSpecialist2008),
  'hospital-practitioner': stepped(
    salariesOfCode(WAL.closedGrades, WAL_CODES.hospitalPractitioner),
  ),
});

const northernIreland: NationScales = fromDocument<MedicalGradeId>(HSC_TC8_05_2025, {
  fho1: stepped(salariesOfCode(NI.residentGrades, NI_CODES.foundationYear1)),
  fho2: stepped(salariesOfCode(NI.residentGrades, NI_CODES.foundationYear2)),
  str: stepped(salariesOfCode(NI.residentGrades, NI_CODES.specialtyRegistrarFull)),
  'specialty-registrar-fixed': stepped(
    salariesOfCode(NI.residentGrades, NI_CODES.specialtyRegistrarFixed),
  ),
  'specialty-registrar-core': stepped(
    salariesOfCode(NI.residentGrades, NI_CODES.coreTraining),
  ),
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
  'associate-specialist': stepped(
    salariesOfCode(NI.closedGrades, NI_CODES.associateSpecialist),
  ),
  'staff-grade': stepped(
    salariesOfCode(NI.closedGrades, NI_CODES.staffGrade),
  ),
});

/**
 * Wales's 2026 Resident Contract — Annex A §1c, in force from
 * 1 August 2026.
 *
 * Mapped to `resident`, the same id England's 2016 contract uses,
 * because that id means "the nation's current resident contract" and
 * this is now Wales's. The §1b training grades below stay mapped as
 * themselves: the circular closes them to new entrants from August 2026
 * but says their "pay levels will continue to be uplifted each year",
 * so they are a live scale for anyone not yet transitioned, not a
 * superseded one to delete.
 *
 * No `nodalPoint`: that axis is the 2016 contract's, and this is a
 * different contract whose spine restarts per grade — F1, F2 and the
 * registrar all print a spine 1. The label carries the identity
 * instead, which is what `ScalePoint` asks for where a step is
 * self-describing.
 *
 * The dental foundation trainee rate the same table prints is NOT here:
 * it is a dental grade, `DENTAL_GRADES` has no id for it, and inventing
 * one to park it in the medical scales would put it where no consumer
 * would look.
 */
const walesResident2026 = (
  rows: readonly {grade: string; spine: number | null; salary: number}[],
): readonly ScalePoint[] =>
  rows
    .filter((r) => r.grade !== 'Dental Foundation Trainee')
    .map((r) => ({
      label: r.grade === 'Registrar' ? `Registrar ${r.spine}` : r.grade,
      salary: r.salary,
    }));

// Wales 2026/27 (M&D(W) 01/2026) — a full 3.5% uplift of the 2025 scales.
// The Associate Specialist MC01 code is removed in this circular, so unlike
// `wales` (2025) there is no 'associate-specialist' entry here.
const wales2026: NationScales = fromDocument<MedicalGradeId>(MD_W_01_2026, {
  resident: walesResident2026(WAL26.resident2026Contract),
  consultant: consultantByYear(WAL26.consultant),
  str: stepped(
    salariesOfCode(WAL26.trainingGrades, WAL26_CODES.specialtyRegistrarFull),
  ),
  'specialty-registrar-core': stepped(
    salariesOfCode(WAL26.trainingGrades, WAL26_CODES.specialtyRegistrarCore),
  ),
  'specialty-registrar-fixed': stepped(
    salariesOfCode(WAL26.trainingGrades, WAL26_CODES.specialtyRegistrarFixed),
  ),
  fho1: stepped(
    salariesOfCode(WAL26.trainingGrades, WAL26_CODES.foundationYear1),
  ),
  fho2: stepped(
    salariesOfCode(WAL26.trainingGrades, WAL26_CODES.foundationYear2),
  ),
  'specialty-doctor': byCode(WAL26.specialtyDoctor),
  specialist: byCode(WAL26.specialist),
  'salaried-gp': stepped(WAL26.salariedGp.salaries),
  'staff-grade': stepped(
    salariesOfCode(WAL26.closedGrades, WAL26_CODES.staffGrade),
  ),
  'specialty-doctor-2008': byCode(WAL26.specialtyDoctor2008),
  'associate-specialist-2008': byCode(WAL26.associateSpecialist2008),
  'hospital-practitioner': stepped(
    salariesOfCode(WAL26.closedGrades, WAL26_CODES.hospitalPractitioner),
  ),
});

// Scotland 2025/26 — a complete round in one circular (non-training
// from the main document, training grades from its addendum).
// Scotland's 2026/27 round is complete too, but across TWO circulars:
// 2026/01 carries the training grades and 2026/02 everything else, so
// a new Scottish scale belongs in whichever of those published it.
const scotland2025: NationScales = combineScales(
  fromDocument<MedicalGradeId>(PCS_DD_2025_01, {
    consultant: consultantByYear(SCO25.consultant),
    'specialty-doctor': SCO25.specialtyDoctor2022.map((r) => ({
      label: r.scalePoint === 0 ? 'Minimum' : `Point ${r.scalePoint}`,
      salary: r.salary,
      yearsExperience: r.scalePoint,
    })),
    specialist: SCO25.specialist2022.map((r) => ({
      label: r.scalePoint === 0 ? 'Minimum' : `Point ${r.scalePoint}`,
      salary: r.salary,
      yearsExperience: r.scalePoint,
    })),
    'specialty-doctor-2008': stepped(SCO25.specialtyDoctor2008),
    'associate-specialist-2008': stepped(SCO25.associateSpecialist2008),
    'associate-specialist': stepped(
      salariesOfCode(SCO25.closedGrades, SCO25_CODES.associateSpecialistPre2008),
    ),
    'staff-grade': stepped(
      salariesOfCode(SCO25.closedGrades, SCO25_CODES.staffGradePre1997),
    ),
    'hospital-practitioner': numbered(SCO25.hospitalPractitioner),
    'salaried-gp': range(SCO25.salariedGpRange),
    'gp-educator': SCO25.associateAdvisers.map((r) => ({
      label: r.grade, salary: r.salary,
    })),
  }),
  fromDocument<MedicalGradeId>(PCS_DD_2025_01_ADDENDUM, {
    fho1: stepped(
      salariesOfCode(SCO25.trainingGrades, SCO25_CODES.foundationYear1),
    ),
    fho2: stepped(
      salariesOfCode(SCO25.trainingGrades, SCO25_CODES.foundationYear2),
    ),
    sho: stepped(
      salariesOfCode(SCO25.trainingGrades, SCO25_CODES.seniorHouseOfficer),
    ),
    spr: stepped(
      salariesOfCode(SCO25.trainingGrades, SCO25_CODES.specialistRegistrar),
    ),
    str: stepped(
      salariesOfCode(SCO25.trainingGrades, SCO25_CODES.specialtyRegistrarFull),
    ),
    'specialty-registrar-core': stepped(
      salariesOfCode(SCO25.trainingGrades, SCO25_CODES.specialtyRegistrarCore),
    ),
    'specialty-registrar-fixed': stepped(
      salariesOfCode(SCO25.trainingGrades, SCO25_CODES.specialtyRegistrarFixed),
    ),
    'gp-registrar-sho': stepped(
      salariesOfCode(SCO25.trainingGrades, SCO25_CODES.gpRegistrarSho),
    ),
    'gp-registrar-spr': stepped(
      salariesOfCode(SCO25.trainingGrades, SCO25_CODES.gpRegistrarSpr),
    ),
    'gp-registrar-str': stepped(
      salariesOfCode(SCO25.trainingGrades, SCO25_CODES.gpRegistrarStr),
    ),
  }),
);

const MEDICAL_SCALES: GradeScaleTables<MedicalGradeId> = {
  [YEAR_LABELS.Y2026_27]: {
    [NATION_KEYS.england]: england,
    [NATION_KEYS.scotland]: scotland,
    [NATION_KEYS.wales]: wales2026,
  },
  [YEAR_LABELS.Y2025_26]: {
    [NATION_KEYS.wales]: wales,
    [NATION_KEYS.northernIreland]: northernIreland,
    [NATION_KEYS.scotland]: scotland2025,
  },
};

/**
 * Pay years this family publishes, newest first — derived from the
 * data so a new pay round can't leave a hand-maintained list stale.
 */
export const MEDICAL_PAY_YEARS: readonly PayYear[] = (
  Object.keys(MEDICAL_SCALES) as PayYear[]
).sort((a, b) => b.localeCompare(a));

/**
 * Published doctor grades for a nation and pay year, each with its
 * scale points and salary range. Both args required — no default;
 * an absent grade set throws `ScaleUnavailable`.
 */
export function getMedicalScales(
  year: PayYear,
  nation: Nation,
): MedicalGradeMeta[] {
  return resolveGradeMetas(
    MEDICAL_SCALES, MEDICAL_GRADE_IDS, year, nation,
  );
}

/**
 * The newest document a nation has published for its doctors' pay,
 * across every medical grade and every year it publishes. It searches
 * the medical tables only: a document that sets dental pay alone is not
 * a candidate.
 *
 * For prose that cites the nation rather than one family's table.
 * Newest by issue date, not by any hardcoded preference: Scotland
 * splits its 2026/27 round across two circulars and this picks
 * PCS(DD)2026/02 (12 August) over PCS(DD)2026/01 (1 April).
 *
 * Walks back a year where a nation is behind — Northern Ireland has
 * published no 2026-27 medical circular, and its most recent one is
 * still the right thing to cite.
 */
export function latestMedicalSource(nation: Nation): DocumentSource {
  for (const year of MEDICAL_PAY_YEARS) {
    let metas;
    try {
      metas = getMedicalScales(year, nation);
    } catch (error) {
      if (!(error instanceof ScaleUnavailable)) throw error;
      continue;
    }
    const [first, ...rest] = metas.map((m) => m.source);
    if (first) {
      return rest.reduce((a, b) => (b.issued > a.issued ? b : a), first);
    }
  }
  throw new ScaleUnavailable(nation, MEDICAL_PAY_YEARS[0]);
}
