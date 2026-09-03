/**
 * Verbatim transcription of NHS Scotland Circular PCS(DD)2026/02
 * (12 August 2026) — "Pay and Conditions of Service: Remuneration of
 * Hospital Medical and Dental Staff, Doctors and Dentists in Public
 * Health Medicine and the Community Health Service (Scotland)".
 * Effective 1 April 2026 (2026/27).
 *
 * This is the NON-TRAINING half of Scotland's 2026/27 round. The
 * training grades were published separately and earlier, in
 * PCS(DD)2026/01 (its para 2 deferred everything else); that file
 * remains the source for them. Together the two cover the year.
 *
 * Two uplifts, not one: para 2 confirms **3.5%** on basic pay across
 * NHS medical and dental staff, and para 3 a separate **3.75%** for
 * dentists in public health medicine / the community health service
 * and Public Dental Service staff. The Annex G spine below is on the
 * 3.75% figure; everything else is on 3.5%.
 *
 * Scope mirrors the sibling circular files: (a) every basic-pay salary
 * scale incl. closed grades; (b) earnings supplements as annual £.
 * Annexes: A consultant (2004), B transitional consultant, C
 * pre-2004/pre-2008/pre-1997 closed grades, D post-specific (Crump,
 * salaried GP, DVT), E 2008 SAS (closed), E1 2022 SAS (live), F
 * associate advisers, G Public Dental Service spine, H other fees.
 * Every table not carried is recorded with a reason at the foot.
 *
 * Source: "Scotland, PCS(DD)2026/02" (#sa-43) — see
 * docs/source-archive.md#sa-43.
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

export const SCOTLAND_PCS_DD_2026_02 = {
  circular: 'NHS Scotland PCS(DD)2026/02',
  nation: 'scotland',
  effectiveFrom: '2026-04-01',

  // ══ Annex A — Consultants (2004 contract), new consultants (p7) ══
  // Source is keyed by seniority point (1-20) → pay point (1-8);
  // modelled here as threshold = pay point, yearCompleted = seniority
  // − 1, to match the England/Wales consultant shape.
  consultant: [
    {threshold: '1', yearCompleted: 0,  salary: 115331},
    {threshold: '2', yearCompleted: 1,  salary: 117767},
    {threshold: '3', yearCompleted: 2,  salary: 121270},
    {threshold: '4', yearCompleted: 3,  salary: 124778},
    {threshold: '5', yearCompleted: 4,  salary: 128275},
    {threshold: '5', yearCompleted: 5,  salary: 128275},
    {threshold: '5', yearCompleted: 6,  salary: 128275},
    {threshold: '5', yearCompleted: 7,  salary: 128275},
    {threshold: '5', yearCompleted: 8,  salary: 128275},
    {threshold: '6', yearCompleted: 9,  salary: 136602},
    {threshold: '6', yearCompleted: 10, salary: 136602},
    {threshold: '6', yearCompleted: 11, salary: 136602},
    {threshold: '6', yearCompleted: 12, salary: 136602},
    {threshold: '6', yearCompleted: 13, salary: 136602},
    {threshold: '7', yearCompleted: 14, salary: 144927},
    {threshold: '7', yearCompleted: 15, salary: 144927},
    {threshold: '7', yearCompleted: 16, salary: 144927},
    {threshold: '7', yearCompleted: 17, salary: 144927},
    {threshold: '7', yearCompleted: 18, salary: 144927},
    {threshold: '8', yearCompleted: 19, salary: 153247},
  ] satisfies ConsultantRow[],

  // ══ Annex E1 — 2022 Specialty Doctor & Specialist, live (p13) ══
  specialtyDoctor2022: [
    {scalePoint: 0,  payPoint: 1, salary: 66404},
    {scalePoint: 1,  payPoint: 1, salary: 66404},
    {scalePoint: 2,  payPoint: 1, salary: 66404},
    {scalePoint: 3,  payPoint: 2, salary: 79216},
    {scalePoint: 4,  payPoint: 2, salary: 79216},
    {scalePoint: 5,  payPoint: 2, salary: 79216},
    {scalePoint: 6,  payPoint: 3, salary: 84066},
    {scalePoint: 7,  payPoint: 3, salary: 84066},
    {scalePoint: 8,  payPoint: 3, salary: 84066},
    {scalePoint: 9,  payPoint: 4, salary: 93771},
    {scalePoint: 10, payPoint: 4, salary: 93771},
    {scalePoint: 11, payPoint: 4, salary: 93771},
    {scalePoint: 12, payPoint: 5, salary: 103475},
    {scalePoint: 13, payPoint: 5, salary: 103475},
    {scalePoint: 14, payPoint: 5, salary: 103475},
    {scalePoint: 15, payPoint: 5, salary: 103475},
    {scalePoint: 16, payPoint: 5, salary: 103475},
    {scalePoint: 17, payPoint: 5, salary: 103475},
  ] satisfies SasScaleRow[],
  specialist2022: [
    {scalePoint: 0, payPoint: 1, salary: 104401},
    {scalePoint: 1, payPoint: 1, salary: 104401},
    {scalePoint: 2, payPoint: 1, salary: 104401},
    {scalePoint: 3, payPoint: 2, salary: 108485},
    {scalePoint: 4, payPoint: 2, salary: 108485},
    {scalePoint: 5, payPoint: 2, salary: 108485},
    {scalePoint: 6, payPoint: 3, salary: 115342},
  ] satisfies SasScaleRow[],

  // ══ Annex E — 2008 Specialty Doctor & Associate Specialist (p12) ══
  // Pay points 0-10, left→right (Min…10th). Closed to new entrants.
  specialtyDoctor2008: [
    54661, 59334, 65408, 68664, 73356,
    78030, 82808, 87587, 92368, 97146, 101924,
  ],
  associateSpecialist2008: [
    76633, 82793, 88952, 97086, 104133,
    107059, 110876, 113544, 117252, 120956, 124664,
  ],

  // ══ Annex C — pre-2004/pre-2008/pre-1997 closed grades (p10) ══
  // Incremental points Min…Nth. Consultant pre-2004 and the second
  // staff-grade column (PCS(DD)1997/5) are recorded but not wired.
  closedGrades: [
    {
      grade: 'Consultant (pre-2004 contract)', code: 'pre2004-consultant',
      salaries: [95757, 102611, 109461, 116315, 122800],
    },
    {
      grade: 'Associate Specialist (pre-2008 contract)', code: 'pre2008-as',
      salaries: [
        55973, 61904, 67833, 73760, 79688, 85616, 93445,
        100228, 103044, 106717, 110390, 112935, 116501, 120072,
      ],
    },
    {
      grade: 'Staff Grade Practitioner (pre-1997 contract)', code: 'pre1997-sg',
      salaries: [50639, 54660, 58678, 62697, 66717, 70737, 74755, 78774],
    },
    {
      grade: 'Staff Grade Practitioner (PCS(DD)1997/5)', code: 'pcsdd1997-5-sg',
      salaries: [
        50639, 54660, 58678, 62697, 66717, 71450,
        74755, 78774, 82794, 86814, 90835, 94854,
      ],
    },
  ] satisfies IncrementalScaleRow[],

  // ══ Annex D — Post-specific salaries/ranges (p11) ══
  salariedGpRange: {min: 79861, max: 119198},
  directorsPostgraduateEducation: 165250, // Crump — recorded, not wired
  dentalVocationalTraining: 42733, // recorded — set by SDR, not wired

  // ══ Annex F — Associate Adviser / Assistant Director scales (p14) ══
  // The Scottish equivalent of GP educators. Annual whole-time salary.
  associateAdvisers: [
    {grade: 'Introductory year', salary: 124020},
    {grade: 'AA01', salary: 129093},
    {grade: 'AA02', salary: 133317},
    {grade: 'AA03', salary: 138392},
    {grade: 'AD01', salary: 142620},
    {grade: 'AD02', salary: 146845},
    {grade: 'AD03', salary: 151918},
  ] satisfies AdviserRow[],

  // ══ Annex G — Public Dental Service spine (p15) ══
  // On the 3.75% uplift (para 3), not the 3.5% the rest of this
  // circular carries.
  // Band A Dental Officer (1-6), Band B Senior Dental Officer
  // (7-12), Band C (13-18). Band C's three roles share the spine
  // from point 13: Assistant Clinical Director 13-15, Specialist
  // Dental Officer 13-16, Clinical Director/CADO 13-18.
  //
  // Read the band boundaries from the RENDERED page, not from
  // `pdftotext`: the Band cells are vertically merged, so a text
  // dump prints the label beside whichever row it happens to align
  // with and reads as though B began at 9. England's own circular
  // states the same two boundaries in words — "salary point 7 is
  // the entry level to Band B", "point 13 … to Band C".
  salariedDentalSpine: [
    {band: 'A', point: 1,  salary: 56147},
    {band: 'A', point: 2,  salary: 62386},
    {band: 'A', point: 3,  salary: 71744},
    {band: 'A', point: 4,  salary: 76420},
    {band: 'A', point: 5,  salary: 81100},
    {band: 'A', point: 6,  salary: 84219},
    {band: 'B', point: 7,  salary: 87337},
    {band: 'B', point: 8,  salary: 90456},
    {band: 'B', point: 9,  salary: 95135},
    {band: 'B', point: 10, salary: 97475},
    {band: 'B', point: 11, salary: 99815},
    {band: 'B', point: 12, salary: 102153},
    {band: 'C', point: 13, salary: 104492},
    {band: 'C', point: 14, salary: 107612},
    {band: 'C', point: 15, salary: 110729},
    {band: 'C', point: 16, salary: 112734},
    {band: 'C', point: 17, salary: 115762},
    {band: 'C', point: 18, salary: 118790},
  ] satisfies SpineRow[],

  // ── Recorded, not transcribed ────────────────────────────────
  //  · Annex B Transitional consultant pay (2004 transfers, Appendix 3
  //    Table 7) — a closed transitional path, no live grade maps to it.
  //  · Annex G sessional fees (Dental Officer £42.30/hr, Senior Dental
  //    Officer £56.08/hr, part-time hospital consultant £69.21/hr) —
  //    hourly, not a basic-pay scale.
  //  · Annex H uplifts to other fees and allowances — not basic pay.
  //  · Training grades — published in PCS(DD)2026/01, transcribed there.
} as const;
