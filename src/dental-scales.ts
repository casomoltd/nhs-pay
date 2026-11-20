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

import type {Nation, PayYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, YEAR_LABELS} from '@casomoltd/paye-calc';
import type {
  GradeFamily, GradeMeta, GradeScale, GradeScaleTables,
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
  combineScales,
  fromDocument,
  gradeFamily,
} from './scale-tables.js';
import {
  byCode,
  byStage,
  bySpine,
  numbered,
  salariesOfCode,
  scaleSalaries,
  stepped,
} from './scale-translators.js';
import {invariant} from './errors.js';
import {DENTAL_GRADE_IDS} from './dental-grades.js';
import type {DentalGradeId} from './dental-grades.js';
import {
  ENGLAND_MD_1_2026_R2 as ENG,
  ENGLAND_MD_1_2026_R2_CODES as ENG_CODES,
} from './circulars/england-md-1-2026-r2.js';
import {SCOTLAND_PCS_DD_2026_01 as SCO} from './circulars/scotland-pcs-dd-2026-01.js';
import {SCOTLAND_PCS_DD_2025_01 as SCO25} from './circulars/scotland-pcs-dd-2025-01.js';
import {SCOTLAND_PCS_DD_2026_02 as SCO2} from './circulars/scotland-pcs-dd-2026-02.js';
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

/** A dental grade's scale points in a nation/year, with its range. */
export type DentalGradeMeta = GradeMeta<DentalGradeId>;

type NationScales = Partial<Record<DentalGradeId, GradeScale>>;

// England §1 dentists in training: CT1-3 = core, ST1-8 = specialty, told
// apart by the stage each row prints.
const engDentists = ENG.dentistsInTraining;
/** The printed stage prefixes of the two kinds of dental training row. */
const TRAINING_STAGE = {core: 'CT', specialty: 'ST'} as const;
type TrainingStage = (typeof TRAINING_STAGE)[keyof typeof TRAINING_STAGE];
const trainingRows = (prefix: TrainingStage) =>
  engDentists.filter((r) => r.stage.startsWith(prefix));

/** The bands Northern Ireland's salaried dental table numbers. */
const NI_DENTAL_BANDS = {
  salaried: 1, senior: 2, assistantDirector: 3, clinicalDirector: 4,
} as const;

type NiDentalBand = (typeof NI_DENTAL_BANDS)[keyof typeof NI_DENTAL_BANDS];

// The England spine prints the band in its pay-scale code (LD01/11/21),
// not a band column; map the code to the band so a relabelled boundary
// stays correct (matches Wales's explicit "Band X Point N" labels).
type SpineCode = (typeof ENG_CODES)[
  'salariedDentalBandA' | 'salariedDentalBandB' | 'salariedDentalBandC'
];
/** The bands England's salaried dental spine is printed in. */
const SPINE_BANDS = {a: 'A', b: 'B', c: 'C'} as const;
type SpineBand = (typeof SPINE_BANDS)[keyof typeof SPINE_BANDS];
const LD_BAND: Readonly<Record<SpineCode, SpineBand>> = {
  [ENG_CODES.salariedDentalBandA]: SPINE_BANDS.a,
  [ENG_CODES.salariedDentalBandB]: SPINE_BANDS.b,
  [ENG_CODES.salariedDentalBandC]: SPINE_BANDS.c,
};
const isSpineCode = (code: string): code is SpineCode =>
  Object.hasOwn(LD_BAND, code);
const ldBand = (code: string): SpineBand => {
  if (!isSpineCode(code)) {
    throw new Error(`dental-scales: unknown spine code "${code}"`);
  }
  return LD_BAND[code];
};

// Every training row is core or specialty training by its printed stage,
// so a row with another stage fails at load rather than going unread.
invariant(engDentists.every((r) => Object.values(TRAINING_STAGE)
  .some((prefix) => r.stage.startsWith(prefix))),
'dental-scales: a dentists-in-training stage is neither core nor specialty');

// Both ways: every row's code is a band (`ldBand`), and every band's code
// is printed on some row, so a code the circular drops fails at load.
for (const code of Object.keys(LD_BAND)) {
  invariant(ENG.salariedDentalSpine.some((r) => r.code === code),
    `dental-scales: England's dental spine prints no ${code} row`);
}

const england2026: NationScales = fromDocument<DentalGradeId>(PC_MD_1_2026_R2, {
  'salaried-dental': bySpine(ENG.salariedDentalSpine.map((r) => ({
    band: ldBand(r.code), point: r.point, salary: r.salary,
  }))),
  'dental-core-training': byStage(trainingRows(TRAINING_STAGE.core)),
  'dental-specialty-training': byStage(trainingRows(TRAINING_STAGE.specialty)),
  'dental-educator': byCode(ENG.dentalEducators),
});

