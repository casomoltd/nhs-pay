/**
 * Verbatim transcription of NHS Scotland Circular PCS(DD)2025/01 (11 June
 * 2025) AND its Residents Addendum (PCS(DD)2025/01 Addendum, 26 November
 * 2025) — "Pay and Conditions of Service: Remuneration of Hospital Medical
 * and Dental Staff, Doctors and Dentists in Public Health Medicine and the
 * Community Health Service (Scotland)". Effective 1 April 2025 (2025/26).
 *
 * COMPLETE year: unlike the 2026/27 circular (training grades only, with
 * non-training deferred to an unpublished addendum), the 2025/26 pay round
 * IS fully published — the main circular carries the non-training scales
 * (4% uplift) and the addendum carries the training grades (4.25% uplift).
 * Both are transcribed here so 2025/26 resolves every doctor & dentist
 * grade; the separate 2026/01 file remains training-only for 2026/27.
 *
 * Scope mirrors the England/Wales files: (a) every basic-pay salary scale
 * incl. closed grades; (b) earnings supplements as annual £. Main-circular
 * annexes: A consultant (2004), B transitional consultant, C pre-2004/
 * pre-2008/pre-1997 closed grades, D post-specific (Crump, salaried GP,
 * DVT), E 2008 SAS (closed), E1 2022 SAS (live), F associate advisers,
 * G Public Dental Service spine, H other fees. Addendum: C training grades,
 * D dental core training, H peripheral allowances. Every other table is
 * recorded with a reason.
 *
 * Public sources: NHS Scotland —
 *   PCS(DD)2025/01: https://www.publications.scot.nhs.uk/files/pcs2025-dd-01.pdf
 *   Addendum:       https://www.publications.scot.nhs.uk/files/pcs2025-dd-01add.pdf
 */

interface ConsultantRow {
  threshold: string;
  yearCompleted: number;
  salary: number;
}
/** A 2022-contract SAS row: the source's scale point (0-based) and the
 *  pay point it sits in, with the salary. */
interface SasScaleRow {
  scalePoint: number;
  payPoint: number;
  salary: number;
}
interface AdviserRow {
  grade: string;
  salary: number;
}
interface SpineRow {
  band: 'A' | 'B' | 'C';
  point: number;
  salary: number;
}
/** A grade's incremental scale — salaries left→right (Min, 1st…Nth). */
interface IncrementalScaleRow {
  grade: string;
  code: string;
  salaries: readonly number[];
}

