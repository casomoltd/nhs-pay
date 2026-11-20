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
  salariesOfCode,
  scaleSalaries,
  stepped,
} from './scale-tables.js';
import {DENTAL_GRADE_IDS} from './dental-grades.js';
import type {DentalGradeId} from './dental-grades.js';
import {ENGLAND_MD_1_2026_R2 as ENG} from './circulars/england-md-1-2026-r2.js';
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

// England §1 dentists in training: CT1-3 = core, ST1-8 = specialty.
const engDentists = ENG.dentistsInTraining;
/** England's dentists-in-training table opens with the dental core
 *  training stages; the rows after them are specialty training. */
const CORE_TRAINING_ROWS = 3;

/** The bands Northern Ireland's salaried dental table numbers. */
const NI_DENTAL_BANDS = {
  salaried: 1, senior: 2, assistantDirector: 3, clinicalDirector: 4,
} as const;

type NiDentalBand = (typeof NI_DENTAL_BANDS)[keyof typeof NI_DENTAL_BANDS];


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
  'dental-core-training': byStage(engDentists.slice(0, CORE_TRAINING_ROWS)),
  'dental-specialty-training': byStage(engDentists.slice(CORE_TRAINING_ROWS)),
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
    salariesOfCode(WAL.trainingGrades, WAL_CODES.dentalCoreTraining),
  ),
});

const northernIreland: NationScales = fromDocument<DentalGradeId>(HSC_TC8_05_2025, {
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
    'dental-core-training': [
      {label: SCO25.dentalCoreTraining.stage, salary: SCO25.dentalCoreTraining.salary},
    ],
  }),
);

const DENTAL_SCALES: GradeScaleTables<DentalGradeId> = {
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

/** Pay years this family publishes, newest first (derived from data). */
export const DENTAL_PAY_YEARS: readonly PayYear[] = (
  Object.keys(DENTAL_SCALES) as PayYear[]
).sort((a, b) => b.localeCompare(a));

/**
 * Published salaried dental grades for a nation and pay year, each with
 * its scale points and salary range. Both args required; an absent
 * combination throws `ScaleUnavailable`.
 */
export function getDentalScales(
  year: PayYear,
  nation: Nation,
): DentalGradeMeta[] {
  return resolveGradeMetas(
    DENTAL_SCALES, DENTAL_GRADE_IDS, year, nation,
  );
}

/** One band of Northern Ireland's salaried dental table, by number. */
function niDentalBand(band: NiDentalBand): ReturnType<typeof numbered> {
  return numbered(scaleSalaries(
    NI.salariedDental, (g) => g.band === band, `NI dental band ${band}`));
}
