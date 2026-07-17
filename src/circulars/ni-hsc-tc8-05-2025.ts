/**
 * Verbatim transcription of DoH Northern Ireland Pay & Conditions
 * Circular HSC(TC8) 05/2025 — "Remuneration of Hospital Medical and
 * Dental Staff, Doctors and Dentists in Public Health, the Community
 * Health Service and Salaried Dental and Community Dental Staff (NI)".
 * Effective 1 April 2025 (NI's 2026/27 M&D circular is not yet
 * published, so this is its latest cited year).
 *
 * Mirrors Annex A section by section. Scope: (a) every basic-pay
 * salary scale incl. §9 grades closed to new entrants; (b) earnings
 * supplements as annual £ (Clinical Excellence awards, discretionary
 * points, distinction awards, DPH supplement). Every other table is
 * recorded with a reason. NI's minimum pay point on each scale is
 * "pay point 1" (para 8).
 *
 * Public source: DoH NI — HSC(TC8) 05/2025 (direct PDF),
 *   https://www.health-ni.gov.uk/sites/default/files/2025-12/HSC%20%28TC8%29%2005%202025%20-%20Pay%20and%20Conditions%20of%20Service%20for%20Hospital%20Medical%20and%20Dental%20Staff.PDF
 */

interface IncrementalScaleRow {
  grade: string;
  code: string;
  salaries: readonly number[];
}
interface ExperienceRow {
  yearsExperience: number;
  payPoint: number;
  salary: number;
}
interface ThresholdRow {
  payPoint: number;
  threshold: number;
  salary: number;
}
interface DentalScaleRow {
  grade: string;
  band: number;
  code: string;
  salaries: readonly number[];
}
interface CodeRow {
  code: string;
  salary: number;
}

