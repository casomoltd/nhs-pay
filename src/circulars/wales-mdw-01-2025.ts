/**
 * Verbatim transcription of NHS Wales Pay Circular M&D(W) 01/2025 —
 * "Terms and Conditions of Service of Hospital and Public Health
 * Medical and Dental Staff and Community Doctors (Wales)". Effective
 * 1 April 2025 (Wales's 2026/27 M&D circular is not yet published, so
 * this is its latest cited year).
 *
 * Mirrors Annex A section by section. Scope: (a) every basic-pay
 * salary scale incl. closed grades; (b) earnings supplements as annual
 * £ (DPH supplement, Clinical Excellence/Impact awards, intensity
 * supplements, waiting-list initiative, dental training supplement).
 * Every other table is recorded with a reason.
 *
 * Public source: NHS Wales — Pay & Conditions, M&D(W) 01/2025,
 *   https://www.nhs.wales/hpb/nhs-pay-and-conditions/
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

export const WALES_MDW_01_2025 = {
  circular: 'NHS Wales M&D(W) 01/2025',
  nation: 'wales',
  effectiveFrom: '2025-04-01',

  // ══ Annex A §1a — Consultant basic salary (p3) ══
  // Payroll codes ZM81/ZK81/ZL81/ZC81-NN; ZM81 quoted below.
  consultant: [
    {threshold: 'Min', yearCompleted: 0,  salary: 110240, code: 'ZM81-01'},
    {threshold: '1',   yearCompleted: 1,  salary: 115752, code: 'ZM81-02'},
    {threshold: '2',   yearCompleted: 2,  salary: 121264, code: 'ZM81-03'},
    {threshold: '3',   yearCompleted: 3,  salary: 126776, code: 'ZM81-04'},
    {threshold: '4',   yearCompleted: 4,  salary: 135596, code: 'ZM81-05'},
    {threshold: '4',   yearCompleted: 5,  salary: 135596, code: 'ZM81-06'},
    {threshold: '4',   yearCompleted: 6,  salary: 135596, code: 'ZM81-07'},
    {threshold: '4',   yearCompleted: 7,  salary: 135596, code: 'ZM81-08'},
    {threshold: '4',   yearCompleted: 8,  salary: 135596, code: 'ZM81-09'},
    {threshold: '5',   yearCompleted: 9,  salary: 143312, code: 'ZM81-10'},
    {threshold: '5',   yearCompleted: 10, salary: 143312, code: 'ZM81-11'},
    {threshold: '5',   yearCompleted: 11, salary: 143312, code: 'ZM81-12'},
    {threshold: '5',   yearCompleted: 12, salary: 143312, code: 'ZM81-13'},
    {threshold: '5',   yearCompleted: 13, salary: 143312, code: 'ZM81-14'},
    {threshold: '5',   yearCompleted: 14, salary: 143312, code: 'ZM81-15'},
    {threshold: '5',   yearCompleted: 15, salary: 143312, code: 'ZM81-16'},
    {threshold: '6',   yearCompleted: 16, salary: 152132, code: 'ZM81-17'},
    {threshold: '6',   yearCompleted: 17, salary: 152132, code: 'ZM81-18'},
    {threshold: '6',   yearCompleted: 18, salary: 152132, code: 'ZM81-19'},
    {threshold: '6',   yearCompleted: 19, salary: 152132, code: 'ZM81-20'},
    {threshold: '6',   yearCompleted: 20, salary: 152132, code: 'ZM81-21'},
    {threshold: '6',   yearCompleted: 21, salary: 152132, code: 'ZM81-22'},
    {threshold: '6',   yearCompleted: 22, salary: 152132, code: 'ZM81-23'},
    {threshold: '7',   yearCompleted: 23, salary: 160951, code: 'ZM81-24'},
  ] satisfies ConsultantRow[],

  // ══ Annex A §1b — Training grades (p5) ══
  // Salaries left→right: Min, 01…Nth incremental point.
  trainingGrades: [
    {
      grade: 'Specialty Registrar (Full)', code: 'MN37',
      salaries: [
        46324, 49046, 52853, 55157, 57929,
        60706, 63482, 66259, 69034, 71814,
      ],
    },
    {
      grade: 'Specialty Registrar (Core Training)', code: 'MN39',
      salaries: [46324, 49046, 52853, 55157, 57929, 60706],
    },
    {
      grade: 'Specialty Registrar (Fixed Term)', code: 'MN35',
      salaries: [46324, 49046, 52853, 55157, 57929, 60706],
    },
    {
      grade: 'Dental Core Training', code: 'MN21',
      salaries: [43670, 46441, 49148, 51887, 54625, 57364, 60102],
    },
    {
      grade: 'Foundation House Officer 2', code: 'MN15',
      salaries: [43466, 46192, 48915],
    },
    {
      grade: 'Foundation House Officer 1', code: 'MN13',
      salaries: [35390, 37487, 39587],
    },
  ] satisfies IncrementalScaleRow[],

  // ══ Annex A §1c — Closed pay scales (p6) ══
  closedGrades: [
    {
      grade: 'Associate Specialist', code: 'MC01',
      salaries: [
        57339, 63414, 69483, 75559, 81629, 87703, 95720,
        102670, 105555, 109317, 113079, 116842, 120606, 124374,
      ],
    },
    {
      grade: 'Staff Grade Practitioner', code: 'MH01',
      salaries: [51876, 55993, 60110, 64226, 68345, 72459, 76579, 80695],
    },
    {
      grade: 'Staff Grade Practitioner', code: 'MH03/05',
      salaries: [
        51876, 55993, 60110, 64226, 68345, 72459,
        76579, 80695, 84814, 88931, 93046, 97165,
      ],
    },
    {
      grade: 'Specialty Registrar (closed)', code: 'MN25',
      salaries: [
        47502, 49803, 52853, 55157, 57929,
        60706, 63482, 66259, 69034, 71814,
      ],
    },
    // Hospital Practitioners / Session — sessional / notional half-day.
    {
      grade: 'Hospital Practitioners / Session', code: 'MD01-41',
      salaries: [6760, 7154, 7548, 7938, 8330, 8720, 9110],
    },
  ] satisfies IncrementalScaleRow[],

  // ══ Annex A §2a — Specialty Doctor & Associate Specialist 2008 (closed, p6) ══
  specialtyDoctor2008: [
    {code: 'MC46-01', salary: 52306}, {code: 'MC46-02', salary: 56777},
    {code: 'MC46-03', salary: 62593}, {code: 'MC46-04', salary: 65708},
    {code: 'MC46-05', salary: 70195}, {code: 'MC46-06', salary: 74668},
    {code: 'MC46-07', salary: 74668}, {code: 'MC46-08', salary: 79239},
    {code: 'MC46-09', salary: 79239}, {code: 'MC46-10', salary: 83814},
    {code: 'MC46-11', salary: 83814}, {code: 'MC46-12', salary: 88389},
    {code: 'MC46-13', salary: 88389}, {code: 'MC46-14', salary: 88389},
    {code: 'MC46-15', salary: 92962}, {code: 'MC46-16', salary: 92962},
    {code: 'MC46-17', salary: 92962}, {code: 'MC46-18', salary: 97536},
  ] satisfies CodeRow[],
  associateSpecialist2008: [
    {code: 'MC41-01', salary: 76126}, {code: 'MC41-02', salary: 82245},
    {code: 'MC41-03', salary: 88362}, {code: 'MC41-04', salary: 96440},
    {code: 'MC41-05', salary: 103420}, {code: 'MC41-06', salary: 106347},
    {code: 'MC41-07', salary: 106347}, {code: 'MC41-08', salary: 110140},
    {code: 'MC41-09', salary: 110140}, {code: 'MC41-10', salary: 113931},
    {code: 'MC41-11', salary: 113931}, {code: 'MC41-12', salary: 117721},
    {code: 'MC41-13', salary: 117721}, {code: 'MC41-14', salary: 117721},
    {code: 'MC41-15', salary: 121514}, {code: 'MC41-16', salary: 121514},
    {code: 'MC41-17', salary: 121514}, {code: 'MC41-18', salary: 125308},
  ] satisfies CodeRow[],

  // ══ Annex A §2b — SAS 2021 contracts (p6) ══
  specialtyDoctor: [
    {code: 'MC75-01', yearsExperience: 0,  salary: 62117},
    {code: 'MC75-02', yearsExperience: 1,  salary: 62117},
    {code: 'MC75-03', yearsExperience: 2,  salary: 62117},
    {code: 'MC75-04', yearsExperience: 3,  salary: 71563},
    {code: 'MC75-05', yearsExperience: 4,  salary: 71563},
    {code: 'MC75-06', yearsExperience: 5,  salary: 71563},
    {code: 'MC75-07', yearsExperience: 6,  salary: 79777},
    {code: 'MC75-08', yearsExperience: 7,  salary: 79777},
    {code: 'MC75-09', yearsExperience: 8,  salary: 79777},
    {code: 'MC75-10', yearsExperience: 9,  salary: 88302},
    {code: 'MC75-11', yearsExperience: 10, salary: 88302},
    {code: 'MC75-12', yearsExperience: 11, salary: 88302},
    {code: 'MC75-13', yearsExperience: 12, salary: 99216},
    {code: 'MC75-14', yearsExperience: 13, salary: 99216},
    {code: 'MC75-15', yearsExperience: 14, salary: 99216},
    {code: 'MC75-16', yearsExperience: 15, salary: 99216},
    {code: 'MC75-17', yearsExperience: 16, salary: 99216},
    {code: 'MC75-18', yearsExperience: 17, salary: 99216},
  ] satisfies ExperienceRow[],
  specialist: [
    {code: 'MC70-01', yearsExperience: 0, salary: 100870},
    {code: 'MC70-02', yearsExperience: 1, salary: 100870},
    {code: 'MC70-03', yearsExperience: 2, salary: 100870},
    {code: 'MC70-04', yearsExperience: 3, salary: 104816},
    {code: 'MC70-05', yearsExperience: 4, salary: 104816},
    {code: 'MC70-06', yearsExperience: 5, salary: 104816},
    {code: 'MC70-07', yearsExperience: 6, salary: 111442},
  ] satisfies ExperienceRow[],

  // ══ Annex A §3 — DPH (Chief Officer) supplement — annual £ (p7) ══
  dphSupplement: [
    {band: 'A', min: 19644, max: 28513, exceptional: 0},
    {band: 'B', min: 7610,  max: 15229, exceptional: 19644},
    {band: 'C', min: 6364,  max: 12675, exceptional: 15229},
    {band: 'D', min: 5076,  max: 10142, exceptional: 12675},
  ],

  // ══ Annex A §4 — Awards & supplements — annual £ (p8) ══
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
    {band: 'Band 1 (low)', salary: 3191},
    {band: 'Band 2 (medium)', salary: 6376},
    {band: 'Band 3 (high)', salary: 9560},
  ],
  waitingListInitiative: 792,

  // ══ Annex A §5 — Salaried GP scale KP22 (p9) ══
  salariedGp: {
    code: 'KP22',
    salaries: [
      79123, 82806, 86669, 90719, 94952,
      99395, 104048, 108925, 114030, 119394,
    ],
  },

  // ══ Annex A §11 — Salaried Primary Dental Care Staff (2008) (p15) ══
  salariedDentalSpine: [
    {band: 'A', point: 1,  salary: 52821},
    {band: 'A', point: 2,  salary: 58693},
    {band: 'A', point: 3,  salary: 67494},
    {band: 'A', point: 4,  salary: 71895},
    {band: 'A', point: 5,  salary: 76297},
    {band: 'A', point: 6,  salary: 79232},
    {band: 'B', point: 7,  salary: 82164},
    {band: 'B', point: 8,  salary: 85098},
    {band: 'B', point: 9,  salary: 89500},
    {band: 'B', point: 10, salary: 91699},
    {band: 'B', point: 11, salary: 93902},
    {band: 'B', point: 12, salary: 96103},
    {band: 'C', point: 13, salary: 98306},
    {band: 'C', point: 14, salary: 101237},
    {band: 'C', point: 15, salary: 104171},
    {band: 'C', point: 16, salary: 107107},
    {band: 'C', point: 17, salary: 110041},
    {band: 'C', point: 18, salary: 112974},
  ] satisfies SpineRow[],

  // ══ Annex A §12 — Dental supplements — annual £ (p16) ══
  dentalTrainingSupplement: 2732,
  dentalIndicativeTrainingAllowance: 1072,

  // RECORDED, not transcribed:
  //  · §6 Emergency Rota Allowance (CMO/SCMO) (p9) — rate per half-year by
  //    number of duties; rota-frequency add-on, not base pay.
  //  · §12 Dental Foundation Trainee (DFT) salary £44,448 (£3,704/month) —
  //    set by the GDS SFE, "for information only".
  //  · §7 Other fees & allowances (p10); §8 Transport (p11); §9 Locum
  //    tenens (p12) — item/session fees, mileage, locum day rates.
  //  · §10 Family planning fees & miscellaneous (p14) — procedure fees.
  //  · Annex B Banding supplements & total salaries — rota-banding
  //    multipliers (No band … Band 3 ×2.0) of the basic scales above.
} as const;
