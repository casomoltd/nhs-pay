/**
 * Verbatim transcription of NHS Wales Pay Circular M&D(W) 01/2026
 * (Version 2, 05 May 2026) — "Terms and Conditions of Service of
 * Hospital and Public Health Medical and Dental Staff and Community
 * Doctors (Wales)". Effective 1 April 2026 (2026/27). A 3.5% uplift to
 * basic pay across consultants, residents, dentists, SAS (2008 & 2021)
 * and salaried GPs; consultant awards (CEA/CIA) unchanged.
 *
 * Mirrors Annex A section by section, same scope policy as the 2025
 * circular: (a) every basic-pay salary scale incl. closed grades; (b)
 * earnings supplements as annual £. Two structural changes vs 2025:
 *   · the Associate Specialist pay code MC01 is REMOVED (payroll review
 *     found no employees on it) — so it is absent from the closed grades;
 *   · a NEW §1c "2026 Resident Contract" (nodal spine, effective from
 *     1 Aug 2026) is transcribed below as `resident2026Contract` but not
 *     yet wired into the translation layer — the §1b training grades
 *     remain the live, uplifted resident scales for 2026/27.
 *
 * Public source: NHS Wales — Pay & Conditions, M&D(W) 01/2026 (direct PDF),
 *   https://www.nhs.wales/files/pc-resources/md-w-0126-pay-award-02-04-26-version-2/
 */

interface ConsultantRow {
  threshold: string;
  yearCompleted: number;
  salary: number;
  code: string;
}
interface IncrementalScaleRow {
  grade: string;
  code: string;
  salaries: readonly number[];
}
interface CodeRow {
  code: string;
  salary: number;
}
interface ExperienceRow {
  code: string;
  yearsExperience: number;
  salary: number;
}
interface SpineRow {
  band: 'A' | 'B' | 'C';
  point: number;
  salary: number;
}
interface Resident2026Row {
  grade: string;
  spine: number | null;
  salary: number;
}

