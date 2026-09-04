/**
 * Salaried-dental translation layer.
 *
 * Imports the verbatim circular files and maps their dental pay tables
 * into the canonical `getDentalScales(year, nation)` view the resolver
 * reads. Inclusive by default: the England/Wales A/B/C spine, NI's four
 * salaried-dentist bands AND the five Community Dental Service grades,
 * dentists in core & specialty training, and dental educators are all
 * wired. Self-employed GDS/UDA dentists remain out of scope (income is
 * contract-driven, not a salary scale).
 *
 * One canonical point per source row; no pay step collapsed.
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, TAX_YEARS} from '@casomoltd/paye-calc';
import type {
  GradeMeta, GradeScale, GradeScaleTables,
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
  byCode,
  combineScales,
  fromDocument,
  byStage,
  bySpine,
  numbered,
  resolveGradeMetas,
  scaleSalaries,
  stepped,
} from './scale-tables.js';
import {ENGLAND_MD_1_2026_R2 as ENG} from './circulars/england-md-1-2026-r2.js';
import {SCOTLAND_PCS_DD_2026_01 as SCO} from './circulars/scotland-pcs-dd-2026-01.js';
import {SCOTLAND_PCS_DD_2025_01 as SCO25} from './circulars/scotland-pcs-dd-2025-01.js';
import {SCOTLAND_PCS_DD_2026_02 as SCO2} from './circulars/scotland-pcs-dd-2026-02.js';
import {WALES_MDW_01_2025 as WAL} from './circulars/wales-mdw-01-2025.js';
import {WALES_MDW_01_2026 as WAL26} from './circulars/wales-mdw-01-2026.js';
import {NI_HSC_TC8_05_2025 as NI} from './circulars/ni-hsc-tc8-05-2025.js';

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

/** A dental grade's scale points in a nation/year, with its range. */
export type DentalGradeMeta = GradeMeta<DentalGradeId>;

type NationScales = Partial<Record<DentalGradeId, GradeScale>>;

// England §1 dentists in training: CT1-3 = core, ST1-8 = specialty.
const engDentists = ENG.dentistsInTraining;

// The England spine prints the band in its pay-scale code (LD01/11/21),
// not a band column; map the code to the band so a relabelled boundary
// stays correct (matches Wales's explicit "Band X Point N" labels).
const LD_BAND: Record<string, string | undefined> = {
  LD01: 'A', LD11: 'B', LD21: 'C',
};
const ldBand = (code: string): string => {
  const band = LD_BAND[code];
  if (!band) {
    throw new Error(`dental-scales: unknown spine code "${code}"`);
  }
  return band;
};

const england: NationScales = fromDocument<DentalGradeId>(PC_MD_1_2026_R2, {
  'salaried-dental': ENG.salariedDentalSpine.map((r) => ({
    label: `Band ${ldBand(r.code)} Point ${r.point}`,
    salary: r.salary,
  })),
  'dental-core-training': byStage(engDentists.slice(0, 3)),
  'dental-specialty-training': byStage(engDentists.slice(3)),
  'dental-educator': byCode(ENG.dentalEducators),
});

// The Public Dental Service spine comes from PCS(DD)2026/02 Annex G,
// uplifted 3.75% (its para 3) rather than the 3.5% the rest of that
// circular carries; dental core training from PCS(DD)2026/01.
const scotland: NationScales = combineScales(
  fromDocument<DentalGradeId>(PCS_DD_2026_02, {
    'salaried-dental': bySpine(SCO2.salariedDentalSpine),
  }),
  fromDocument<DentalGradeId>(PCS_DD_2026_01, {
    'dental-core-training': [
      {
        label: SCO.dentalCoreTraining.stage,
        salary: SCO.dentalCoreTraining.salary,
      },
    ],
  }),
);

const wales: NationScales = fromDocument<DentalGradeId>(MD_W_01_2025, {
  'salaried-dental': bySpine(WAL.salariedDentalSpine),
  'dental-core-training': stepped(
    scaleSalaries(WAL.trainingGrades, (g) => g.code === 'MN21', 'Wal MN21'),
  ),
});