// The Public Dental Service spine comes from PCS(DD)2026/02 Annex G,
// uplifted 3.75% (its para 3) rather than the 3.5% the rest of that
// circular carries; dental core training from PCS(DD)2026/01.
const scotland2026: NationScales = combineScales(
  fromDocument<DentalGradeId>(PCS_DD_2026_02, {
    'salaried-dental': bySpine(SCO2.salariedDentalSpine),
  }),
  fromDocument<DentalGradeId>(PCS_DD_2026_01, {
    'dental-core-training': byStage([SCO.dentalCoreTraining]),
  }),
);

const wales2025: NationScales = fromDocument<DentalGradeId>(MD_W_01_2025, {
  'salaried-dental': bySpine(WAL.salariedDentalSpine),
  'dental-core-training': stepped(
    salariesOfCode(WAL.trainingGrades, WAL_CODES.dentalCoreTraining),
  ),
});

const northernIreland2025: NationScales = fromDocument<DentalGradeId>(HSC_TC8_05_2025, {
  'salaried-dentist': niDentalBand(NI_DENTAL_BANDS.salaried),
  'senior-salaried-dentist': niDentalBand(NI_DENTAL_BANDS.senior),
  'assistant-clinical-director-dentist':
    niDentalBand(NI_DENTAL_BANDS.assistantDirector),
  'clinical-director-dentist': niDentalBand(NI_DENTAL_BANDS.clinicalDirector),
  'dental-core-training': stepped(
    salariesOfCode(NI.residentGrades, NI_CODES.coreTraining),
  ),
  'community-dental-officer': numbered(
    salariesOfCode(NI.communityDentalService, NI_CODES.communityDentalOfficer),
  ),
  'senior-community-dental-officer': numbered(
    salariesOfCode(NI.communityDentalService, NI_CODES.seniorCommunityDentalOfficer),
  ),
  'assistant-community-dental-clinical-director': numbered(
    salariesOfCode(NI.communityDentalService,
      NI_CODES.assistantCommunityDentalClinicalDirector),
  ),
  'specialist-community-dentist': numbered(
    salariesOfCode(NI.communityDentalService, NI_CODES.specialistCommunityDentist),
  ),
  'community-dental-clinical-director': numbered(
    salariesOfCode(NI.communityDentalService, NI_CODES.communityDentalClinicalDirector),
  ),
});

// Wales 2026/27 — salaried dental spine + dental core training, uplifted.
const wales2026: NationScales = fromDocument<DentalGradeId>(MD_W_01_2026, {
  'salaried-dental': bySpine(WAL26.salariedDentalSpine),
  'dental-core-training': stepped(
    salariesOfCode(WAL26.trainingGrades, WAL26_CODES.dentalCoreTraining),
  ),
});

// Scotland 2025/26 — the Public Dental Service spine (Annex G) and dental
// core training (addendum).
const scotland2025: NationScales = combineScales(
  fromDocument<DentalGradeId>(PCS_DD_2025_01, {
    'salaried-dental': bySpine(SCO25.salariedDentalSpine),
  }),
  fromDocument<DentalGradeId>(PCS_DD_2025_01_ADDENDUM, {
    'dental-core-training': byStage([SCO25.dentalCoreTraining]),
  }),
);

const DENTAL_SCALES: GradeScaleTables<DentalGradeId> = {
  [YEAR_LABELS.Y2026_27]: {
    [NATION_KEYS.england]: england2026,
    [NATION_KEYS.scotland]: scotland2026,
    [NATION_KEYS.wales]: wales2026,
  },
  [YEAR_LABELS.Y2025_26]: {
    [NATION_KEYS.wales]: wales2025,
    [NATION_KEYS.northernIreland]: northernIreland2025,
    [NATION_KEYS.scotland]: scotland2025,
  },
};

/** Every read over the dental tables. */
export const DENTAL_FAMILY: GradeFamily<DentalGradeId> =
  gradeFamily(DENTAL_SCALES, DENTAL_GRADE_IDS);

/** Pay years this family publishes, newest first (derived from data). */
export const DENTAL_PAY_YEARS: readonly PayYear[] = DENTAL_FAMILY.years;

/**
 * Published salaried dental grades for a nation and pay year, each with
 * its scale points and salary range. Both args required; an absent
 * combination throws `ScaleUnavailable`.
 */
export function getDentalScales(
  year: PayYear,
  nation: Nation,
): DentalGradeMeta[] {
  return DENTAL_FAMILY.scalesFor(year, nation);
}

/** One band of Northern Ireland's salaried dental table, by number. */
function niDentalBand(band: NiDentalBand): ReturnType<typeof numbered> {
  return numbered(scaleSalaries(
    NI.salariedDental, (g) => g.band === band, `NI dental band ${band}`));
}