export const SCOTLAND_PCS_DD_2025_01 = {
  circular: 'NHS Scotland PCS(DD)2025/01',
  nation: 'scotland',
  effectiveFrom: '2025-04-01',

  // ══ Annex A — Consultants (2004 contract), new consultants (p6) ══
  // Source is keyed by seniority point (1-20) → pay point (1-8); modelled
  // here as threshold = pay point, yearCompleted = seniority − 1, to match
  // the England/Wales consultant shape.
  consultant: [
    {threshold: '1', yearCompleted: 0,  salary: 111430},
    {threshold: '2', yearCompleted: 1,  salary: 113784},
    {threshold: '3', yearCompleted: 2,  salary: 117169},
    {threshold: '4', yearCompleted: 3,  salary: 120558},
    {threshold: '5', yearCompleted: 4,  salary: 123937},
    {threshold: '5', yearCompleted: 5,  salary: 123937},
    {threshold: '5', yearCompleted: 6,  salary: 123937},
    {threshold: '5', yearCompleted: 7,  salary: 123937},
    {threshold: '5', yearCompleted: 8,  salary: 123937},
    {threshold: '6', yearCompleted: 9,  salary: 131982},
    {threshold: '6', yearCompleted: 10, salary: 131982},
    {threshold: '6', yearCompleted: 11, salary: 131982},
    {threshold: '6', yearCompleted: 12, salary: 131982},
    {threshold: '6', yearCompleted: 13, salary: 131982},
    {threshold: '7', yearCompleted: 14, salary: 140026},
    {threshold: '7', yearCompleted: 15, salary: 140026},
    {threshold: '7', yearCompleted: 16, salary: 140026},
    {threshold: '7', yearCompleted: 17, salary: 140026},
    {threshold: '7', yearCompleted: 18, salary: 140026},
    {threshold: '8', yearCompleted: 19, salary: 148064},
  ] satisfies ConsultantRow[],

  // ══ Annex E1 — 2022 Specialty Doctor & Specialist (Scotland), live (p12) ══
  specialtyDoctor2022: [
    {scalePoint: 0,  payPoint: 1, salary: 64158},
    {scalePoint: 1,  payPoint: 1, salary: 64158},
    {scalePoint: 2,  payPoint: 1, salary: 64158},
    {scalePoint: 3,  payPoint: 2, salary: 76537},
    {scalePoint: 4,  payPoint: 2, salary: 76537},
    {scalePoint: 5,  payPoint: 2, salary: 76537},
    {scalePoint: 6,  payPoint: 3, salary: 81223},
    {scalePoint: 7,  payPoint: 3, salary: 81223},
    {scalePoint: 8,  payPoint: 3, salary: 81223},
    {scalePoint: 9,  payPoint: 4, salary: 90600},
    {scalePoint: 10, payPoint: 4, salary: 90600},
    {scalePoint: 11, payPoint: 4, salary: 90600},
    {scalePoint: 12, payPoint: 5, salary: 99975},
    {scalePoint: 13, payPoint: 5, salary: 99975},
    {scalePoint: 14, payPoint: 5, salary: 99975},
    {scalePoint: 15, payPoint: 5, salary: 99975},
    {scalePoint: 16, payPoint: 5, salary: 99975},
    {scalePoint: 17, payPoint: 5, salary: 99975},
  ] satisfies SasScaleRow[],
  specialist2022: [
    {scalePoint: 0, payPoint: 1, salary: 100870},
    {scalePoint: 1, payPoint: 1, salary: 100870},
    {scalePoint: 2, payPoint: 1, salary: 100870},
    {scalePoint: 3, payPoint: 2, salary: 104816},
    {scalePoint: 4, payPoint: 2, salary: 104816},
    {scalePoint: 5, payPoint: 2, salary: 104816},
    {scalePoint: 6, payPoint: 3, salary: 111441},
  ] satisfies SasScaleRow[],

  // ══ Annex E — 2008 Specialty Doctor & Associate Specialist, closed (p11) ══
  // Pay points 0-10, left→right (Min…10th). Closed to new entrants.
  specialtyDoctor2008: [
    52812, 57327, 63196, 66342, 70875,
    75391, 80007, 84625, 89244, 93860, 98477,
  ],
  associateSpecialist2008: [
    74041, 79993, 85943, 93802, 100611,
    103438, 107126, 109704, 113286, 116865, 120448,
  ],

  // ══ Annex C — pre-2004/pre-2008/pre-1997 closed grades (p9) ══
  // Incremental points Min…Nth. Consultant pre-2004 and the second staff-
  // grade column (PCS(DD)1997/5) are recorded but not wired.
  closedGrades: [
    {
      grade: 'Consultant (pre-2004 contract)', code: 'pre2004-consultant',
      salaries: [92518, 99141, 105759, 112381, 118647],
    },
    {
      grade: 'Associate Specialist (pre-2008 contract)', code: 'pre2008-as',
      salaries: [
        54080, 59810, 65539, 71265, 76993, 82720, 90285,
        96838, 99559, 103108, 106657, 109115, 112561, 116011,
      ],
    },
    {
      grade: 'Staff Grade Practitioner (pre-1997 contract)', code: 'pre1997-sg',
      salaries: [48926, 52811, 56693, 60576, 64460, 68344, 72227, 76110],
    },
    {
      grade: 'Staff Grade Practitioner (PCS(DD)1997/5)', code: 'pcsdd1997-5-sg',
      salaries: [
        48926, 52811, 56693, 60576, 64460, 69033,
        72227, 76110, 79994, 83878, 87763, 91646,
      ],
    },
  ] satisfies IncrementalScaleRow[],

  // ══ Annex D — Post-specific salaries/ranges (p10) ══
  salariedGpRange: {min: 77160, max: 115167},
  directorsPostgraduateEducation: 159661, // Crump — recorded, not wired
  dentalVocationalTraining: 41188, // recorded — set by SDR, not wired

  // ══ Annex F — Associate Adviser / Assistant Director payscales (p13) ══
  // The Scottish equivalent of GP educators (GP Appraisers / Local Appraisal
  // Advisers are placed on AA01/AA03). Annual whole-time salary.
  associateAdvisers: [
    {grade: 'Introductory year', salary: 119826},
    {grade: 'AA01', salary: 124727},
    {grade: 'AA02', salary: 128808},
    {grade: 'AA03', salary: 133712},
    {grade: 'AD01', salary: 137797},
    {grade: 'AD02', salary: 141879},
    {grade: 'AD03', salary: 146780},
  ] satisfies AdviserRow[],

  // ══ Annex G — Public Dental Service spine (p14) ══
  // Band A Dental Officer (1-6), Band B Senior Dental Officer (7-12),
  // Band C Assistant Clinical Director / Specialist / Clinical Director
  // (13-18). Points 13-18 salaries are the shared Band C spine.
  salariedDentalSpine: [
    {band: 'A', point: 1,  salary: 54117},
    {band: 'A', point: 2,  salary: 60131},
    {band: 'A', point: 3,  salary: 69150},
    {band: 'A', point: 4,  salary: 73657},
    {band: 'A', point: 5,  salary: 78168},
    {band: 'A', point: 6,  salary: 81174},
    {band: 'B', point: 7,  salary: 84180},
    {band: 'B', point: 8,  salary: 87186},
    {band: 'B', point: 9,  salary: 91696},
    {band: 'B', point: 10, salary: 93951},
    {band: 'B', point: 11, salary: 96207},
    {band: 'B', point: 12, salary: 98460},
    {band: 'C', point: 13, salary: 100715},
    {band: 'C', point: 14, salary: 103722},
    {band: 'C', point: 15, salary: 106726},
    {band: 'C', point: 16, salary: 108659},
    {band: 'C', point: 17, salary: 111577},
    {band: 'C', point: 18, salary: 114496},
  ] satisfies SpineRow[],

  // ══ Annex H (main) — Hospital Practitioner sessional scale (p15) ══
  // Per-session-per-annum; Minimum…6.
  hospitalPractitioner: [6473, 6847, 7222, 7595, 7971, 8343, 8718],

  // ══ Addendum Annex C — Training grades, basic pay (p5) ══
  // No pay-scale codes are printed. "^" points (in the source) are awarded
  // automatically except for unsatisfactory performance.
  trainingGrades: [
    {grade: 'Foundation House Officer 1', code: 'FHO1', salaries: [35967, 38215, 40459]},
    {grade: 'Foundation House Officer 2', code: 'FHO2', salaries: [44613, 47531, 50448]},
    {
      grade: 'Senior House Officer / Senior Dental House Officer', code: 'SHO',
      salaries: [44613, 47531, 50448, 53364, 56282, 59198, 62115],
    },
    {
      grade: 'Specialist Registrar', code: 'SpR',
      salaries: [
        49492, 51944, 54395, 56846, 59801,
        62758, 65719, 68675, 71631, 74591,
      ],
    },
    {
      grade: 'Specialty Registrar (Full)', code: 'StR-full',
      salaries: [
        47438, 50341, 54395, 56846, 59801,
        62758, 65719, 68675, 71631, 74591,
      ],
    },
    {
      grade: 'Specialty Registrar (Fixed Term)', code: 'StR-fixed',
      salaries: [47438, 50341, 54395, 56846, 59801, 62758],
    },
    {
      grade: 'Specialty Registrar (Core Training)', code: 'StR-core',
      salaries: [47438, 50341, 54395, 56846, 59801, 62758],
    },
    {
      grade: 'GP Specialty Registrar (SHO)', code: 'GP-SHO',
      salaries: [44613, 47531, 50448, 53364, 56282, 59198, 62115],
    },
    {
      grade: 'GP Specialty Registrar (SpR)', code: 'GP-SpR',
      salaries: [
        49492, 51944, 54395, 56846, 59801,
        62758, 65719, 68675, 71631, 74591,
      ],
    },
    {
      grade: 'GP Specialty Registrar (StR)', code: 'GP-StR',
      salaries: [
        47438, 50341, 54395, 56846, 59801,
        62758, 65719, 68675, 71631, 74591,
      ],
    },
  ] satisfies IncrementalScaleRow[],

  // ══ Addendum Annex D — Dental core training (p6) ══
  dentalCoreTraining: {stage: 'CT1', salary: 52686},

  // ══ Addendum Annex H — Peripheral allowances (p8) ══
  // Annual £ for designated training-grade posts approved by Ministers.
  peripheralAllowances: [3892.40, 2917.07, 1939.39],

  // RECORDED, not transcribed:
  //  · Annex B Transitional consultant pay (2004 transfers, Appendix 3
  //    Table 7) (p7-8) — pay-protection transition matrix, not a live scale.
  //  · Annex H (main) Discretionary points for consultants (p15) — annual £
  //    add-ons by point (3,744…29,952), not base pay.
  //  · Annex H (main) Distinction awards A+/A/B (£75,889/£55,924/£31,959)
  //    and intensity supplements (pre-2004 contract) (p15-16) — award/rota
  //    add-ons, values unchanged this round.
  //  · Annex H (main) GMP contract-holder fees (staff fund, casualty) (p16)
  //    — item/session fees, not salary.
  //  · Addendum Tables 1-3 total salaries (full-time + flexible trainees)
  //    (p9-12) — basic (== Annex C above) plus rota-banded totals; banded
  //    columns derived from the banding multipliers.
  //  · Addendum Annex H banding supplements (1C ×1.2 … 3 ×2.0) (p8) and
  //    Tables 4-6 (GP registrar supplements, locum rates) — multipliers and
  //    short-term-cover rates, not base pay.
} as const;