const northernIreland: NationScales = fromDocument<DentalGradeId>(HSC_TC8_05_2025, {
  'salaried-dentist': numbered(
    scaleSalaries(NI.salariedDental, (g) => g.band === 1, 'NI dental band 1'),
  ),
  'senior-salaried-dentist': numbered(
    scaleSalaries(NI.salariedDental, (g) => g.band === 2, 'NI dental band 2'),
  ),
  'assistant-clinical-director-dentist': numbered(
    scaleSalaries(NI.salariedDental, (g) => g.band === 3, 'NI dental band 3'),
  ),
  'clinical-director-dentist': numbered(
    scaleSalaries(NI.salariedDental, (g) => g.band === 4, 'NI dental band 4'),
  ),
  'dental-core-training': stepped(
    scaleSalaries(NI.residentGrades, (g) => g.code === 'M242', 'NI M242'),
  ),
  'community-dental-officer': numbered(
    scaleSalaries(NI.communityDentalService, (g) => g.code === 'M431', 'NI M431'),
  ),
  'senior-community-dental-officer': numbered(
    scaleSalaries(NI.communityDentalService, (g) => g.code === 'M432', 'NI M432'),
  ),
  'assistant-community-dental-clinical-director': numbered(
    scaleSalaries(NI.communityDentalService, (g) => g.code === 'M433', 'NI M433'),
  ),
  'specialist-community-dentist': numbered(
    scaleSalaries(NI.communityDentalService, (g) => g.code === 'M434', 'NI M434'),
  ),
  'community-dental-clinical-director': numbered(
    scaleSalaries(NI.communityDentalService, (g) => g.code === 'M435', 'NI M435'),
  ),
});

// Wales 2026/27 — salaried dental spine + dental core training, uplifted.
const wales2026: NationScales = fromDocument<DentalGradeId>(MD_W_01_2026, {
  'salaried-dental': bySpine(WAL26.salariedDentalSpine),
  'dental-core-training': stepped(
    scaleSalaries(WAL26.trainingGrades, (g) => g.code === 'MN21', 'Wal26 MN21'),
  ),
});

// Scotland 2025/26 — the Public Dental Service spine (Annex G) and dental
// core training (addendum).
const scotland2025: NationScales = combineScales(
  fromDocument<DentalGradeId>(PCS_DD_2025_01, {
    'salaried-dental': bySpine(SCO25.salariedDentalSpine),
  }),
  fromDocument<DentalGradeId>(PCS_DD_2025_01_ADDENDUM, {
    'dental-core-training': [
      {label: SCO25.dentalCoreTraining.stage, salary: SCO25.dentalCoreTraining.salary},
    ],
  }),
);

const DENTAL_SCALES: GradeScaleTables<DentalGradeId> = {
  [TAX_YEARS.Y2026_27]: {
    [NATION_KEYS.england]: england,
    [NATION_KEYS.scotland]: scotland,
    [NATION_KEYS.wales]: wales2026,
  },
  [TAX_YEARS.Y2025_26]: {
    [NATION_KEYS.wales]: wales,
    [NATION_KEYS.northernIreland]: northernIreland,
    [NATION_KEYS.scotland]: scotland2025,
  },
};

/** Tax years this family publishes, newest first (derived from data). */
export const DENTAL_TAX_YEARS: readonly TaxYear[] = (
  Object.keys(DENTAL_SCALES) as TaxYear[]
).sort().reverse();

/**
 * Published salaried dental grades for a nation and tax year, each with
 * its scale points and salary range. Both args required; an absent
 * combination throws `ScaleUnavailable`.
 */
export function getDentalScales(
  year: TaxYear,
  nation: Nation,
): DentalGradeMeta[] {
  return resolveGradeMetas(
    DENTAL_SCALES, DENTAL_GRADE_IDS, year, nation,
  );
}