export const NI_HSC_TC8_05_2025 = {
  circular: 'DoH NI HSC(TC8) 05/2025',
  nation: 'northern-ireland',
  effectiveFrom: '2025-04-01',

  // ══ §1 — Resident Doctors & Dentists (2002 contract) (p2) ══
  // Salaries left→right: step 1 (minimum) … step N.
  residentGrades: [
    {
      grade: 'Foundation House Officer 1', code: 'M220',
      salaries: [35704, 37733, 39758],
    },
    {
      grade: 'Foundation House Officer 2', code: 'M230',
      salaries: [43510, 46142, 48779],
    },
    {
      grade: 'Specialty Registrar (FT)', code: 'M240',
      salaries: [46274, 48910, 52585, 54812, 57495, 60179],
    },
    {
      grade: 'Specialty Registrar (Full)', code: 'M241',
      salaries: [
        46274, 48910, 52585, 54812, 57495,
        60179, 62862, 65546, 68230, 70914,
      ],
    },
    {
      grade: 'Specialty Registrar (CT/DCT)', code: 'M242',
      salaries: [46274, 48910, 52585, 54812, 57495, 60179],
    },
  ] satisfies IncrementalScaleRow[],

  // ══ §2 — Specialty Doctor (2021 contract), code M315 (p10) ══
  // One row per year of experience, grouped into pay points 1-5.
  specialtyDoctor: [
    {yearsExperience: 1,  payPoint: 1, salary: 61542},
    {yearsExperience: 2,  payPoint: 1, salary: 61542},
    {yearsExperience: 3,  payPoint: 1, salary: 61542},
    {yearsExperience: 4,  payPoint: 2, salary: 70901},
    {yearsExperience: 5,  payPoint: 2, salary: 70901},
    {yearsExperience: 6,  payPoint: 2, salary: 70901},
    {yearsExperience: 7,  payPoint: 3, salary: 79038},
    {yearsExperience: 8,  payPoint: 3, salary: 79038},
    {yearsExperience: 9,  payPoint: 3, salary: 79038},
    {yearsExperience: 10, payPoint: 4, salary: 87486},
    {yearsExperience: 11, payPoint: 4, salary: 87486},
    {yearsExperience: 12, payPoint: 4, salary: 87486},
    {yearsExperience: 13, payPoint: 5, salary: 99216},
    {yearsExperience: 14, payPoint: 5, salary: 99216},
    {yearsExperience: 15, payPoint: 5, salary: 99216},
    {yearsExperience: 16, payPoint: 5, salary: 99216},
    {yearsExperience: 17, payPoint: 5, salary: 99216},
    {yearsExperience: 18, payPoint: 5, salary: 99216},
  ] satisfies ExperienceRow[],

  // ══ §3 — Specialist (2021 contract), code M390 (p11) ══
  specialist: [
    {yearsExperience: 1, payPoint: 1, salary: 100870},
    {yearsExperience: 2, payPoint: 1, salary: 100870},
    {yearsExperience: 3, payPoint: 1, salary: 100870},
    {yearsExperience: 4, payPoint: 2, salary: 104816},
    {yearsExperience: 5, payPoint: 2, salary: 104816},
    {yearsExperience: 6, payPoint: 2, salary: 104816},
    {yearsExperience: 7, payPoint: 3, salary: 111442},
  ] satisfies ExperienceRow[],

  // ══ §4 — Consultant (2004 contract), code M400 (p12) ══
  // One row per pay point, grouped into thresholds 1-5.
  consultant: [
    {payPoint: 1,  threshold: 1, salary: 110681},
    {payPoint: 2,  threshold: 1, salary: 110681},
    {payPoint: 3,  threshold: 1, salary: 110681},
    {payPoint: 4,  threshold: 2, salary: 116193},
    {payPoint: 5,  threshold: 3, salary: 119501},
    {payPoint: 6,  threshold: 3, salary: 119501},
    {payPoint: 7,  threshold: 3, salary: 119501},
    {payPoint: 8,  threshold: 3, salary: 119501},
    {payPoint: 9,  threshold: 4, salary: 131076},
    {payPoint: 10, threshold: 4, salary: 131076},
    {payPoint: 11, threshold: 4, salary: 131076},
    {payPoint: 12, threshold: 4, salary: 131076},
    {payPoint: 13, threshold: 4, salary: 131076},
    {payPoint: 14, threshold: 4, salary: 131076},
    {payPoint: 15, threshold: 5, salary: 145517},
    {payPoint: 16, threshold: 5, salary: 145517},
    {payPoint: 17, threshold: 5, salary: 145517},
    {payPoint: 18, threshold: 5, salary: 145517},
    {payPoint: 19, threshold: 5, salary: 145517},
    {payPoint: 20, threshold: 5, salary: 145517},
  ] satisfies ThresholdRow[],

  // ══ §4 — Consultant awards & supplements — annual £ (p14-15) ══
  clinicalExcellenceAwards: [
    {award: 'Lower Award Step 1', salary: 2957},
    {award: 'Lower Award Step 2', salary: 5914},
    {award: 'Lower Award Step 3', salary: 8871},
    {award: 'Lower Award Step 4', salary: 11828},
    {award: 'Lower Award Step 5', salary: 14785},
    {award: 'Lower Award Step 6', salary: 17742},
    {award: 'Lower Award Step 7', salary: 23656},
    {award: 'Lower Award Step 8', salary: 29570},
    {award: 'Higher Award Step 9', salary: 35484},
    {award: 'Higher Award Step 10', salary: 46644},
    {award: 'Higher Award Step 11', salary: 58305},
    {award: 'Higher Award Step 12', salary: 75796},
  ],
  consultantDiscretionaryPoints: [
    3204, 6408, 9612, 12816, 16020, 19224, 22428, 25632,
  ],
  distinctionAwards: [
    {level: 'A+', salary: 75889},
    {level: 'A', salary: 55924},
    {level: 'B', salary: 31959},
  ],
  dphSupplement: [
    {band: 'A', min: 13646, max: 19808, exceptional: 0},
    {band: 'B', min: 5284, max: 10579, exceptional: 13646, code: 'M006'},
    {band: 'C', min: 4418, max: 8804, exceptional: 10579, code: 'M007'},
    {band: 'D', min: 3522, max: 7042, exceptional: 8804},
  ],

  // ══ §5 — Salaried GP & GP Educators (p16) ══
  salariedGpRange: {min: 77140, max: 116406},
  gpEducators: [
    {point: 'GP00', salary: 112811},
    {point: 'GP01', salary: 117513},
    {point: 'GP02', salary: 121425},
    {point: 'GP03', salary: 126131},
    {point: 'GP04', salary: 130045},
    {point: 'GP05', salary: 133965},
    {point: 'GP06', salary: 138667},
  ],
  gpTrainerGrant: 10799,

  // ══ §6 — Salaried Dental Staff (p17) ══
  // "*" points in the source are performance-based increments.
  salariedDental: [
    {
      grade: 'Salaried Dentist', band: 1, code: 'M025',
      salaries: [48218, 52118, 56017, 59920, 63820, 67718, 71622, 75522],
    },
    {
      grade: 'Senior Salaried Dentist', band: 2, code: 'M024',
      salaries: [68900, 74354, 79806, 85258, 90711, 91915, 93114],
    },
    {
      grade: 'Assistant Clinical Director Salaried Dentist', band: 3,
      code: 'M018',
      salaries: [91557, 92973, 94388, 95807, 97222, 98639],
    },
    {
      grade: 'Clinical Director Salaried Dentist', band: 4, code: 'M011',
      salaries: [
        91557, 92973, 94388, 95807, 97222,
        98639, 100057, 101499, 102917, 104332,
      ],
    },
  ] satisfies DentalScaleRow[],

  // ══ §6 — Community Dental Service (2015 contract) (p18) ══
  communityDentalService: [
    {
      grade: 'Community Dental Officer', code: 'M431',
      salaries: [52536, 58373, 67128, 71505, 75881, 78798],
    },
    {
      grade: 'Senior Community Dental Officer', code: 'M432',
      salaries: [81721, 84638, 89014, 91202, 93395, 95581],
    },
    {
      grade: 'Assistant Community Dental Clinical Director', code: 'M433',
      salaries: [97769, 100686, 103606],
    },
    {
      grade: 'Specialist Community Dentist', code: 'M434',
      salaries: [97769, 100686, 103606, 106524],
    },
    {
      grade: 'Community Dental Clinical Director', code: 'M435',
      salaries: [97769, 100686, 103606, 106524, 109444],
    },
  ] satisfies IncrementalScaleRow[],

  // ══ §7 — Hospital Practitioner, code M200-M204 (p19) ══
  // Notional half-day / sessional rates.
  hospitalPractitioner: [6280, 6644, 7009, 7372, 7735, 8098, 8462],

  // ══ §9 — Pay for grades closed to new entrants (p22-25) ══
  specialtyDoctor2008: [
    {code: 'M215-01', salary: 53563}, {code: 'M215-02', salary: 58013},
    {code: 'M215-03', salary: 63794}, {code: 'M215-04', salary: 66892},
    {code: 'M215-05', salary: 71358}, {code: 'M215-06', salary: 75807},
    {code: 'M215-07', salary: 75807}, {code: 'M215-08', salary: 80354},
    {code: 'M215-09', salary: 80354}, {code: 'M215-10', salary: 84903},
    {code: 'M215-11', salary: 84903}, {code: 'M215-12', salary: 89451},
    {code: 'M215-13', salary: 89451}, {code: 'M215-14', salary: 89451},
    {code: 'M215-15', salary: 94001}, {code: 'M215-16', salary: 94001},
    {code: 'M215-17', salary: 94001}, {code: 'M215-18', salary: 98549},
  ] satisfies CodeRow[],
  associateSpecialist2008: [
    {code: 'M090-01', salary: 74477}, {code: 'M090-02', salary: 80340},
    {code: 'M090-03', salary: 86201}, {code: 'M090-04', salary: 93942},
    {code: 'M090-05', salary: 100649}, {code: 'M090-06', salary: 103434},
    {code: 'M090-07', salary: 103434}, {code: 'M090-08', salary: 107067},
    {code: 'M090-09', salary: 107067}, {code: 'M090-10', salary: 110698},
    {code: 'M090-11', salary: 110698}, {code: 'M090-12', salary: 114331},
    {code: 'M090-13', salary: 114331}, {code: 'M090-14', salary: 114331},
    {code: 'M090-15', salary: 117961}, {code: 'M090-16', salary: 117961},
    {code: 'M090-17', salary: 117961}, {code: 'M090-18', salary: 121599},
  ] satisfies CodeRow[],
  closedGrades: [
    {
      grade: 'Associate Specialist pre 2008', code: 'M080',
      salaries: [
        54818, 60458, 66100, 71743, 77383, 83025, 90478,
        96935, 99615, 103109, 106607, 110104, 113598, 117097,
      ],
    },
    {
      grade: 'Staff Grade practitioner pre 2008', code: 'M211',
      salaries: [49738, 53562, 57388, 61215, 65040, 69545],
    },
    {
      grade: 'Staff Grade practitioner pre 2008', code: 'M212',
      salaries: [72691, 76515, 80342, 84167, 87993, 91821],
    },
  ] satisfies IncrementalScaleRow[],

  // RECORDED, not transcribed:
  //  · §1 GP Specialty Registrars Allowance (p9) — GPR supplement on top
  //    of the StR scale; conditional add-on.
  //  · §1 "Total salaries for full-time training posts" F5-F9 banding
  //    (p3-8) — rota-banding multipliers of the resident basic scales.
  //  · §4 Pay points for consultants transferring from the pre-2004
  //    contract (p13) — M401-M430 pay-protection matrix, not a live scale.
  //  · §8 Locum appointments (p20-21) — weekly/PA locum rates + Band LL
  //    banding multipliers.
  //  · §10 Mileage & transport (p26); §11 Other fees (p28); §12 Family
  //    planning fees (p30) — expense / item / procedure fees.
} as const;
