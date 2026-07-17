/**
 * Verbatim transcription of NHS Employers Pay & Conditions Circular
 * (M&D) 1/2026R — "Pay award for hospital medical and dental staff,
 * doctors and dentists in public health, the community health service
 * and salaried primary dental care (England)". Republished 30 June
 * 2026 (first published 11 May 2026); rates effective 1 April 2026.
 *
 * This mirrors the circular's Annex A section by section, so it can be
 * diffed against the PDF top-to-bottom. Scope captured (per the agreed
 * policy):
 *   (a) every basic-pay SALARY SCALE — all grades, all steps, incl.
 *       closed-to-new-entrant grades (still paid to incumbents);
 *   (b) earnings-affecting supplements/awards expressed as an annual £
 *       tied to a grade/threshold (on-call availability, Clinical
 *       Impact Awards, DPH supplement, intensity supplements, dental
 *       training supplement).
 * Every other table is RECORDED below with a note on why it is not
 * transcribed — nothing is silently dropped. The translation layer
 * (not this file) decides which of these feed the calculator domain.
 *
 * Public source: NHS Employers — Pay & Conditions Circular (M&D) 1/2026R
 * (direct PDF),
 *   https://www.nhsemployers.org/system/files/2026-06/Pay-and-Conditions-Circular-(MD)-1-2026R-0.pdf
 */

// ── Row shapes (mirror the circular's own columns) ──

interface TrainingRow {
  stage: string;
  code: string;
  nodalPoint: number;
  salary: number;
}
interface CodeNodalRow {
  code: string;
  nodalPoint: number;
  salary: number;
}
interface ConsultantRow {
  threshold: string;
  yearCompleted: number;
  salary: number;
  substantiveCode: string;
  locumCode: string;
}
interface ExperienceRow {
  code: string;
  yearsExperience: number;
  salary: number;
}
interface EducatorRow {
  point: string;
  code: string;
  salary: number;
}
interface SpineRow {
  code: string;
  point: number;
  salary: number;
}
/** A closed-grade scale printed as a wide Min…N matrix row. */
interface ClosedScaleRow {
  grade: string;
  code: string;
  /** Salaries left→right (Min, 1, 2, …); see per-row notes for gaps. */
  salaries: readonly number[];
}