export const WALES_MDW_01_2026 = {
  circular: 'NHS Wales M&D(W) 01/2026',
  nation: 'wales',
  effectiveFrom: '2026-04-01',

  // ══ Annex A §1a — Consultant basic salary (p3-4) ══
  // Payroll codes ZM81/ZK81/ZL81/ZC81-NN; ZM81 quoted below.
  consultant: [
    {threshold: 'Min', yearCompleted: 0,  salary: 114099, code: 'ZM81-01'},
    {threshold: '1',   yearCompleted: 1,  salary: 119804, code: 'ZM81-02'},
    {threshold: '2',   yearCompleted: 2,  salary: 125509, code: 'ZM81-03'},
    {threshold: '3',   yearCompleted: 3,  salary: 131214, code: 'ZM81-04'},
    {threshold: '4',   yearCompleted: 4,  salary: 140342, code: 'ZM81-05'},
    {threshold: '4',   yearCompleted: 5,  salary: 140342, code: 'ZM81-06'},
    {threshold: '4',   yearCompleted: 6,  salary: 140342, code: 'ZM81-07'},
    {threshold: '4',   yearCompleted: 7,  salary: 140342, code: 'ZM81-08'},
    {threshold: '4',   yearCompleted: 8,  salary: 140342, code: 'ZM81-09'},
    {threshold: '5',   yearCompleted: 9,  salary: 148328, code: 'ZM81-10'},
    {threshold: '5',   yearCompleted: 10, salary: 148328, code: 'ZM81-11'},
    {threshold: '5',   yearCompleted: 11, salary: 148328, code: 'ZM81-12'},
    {threshold: '5',   yearCompleted: 12, salary: 148328, code: 'ZM81-13'},
    {threshold: '5',   yearCompleted: 13, salary: 148328, code: 'ZM81-14'},
    {threshold: '5',   yearCompleted: 14, salary: 148328, code: 'ZM81-15'},
    {threshold: '5',   yearCompleted: 15, salary: 148328, code: 'ZM81-16'},
    {threshold: '6',   yearCompleted: 16, salary: 157457, code: 'ZM81-17'},
    {threshold: '6',   yearCompleted: 17, salary: 157457, code: 'ZM81-18'},
    {threshold: '6',   yearCompleted: 18, salary: 157457, code: 'ZM81-19'},
    {threshold: '6',   yearCompleted: 19, salary: 157457, code: 'ZM81-20'},
    {threshold: '6',   yearCompleted: 20, salary: 157457, code: 'ZM81-21'},
    {threshold: '6',   yearCompleted: 21, salary: 157457, code: 'ZM81-22'},
    {threshold: '6',   yearCompleted: 22, salary: 157457, code: 'ZM81-23'},
    {threshold: '7',   yearCompleted: 23, salary: 166585, code: 'ZM81-24'},
  ] satisfies ConsultantRow[],

  // ══ Annex A §1b — Training grades (p5) ══
  // The Framework Agreement transitional scales — closed to new entrants
  // from Aug 2026 but still uplifted each year. Salaries left→right:
  // Min, 01…Nth incremental point.
  trainingGrades: [
    {
      grade: 'Specialty Registrar (Full)', code: 'MN37',
      salaries: [
        47946, 50763, 54703, 57088, 59957,
        62831, 65704, 68579, 71451, 74328,
      ],
    },
    {
      grade: 'Specialty Registrar (Core Training)', code: 'MN39',
      salaries: [47946, 50763, 54703, 57088, 59957, 62831],
    },
    {
      grade: 'Specialty Registrar (Fixed Term)', code: 'MN35',
      salaries: [47946, 50763, 54703, 57088, 59957, 62831],
    },
    {
      grade: 'Dental Core Training', code: 'MN21',
      salaries: [45199, 48036, 50869, 53704, 56537, 59372, 62206],
    },
    {
      grade: 'Foundation House Officer 2', code: 'MN15',
      salaries: [44988, 47809, 50628],
    },
    {
      grade: 'Foundation House Officer 1', code: 'MN13',
      salaries: [36629, 38800, 40973],
    },
  ] satisfies IncrementalScaleRow[],

  // ══ Annex A §1c — 2026 Resident Contract (p6) ══
  // NEW nodal-spine scale (Terms and Conditions of Service of Resident
  // Doctors and Dentists (Wales) 2026), residents transition onto it from
  // 1 Aug 2026. Uplifted 2026/27 pay values. Recorded, not yet wired —
  // the §1b training grades remain the live resident scales this year.
  resident2026Contract: [
    {grade: 'F1', spine: 1, salary: 41400},
    {grade: 'F2', spine: 1, salary: 51750},
    {grade: 'Dental Foundation Trainee', spine: null, salary: 48625},
    {grade: 'Registrar', spine: 1, salary: 56925},
    {grade: 'Registrar', spine: 2, salary: 64170},
    {grade: 'Registrar', spine: 3, salary: 70380},
    {grade: 'Registrar', spine: 4, salary: 76590},
    {grade: 'Registrar', spine: 5, salary: 80730},
  ] satisfies Resident2026Row[],

  // ══ Annex A §1d — Closed pay scales (p7) ══
  // Associate Specialist MC01 removed in this circular (no employees on
  // it), so it is absent here — unlike the 2025 circular.
  closedGrades: [
    {
      grade: 'Staff Grade Practitioner', code: 'MH01',
      salaries: [53692, 57953, 62214, 66474, 70738, 74996, 79260, 83520],
    },
    {
      grade: 'Staff Grade Practitioner', code: 'MH03/05',
      salaries: [
        53692, 57953, 62214, 66474, 70738, 74996,
        79260, 83520, 87783, 92044, 96303, 100566,
      ],
    },
    {
      grade: 'Specialty Registrar (closed)', code: 'MN25',
      salaries: [
        49941, 52323, 54703, 57088, 59957,
        62831, 65704, 68579, 71451, 74328,
      ],
    },
    // Hospital Practitioners / Session — sessional / notional half-day.
    {
      grade: 'Hospital Practitioners / Session', code: 'MD01-41',
      salaries: [6997, 7405, 7813, 8216, 8622, 9026, 9429],
    },
  ] satisfies IncrementalScaleRow[],

  // ══ Annex A §2a — Specialty Doctor & Associate Specialist 2008 (closed, p6) ══
  specialtyDoctor2008: [
    {code: 'MC46-01', salary: 54137}, {code: 'MC46-02', salary: 58765},
    {code: 'MC46-03', salary: 64784}, {code: 'MC46-04', salary: 68008},
    {code: 'MC46-05', salary: 72652}, {code: 'MC46-06', salary: 77282},
    {code: 'MC46-07', salary: 77282}, {code: 'MC46-08', salary: 82013},
    {code: 'MC46-09', salary: 82013}, {code: 'MC46-10', salary: 86748},
    {code: 'MC46-11', salary: 86748}, {code: 'MC46-12', salary: 91483},
    {code: 'MC46-13', salary: 91483}, {code: 'MC46-14', salary: 91483},
    {code: 'MC46-15', salary: 96216}, {code: 'MC46-16', salary: 96216},
    {code: 'MC46-17', salary: 96216}, {code: 'MC46-18', salary: 100950},
  ] satisfies CodeRow[],
  associateSpecialist2008: [
    {code: 'MC41-01', salary: 78791}, {code: 'MC41-02', salary: 85124},
    {code: 'MC41-03', salary: 91455}, {code: 'MC41-04', salary: 99816},
    {code: 'MC41-05', salary: 107040}, {code: 'MC41-06', salary: 110070},
    {code: 'MC41-07', salary: 110070}, {code: 'MC41-08', salary: 113995},
    {code: 'MC41-09', salary: 113995}, {code: 'MC41-10', salary: 117919},
    {code: 'MC41-11', salary: 117919}, {code: 'MC41-12', salary: 121842},
    {code: 'MC41-13', salary: 121842}, {code: 'MC41-14', salary: 121842},
    {code: 'MC41-15', salary: 125767}, {code: 'MC41-16', salary: 125767},
    {code: 'MC41-17', salary: 125767}, {code: 'MC41-18', salary: 129694},
  ] satisfies CodeRow[],

  // ══ Annex A §2b — SAS 2021 contracts (p6) ══
  specialtyDoctor: [
    {code: 'MC75-01', yearsExperience: 0,  salary: 64292},
    {code: 'MC75-02', yearsExperience: 1,  salary: 64292},
    {code: 'MC75-03', yearsExperience: 2,  salary: 64292},
    {code: 'MC75-04', yearsExperience: 3,  salary: 74068},
    {code: 'MC75-05', yearsExperience: 4,  salary: 74068},
    {code: 'MC75-06', yearsExperience: 5,  salary: 74068},
    {code: 'MC75-07', yearsExperience: 6,  salary: 82570},
    {code: 'MC75-08', yearsExperience: 7,  salary: 82570},
    {code: 'MC75-09', yearsExperience: 8,  salary: 82570},
    {code: 'MC75-10', yearsExperience: 9,  salary: 91393},
    {code: 'MC75-11', yearsExperience: 10, salary: 91393},
    {code: 'MC75-12', yearsExperience: 11, salary: 91393},
    {code: 'MC75-13', yearsExperience: 12, salary: 102689},
    {code: 'MC75-14', yearsExperience: 13, salary: 102689},
    {code: 'MC75-15', yearsExperience: 14, salary: 102689},
    {code: 'MC75-16', yearsExperience: 15, salary: 102689},
    {code: 'MC75-17', yearsExperience: 16, salary: 102689},
    {code: 'MC75-18', yearsExperience: 17, salary: 102689},
  ] satisfies ExperienceRow[],
  specialist: [
    {code: 'MC70-01', yearsExperience: 0, salary: 104401},
    {code: 'MC70-02', yearsExperience: 1, salary: 104401},
    {code: 'MC70-03', yearsExperience: 2, salary: 104401},
    {code: 'MC70-04', yearsExperience: 3, salary: 108485},
    {code: 'MC70-05', yearsExperience: 4, salary: 108485},
    {code: 'MC70-06', yearsExperience: 5, salary: 108485},
    {code: 'MC70-07', yearsExperience: 6, salary: 115343},
  ] satisfies ExperienceRow[],

  // ══ Annex A §3 — DPH (Chief Officer) supplement — annual £ (p7) ══
  dphSupplement: [
    {band: 'A', min: 20332, max: 29511, exceptional: 0},
    {band: 'B', min: 7877,  max: 15763, exceptional: 20332},
    {band: 'C', min: 6587,  max: 13119, exceptional: 15763},
    {band: 'D', min: 5254,  max: 10497, exceptional: 13119},
  ],

  // ══ Annex A §4 — Awards & supplements — annual £ (p8) ══
  // CEA & CIA unchanged from 2025 (circular: no change to consultant
  // award values); intensity supplements & waiting-list uplifted 3.5%.
  clinicalExcellenceAwards: [
    {level: 'Level 9 (Bronze)', salary: 36924},
    {level: 'Level 10 (Silver)', salary: 48533},
    {level: 'Level 11 (Gold)', salary: 60666},
    {level: 'Level 12 (Platinum)', salary: 78866},
  ],
  clinicalImpactAwards: [
    {level: 'N0', salary: 10500}, {level: 'N1', salary: 21000},
    {level: 'N2', salary: 31500}, {level: 'N3', salary: 42000},
  ],
  intensitySupplements: [
    {band: 'Band 1 (low)', salary: 3303},
    {band: 'Band 2 (medium)', salary: 6600},
    {band: 'Band 3 (high)', salary: 9895},
  ],
  waitingListInitiative: 820,

  // ══ Annex A §5 — Salaried GP scale KP22 (p9) ══
  salariedGp: {
    code: 'KP22',
    salaries: [
      81893, 85705, 89703, 93895, 98276,
      102874, 107690, 112738, 118022, 123573,
    ],
  },

  // ══ Annex A §11 — Salaried Primary Dental Care Staff (2008) (p7 of the
  //    dental section) ══
  salariedDentalSpine: [
    {band: 'A', point: 1,  salary: 54802},
    {band: 'A', point: 2,  salary: 60894},
    {band: 'A', point: 3,  salary: 70026},
    {band: 'A', point: 4,  salary: 74592},
    {band: 'A', point: 5,  salary: 79159},
    {band: 'A', point: 6,  salary: 82204},
    {band: 'B', point: 7,  salary: 85246},
    {band: 'B', point: 8,  salary: 88290},
    {band: 'B', point: 9,  salary: 92857},
    {band: 'B', point: 10, salary: 95138},
    {band: 'B', point: 11, salary: 97424},
    {band: 'B', point: 12, salary: 99707},
    {band: 'C', point: 13, salary: 101993},
    {band: 'C', point: 14, salary: 105034},
    {band: 'C', point: 15, salary: 108078},
    {band: 'C', point: 16, salary: 111124},
    {band: 'C', point: 17, salary: 114168},
    {band: 'C', point: 18, salary: 117211},
  ] satisfies SpineRow[],

  // ══ Annex A §12 — Dental supplements — annual £ (p8 of the dental
  //    section) ══
  dentalTrainingSupplement: 2828,
  dentalIndicativeTrainingAllowance: 1100,

  // RECORDED, not transcribed:
  //  · §6 Emergency Rota Allowance (CMO/SCMO) (p9) — rate per half-year by
  //    number of duties; rota-frequency add-on, not base pay.
  //  · §7 Other fees & allowances (p10); §8 Transport (p11); §9 Locum
  //    tenens (p12) — item/session fees, mileage, locum day/weekly rates
  //    (incl. Locum Consultant ZC82 £125,509).
  //  · §10 Family planning fees & miscellaneous (p6 of that section) —
  //    procedure fees.
  //  · Annex B Banding supplements & total salaries (2002 resident
  //    contract, closed from Aug 2026) — rota-banding multipliers
  //    (No band … Band 3 ×2.0) of the basic scales above.
} as const;