export const ENGLAND_MD_1_2026R = {
  circular: 'NHS Employers PC(M&D) 1/2026R',
  nation: 'england',
  effectiveFrom: '2026-04-01',

  // ══ Annex A §1 — Doctors & dentists in training (2016 contract) ══

  // Doctors in training basic pay (p5).
  doctorsInTraining: [
    // Foundation Doctor Year 1
    {stage: 'FY1', code: 'MF01', nodalPoint: 1, salary: 40190},
    // Foundation Doctor Year 2
    {stage: 'FY2', code: 'MF02', nodalPoint: 2, salary: 45994},
    // Specialty Registrar (StR) (Core Training)
    {stage: 'CT1', code: 'MC51', nodalPoint: 3, salary: 54499},
    {stage: 'CT2', code: 'MC52', nodalPoint: 3, salary: 54499},
    {stage: 'CT3', code: 'MC53', nodalPoint: 4, salary: 67325},
    {stage: 'CT4', code: 'MC54', nodalPoint: 4, salary: 67325},
    // Specialty Registrar (Run-Through / Higher) / Specialist Registrar
    {stage: 'ST1 / SpR1', code: 'MS01', nodalPoint: 3, salary: 54499},
    {stage: 'ST2 / SpR2', code: 'MS02', nodalPoint: 3, salary: 54499},
    {stage: 'ST3 / SpR3', code: 'MS03', nodalPoint: 4, salary: 67325},
    {stage: 'ST4 / SpR4', code: 'MS04', nodalPoint: 4, salary: 67325},
    {stage: 'ST5 / SpR5', code: 'MS05', nodalPoint: 4, salary: 67325},
    {stage: 'ST6 / SpR6', code: 'MS06', nodalPoint: 5, salary: 76582},
    {stage: 'ST7 / SpR7', code: 'MS07', nodalPoint: 5, salary: 76582},
    {stage: 'ST8 / SpR8', code: 'MS08', nodalPoint: 5, salary: 76582},
  ] satisfies TrainingRow[],

  // Dentists in training basic pay (p5).
  dentistsInTraining: [
    // Dental Core Training
    {stage: 'CT1', code: 'MC51', nodalPoint: 3, salary: 54499},
    {stage: 'CT2', code: 'MC52', nodalPoint: 3, salary: 54499},
    {stage: 'CT3', code: 'MC53', nodalPoint: 4, salary: 67325},
    // Dental Specialty Training (dentists begin ST1 on nodal point 4)
    {stage: 'ST1', code: 'MS11', nodalPoint: 4, salary: 67325},
    {stage: 'ST2', code: 'MS12', nodalPoint: 4, salary: 67325},
    {stage: 'ST3', code: 'MS13', nodalPoint: 4, salary: 67325},
    {stage: 'ST4', code: 'MS14', nodalPoint: 5, salary: 76582},
    {stage: 'ST5', code: 'MS15', nodalPoint: 5, salary: 76582},
    {stage: 'ST6', code: 'MS16', nodalPoint: 5, salary: 76582},
    {stage: 'ST7', code: 'MS17', nodalPoint: 5, salary: 76582},
    {stage: 'ST8', code: 'MS18', nodalPoint: 5, salary: 76582},
  ] satisfies TrainingRow[],

  // Locally Employed Doctors — local-contract grade codes mirroring
  // the nodal scale (p6). Use optional (local T&Cs may differ).
  locallyEmployedDoctors: [
    {code: 'MT01', nodalPoint: 1, salary: 40190},
    {code: 'MT02', nodalPoint: 2, salary: 45994},
    {code: 'MT03', nodalPoint: 3, salary: 54499},
    {code: 'MT04', nodalPoint: 4, salary: 67325},
    {code: 'MT05', nodalPoint: 5, salary: 76582},
  ] satisfies CodeNodalRow[],

  // On-call availability allowance — annual £ by nodal point (p6).
  onCallAvailabilityAllowance: [
    {nodalPoint: 1, salary: 3216},
    {nodalPoint: 2, salary: 3680},
    {nodalPoint: 3, salary: 4360},
    {nodalPoint: 4, salary: 5386},
    {nodalPoint: 5, salary: 6127},
  ],

  // RECORDED, not transcribed:
  //  · LTFT allowance (p6) — flat £1,000/yr on top of salary (text, no table).
  //  · Weekend allowance (p6) — % of basic pay by rota frequency × nodal
  //    point; rota-dependent multiplier, not a base scale.
  //  · Flexible Pay Premia (p7) — annual £ premia conditional on
  //    hard-to-fill specialty / OMFS / academia; specialty-conditional.
  //  · Pay points for trainees transferring from Scotland/Wales/NI/Defence
  //    (p9) — Schedule-15 pay-protection reference, not a live scale.
  //  · Penalty rates & fines for extra hours (p10) — hourly, not annual pay.

  // ══ Annex A §2 — Consultant (2003 contract) ══

  // Consultant basic salary by threshold — one row per year point (p11).
  consultant: [
    {threshold: '1',  yearCompleted: 0,  salary: 113565, substantiveCode: 'YC72 00', locumCode: 'YC73 00'},
    {threshold: '1',  yearCompleted: 1,  salary: 113565, substantiveCode: 'YC72 01', locumCode: 'YC73 01'},
    {threshold: '1',  yearCompleted: 2,  salary: 113565, substantiveCode: 'YC72 02', locumCode: 'YC73 02'},
    {threshold: '2a', yearCompleted: 3,  salary: 120249, substantiveCode: 'YC72 03', locumCode: 'YC73 03'},
    {threshold: '2b', yearCompleted: 4,  salary: 123672, substantiveCode: 'YC72 04', locumCode: 'YC73 04'},
    {threshold: '2b', yearCompleted: 5,  salary: 123672, substantiveCode: 'YC72 05', locumCode: 'YC73 05'},
    {threshold: '2b', yearCompleted: 6,  salary: 123672, substantiveCode: 'YC72 06', locumCode: 'YC73 06'},
    {threshold: '2b', yearCompleted: 7,  salary: 123672, substantiveCode: 'YC72 07', locumCode: 'YC73 07'},
    {threshold: '3',  yearCompleted: 8,  salary: 135645, substantiveCode: 'YC72 08', locumCode: 'YC73 08'},
    {threshold: '3',  yearCompleted: 9,  salary: 135645, substantiveCode: 'YC72 09', locumCode: 'YC73 09'},
    {threshold: '3',  yearCompleted: 10, salary: 135645, substantiveCode: 'YC72 10', locumCode: 'YC73 10'},
    {threshold: '3',  yearCompleted: 11, salary: 135645, substantiveCode: 'YC72 11', locumCode: 'YC73 11'},
    {threshold: '3',  yearCompleted: 12, salary: 135645, substantiveCode: 'YC72 12', locumCode: 'YC73 12'},
    {threshold: '3',  yearCompleted: 13, salary: 135645, substantiveCode: 'YC72 13', locumCode: 'YC73 13'},
    {threshold: '4',  yearCompleted: 14, salary: 150569, substantiveCode: 'YC72 14', locumCode: 'YC73 14'},
    {threshold: '4',  yearCompleted: 15, salary: 150569, substantiveCode: 'YC72 15', locumCode: 'YC73 15'},
    {threshold: '4',  yearCompleted: 16, salary: 150569, substantiveCode: 'YC72 16', locumCode: 'YC73 16'},
    {threshold: '4',  yearCompleted: 17, salary: 150569, substantiveCode: 'YC72 17', locumCode: 'YC73 17'},
    {threshold: '4',  yearCompleted: 18, salary: 150569, substantiveCode: 'YC72 18', locumCode: 'YC73 18'},
    {threshold: '4',  yearCompleted: 19, salary: 150569, substantiveCode: 'YC72 19', locumCode: 'YC73 19'},
  ] satisfies ConsultantRow[],

  // National Clinical Impact Awards — annual £ by level (p11).
  nationalClinicalImpactAwards: [
    {level: 1, salary: 21000},
    {level: 2, salary: 31500},
    {level: 3, salary: 42000},
  ],

  // Directors of Public Health (Chief Officer) supplement — annual £ (p12).
  dphSupplement: [
    {band: 'A', min: 19380, max: 28133, exceptionalMax: 0},
    {band: 'B', min: 7504,  max: 15025, exceptionalMax: 19380},
    {band: 'C', min: 6274,  max: 12504, exceptionalMax: 15025},
    {band: 'D', min: 5002,  max: 10001, exceptionalMax: 12504},
  ],

  // Intensity supplements (pre-2003 consultant contract only) — annual £ (p12).
  intensitySupplements: [
    {description: 'Daytime intensity', salary: 1810},
    {description: 'Out of hours Band 1 (low)', salary: 1363},
    {description: 'Out of hours Band 2 (medium)', salary: 2717},
    {description: 'Out of hours Band 3 (high)', salary: 4062},
  ],

  // RECORDED, not transcribed:
  //  · Pay points for consultants transferring from the pre-2003 contract
  //    (p13) — a YC51–YC71 transition matrix (pay protection), not a live scale.

  // ══ Annex A §3 — Specialty Doctor (2021 contract) ══

  // Basic pay by year of experience (p14).
  specialtyDoctor: [
    {code: 'MC75-01', yearsExperience: 0,  salary: 63696},
    {code: 'MC75-02', yearsExperience: 1,  salary: 63696},
    {code: 'MC75-03', yearsExperience: 2,  salary: 63696},
    {code: 'MC75-04', yearsExperience: 3,  salary: 73383},
    {code: 'MC75-05', yearsExperience: 4,  salary: 73383},
    {code: 'MC75-06', yearsExperience: 5,  salary: 73383},
    {code: 'MC75-07', yearsExperience: 6,  salary: 81804},
    {code: 'MC75-08', yearsExperience: 7,  salary: 81804},
    {code: 'MC75-09', yearsExperience: 8,  salary: 81804},
    // Threshold
    {code: 'MC75-10', yearsExperience: 9,  salary: 90548},
    {code: 'MC75-11', yearsExperience: 10, salary: 90548},
    {code: 'MC75-12', yearsExperience: 11, salary: 90548},
    {code: 'MC75-13', yearsExperience: 12, salary: 102689},
    {code: 'MC75-14', yearsExperience: 13, salary: 102689},
    {code: 'MC75-15', yearsExperience: 14, salary: 102689},
    {code: 'MC75-16', yearsExperience: 15, salary: 102689},
    {code: 'MC75-17', yearsExperience: 16, salary: 102689},
    {code: 'MC75-18', yearsExperience: 17, salary: 102689},
  ] satisfies ExperienceRow[],

  // ══ Annex A §4 — Specialist (2021 contract) ══

  // Basic pay by year of experience (p15).
  specialist: [
    {code: 'MC70-01', yearsExperience: 0, salary: 104401},
    {code: 'MC70-02', yearsExperience: 1, salary: 104401},
    {code: 'MC70-03', yearsExperience: 2, salary: 104401},
    {code: 'MC70-04', yearsExperience: 3, salary: 108484},
    {code: 'MC70-05', yearsExperience: 4, salary: 108484},
    {code: 'MC70-06', yearsExperience: 5, salary: 108484},
    {code: 'MC70-07', yearsExperience: 6, salary: 115341},
  ] satisfies ExperienceRow[],

  // ══ Annex A §5 — Salaried GP ══

  // Salaried GP salary range (p15).
  salariedGpRange: {min: 78699, max: 118759},

  // GP Educators pay scale (p15).
  gpEducators: [
    {point: 'GP00', code: 'KP01', salary: 117904},
    {point: 'GP01', code: 'KP02', salary: 122819},
    {point: 'GP02', code: 'KP03', salary: 126908},
    {point: 'GP03', code: 'KP04', salary: 131827},
    {point: 'GP04', code: 'KP05', salary: 135917},
    {point: 'GP05', code: 'KP06', salary: 140011},
    {point: 'GP06', code: 'KP07', salary: 144926},
  ] satisfies EducatorRow[],

  // ══ Annex A §6 — Salaried Dental Staff (2008) ══

  // Salaried Primary Care Dental Staff spine (p16). Band A = LD01,
  // Band B = LD11, Band C = LD21.
  salariedDentalSpine: [
    {code: 'LD01', point: 1,  salary: 54502},
    {code: 'LD01', point: 2,  salary: 60558},
    {code: 'LD01', point: 3,  salary: 69641},
    {code: 'LD01', point: 4,  salary: 74183},
    {code: 'LD01', point: 5,  salary: 78725},
    {code: 'LD01', point: 6,  salary: 81753},
    {code: 'LD11', point: 7,  salary: 84781},
    {code: 'LD11', point: 8,  salary: 87809},
    {code: 'LD11', point: 9,  salary: 92350},
    {code: 'LD11', point: 10, salary: 94621},
    {code: 'LD11', point: 11, salary: 96892},
    {code: 'LD11', point: 12, salary: 99163},
    {code: 'LD21', point: 13, salary: 101434},
    {code: 'LD21', point: 14, salary: 104462},
    {code: 'LD21', point: 15, salary: 107490},
    {code: 'LD21', point: 16, salary: 110518},
    {code: 'LD21', point: 17, salary: 113545},
    {code: 'LD21', point: 18, salary: 116573},
  ] satisfies SpineRow[],

  // Training supplement for Band A dentists supervising a DFT/student —
  // annual £ (p17).
  dentalTrainingSupplement: 2843,

  // Dental Educators pay scale (p17).
  dentalEducators: [
    {point: '00', code: 'LP01-01', salary: 118189},
    {point: '01', code: 'LP02-01', salary: 123115},
    {point: '02', code: 'LP03-01', salary: 127214},
    {point: '03', code: 'LP04-01', salary: 132145},
    {point: '04', code: 'LP05-01', salary: 136245},
    {point: '05', code: 'LP06-01', salary: 140349},
  ] satisfies EducatorRow[],

  // RECORDED, not transcribed:
  //  · Indicative Training Allowance (ITA) for salaried dental staff (p17)
  //    — £1,112, "for information only" (set by DDRB general award).
  //  · Dental Foundation Training salary (p17) — £43,893, set by the GDS
  //    SFE, "for information only" (not part of this pay spine).

  // ══ Annex A §7 — Locum appointments ══
  // RECORDED, not transcribed: locum consultants use the YM73 scale (see
  // §2); SAS locum weekly / per-PA rates (p18) are short-term-cover day
  // rates, not annual pay.

  // ══ Annex A §8 — Pay for grades closed to new entrants ══
  // Still paid to incumbents placed on them before closure — in scope.

  // Closed grades on the 2002 TCS — wide Min…N matrix (p19).
  closedGrades: [
    {grade: 'Foundation Doctor Year 1', code: 'MN13',
      salaries: [35309, 37305, 39301]},
    {grade: 'Foundation Doctor Year 2', code: 'MN15',
      salaries: [42995, 45588, 48182]},
    {grade: 'Specialty Registrar (Core Training)', code: 'MN39',
      salaries: [45715, 48309, 51931, 54121, 56763, 59406]},
    {grade: 'Specialty Registrar (FT)', code: 'MN35',
      salaries: [45715, 48309, 51931, 54121, 56763, 59406]},
    {grade: 'Specialty Registrar (full)', code: 'MN37',
      salaries: [45715, 48309, 51931, 54121, 56763, 59406,
        62049, 64690, 67333, 69976]},
    // Dental Core Training: Min is N/A; scale starts at point 1.
    {grade: 'Dental Core Training', code: 'MN21/KA01/LF21',
      salaries: [45588, 48182, 50776, 53369, 55963, 58557]},
    {grade: 'Specialist Registrar', code: 'MN25/KA31/LF25',
      salaries: [47551, 49741, 51931, 54121, 56763, 59406,
        62049, 64690, 67333, 69976]},
    {grade: 'Consultant pre 2003', code: 'MC21/KC11/LC01/LC10',
      salaries: [88733, 95082, 101433, 107782, 115023]},
    {grade: 'Associate Specialist pre 2008', code: 'MC01',
      salaries: [56466, 62278, 68089, 73899, 79711, 85522, 93196,
        99847, 102608, 106208, 109809, 113410, 117011, 120614]},
    {grade: 'Staff Grade', code: 'MH01',
      salaries: [51235, 55176, 59115, 63056, 66997, 70936, 74877, 78816]},
    {grade: 'Staff Grade (2)', code: 'MH03/05',
      salaries: [51235, 55176, 59115, 63056, 66997, 71636, 74877,
        78816, 82757, 86698, 90637, 94580]},
    {grade: 'SCMO', code: 'KB11',
      salaries: [68792, 72882, 76971, 81060, 85150, 89239, 93327, 97418]},
    {grade: 'CMO', code: 'KB01',
      salaries: [49149, 51723, 54297, 56872, 59446, 62020, 64595, 67171]},
    // Hospital Practitioner — sessional / notional half-day rates, not annual.
    {grade: 'Hospital Practitioner', code: 'MD01-41',
      salaries: [6707, 7087, 7469, 7848, 8228, 8608, 8987]},
  ] satisfies ClosedScaleRow[],

  // Specialty Doctor 2008 contract (closed to new entrants Apr 2021) (p21).
  specialtyDoctor2008: [
    {code: 'MC46-01', salary: 55176}, {code: 'MC46-02', salary: 59757},
    {code: 'MC46-03', salary: 65713}, {code: 'MC46-04', salary: 68905},
    {code: 'MC46-05', salary: 73504}, {code: 'MC46-06', salary: 78085},
    {code: 'MC46-07', salary: 78085}, {code: 'MC46-08', salary: 82769},
    {code: 'MC46-09', salary: 82769}, {code: 'MC46-10', salary: 87455},
    {code: 'MC46-11', salary: 87455}, {code: 'MC46-12', salary: 92141},
    {code: 'MC46-13', salary: 92141}, {code: 'MC46-14', salary: 92141},
    {code: 'MC46-15', salary: 96825}, {code: 'MC46-16', salary: 96825},
    {code: 'MC46-17', salary: 96825}, {code: 'MC46-18', salary: 101511},
  ],

  // Associate Specialist 2008 contract (closed Apr 2008) (p22).
  associateSpecialist2008: [
    {code: 'MC41-01', salary: 76717}, {code: 'MC41-02', salary: 82756},
    {code: 'MC41-03', salary: 88792}, {code: 'MC41-04', salary: 96765},
    {code: 'MC41-05', salary: 103676}, {code: 'MC41-06', salary: 106543},
    {code: 'MC41-07', salary: 106543}, {code: 'MC41-08', salary: 110284},
    {code: 'MC41-09', salary: 110284}, {code: 'MC41-10', salary: 114025},
    {code: 'MC41-11', salary: 114025}, {code: 'MC41-12', salary: 117766},
    {code: 'MC41-13', salary: 117766}, {code: 'MC41-14', salary: 117766},
    {code: 'MC41-15', salary: 121507}, {code: 'MC41-16', salary: 121507},
    {code: 'MC41-17', salary: 121507}, {code: 'MC41-18', salary: 125251},
  ],

  // RECORDED, not transcribed:
  //  · LTFT Doctors & Dentists in Training (pre-2016 contract), MT57–MT60
  //    with F5–F9 banding (p20) — pro-rated, banded flexible-trainee rates.

  // ══ Annex A §9–11 ══
  // RECORDED, not transcribed (out of scope (c) — not take-home pay):
  //  · §9 Mileage & transport allowances (p23) — expense reimbursement.
  //  · §10 Other fees, charges & allowances (p24) — item/session fees.
  //  · §11 Family planning fees & miscellaneous (p26) — procedure fees.
} as const;
