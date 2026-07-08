/**
 * Verbatim transcription of NHS Scotland Circular PCS(DD)2026/01 —
 * "Pay and Conditions of Service: Remuneration of Hospital Medical and
 * Dental Staff, Doctors and Dentists in Public Health Medicine and the
 * Community Health Service (Scotland)". Effective 1 April 2026.
 *
 * TRAINING GRADES ONLY. Para 2 states the pay uplift for Consultants,
 * Specialty & Specialist Doctors and other staff is promulgated in a
 * separate addendum — so those scales are absent from this circular
 * (the resolver fails loud for them until the addendum is transcribed).
 *
 * Scope captured: (a) basic-pay salary scales (Annex C training grades,
 * Annex D dental core training); (b) earnings supplements as annual £
 * (Annex H peripheral allowances). Every other table is recorded below
 * with a reason — they are rota-banding multipliers, flexible-trainee
 * pro-rata, GP-registrar supplements, or locum rates, not base scales.
 *
 * Public source: NHS Scotland — PCS(DD)2026/01,
 *   https://www.publications.scot.nhs.uk/files/pcs-dd-2026-01.pdf
 */

/** A grade's incremental scale — salaries left→right (Min, 1st…Nth). */
interface IncrementalScaleRow {
  grade: string;
  salaries: readonly number[];
}

export const SCOTLAND_PCS_DD_2026_01 = {
  circular: 'NHS Scotland PCS(DD)2026/01',
  nation: 'scotland',
  effectiveFrom: '2026-04-01',

  // ══ Annex C — Rates of pay, training grades (p5) ══
  // No pay-scale codes are printed. "^" points (in the source) are
  // awarded automatically except for unsatisfactory performance.
  trainingGrades: [
    {grade: 'Foundation House Officer 1', salaries: [37316, 39649, 41977]},
    {grade: 'Foundation House Officer 2', salaries: [46286, 49314, 52340]},
    {
      grade: 'Senior House Officer / Senior Dental House Officer',
      salaries: [46286, 49314, 52340, 55366, 58393, 61418, 64445],
    },
    {
      grade: 'Specialist Registrar',
      salaries: [
        51348, 53892, 56435, 58978, 62044,
        65112, 68184, 71251, 74318, 77389,
      ],
    },
    {
      grade: 'Specialty Registrar (Full)',
      salaries: [
        49217, 52229, 56435, 58978, 62044,
        65112, 68184, 71251, 74318, 77389,
      ],
    },
    {
      grade: 'Specialty Registrar (Fixed Term)',
      salaries: [49217, 52229, 56435, 58978, 62044, 65112],
    },
    {
      grade: 'Specialty Registrar (Core Training)',
      salaries: [49217, 52229, 56435, 58978, 62044, 65112],
    },
    {
      grade: 'GP Specialty Registrar (SHO)',
      salaries: [46286, 49314, 52340, 55366, 58393, 61418, 64445],
    },
    {
      grade: 'GP Specialty Registrar (SpR)',
      salaries: [
        51348, 53892, 56435, 58978, 62044,
        65112, 68184, 71251, 74318, 77389,
      ],
    },
    {
      grade: 'GP Specialty Registrar (StR)',
      salaries: [
        49217, 52229, 56435, 58978, 62044,
        65112, 68184, 71251, 74318, 77389,
      ],
    },
  ] satisfies IncrementalScaleRow[],

  // ══ Annex D — Post-specific salaries (p6) ══
  dentalCoreTraining: {stage: 'CT1', salary: 54662},

  // ══ Annex H — Peripheral allowances (p8) ══
  // Annual £ for designated training-grade posts approved by Ministers.
  peripheralAllowances: [4038.37, 3026.47, 2012.12],

  // RECORDED, not transcribed:
  //  · Annex H Banding supplements (p8) — multipliers of basic pay for
  //    rota intensity (1C ×1.2, 1B ×1.4, 1A ×1.5, 2B ×1.5, 2A ×1.8,
  //    3 ×2.0); not a base scale.
  //  · Table 1 Total salaries for full-time training posts (p9-10) —
  //    basic (== Annex C above) plus banded totals; banded columns derived.
  //  · Tables 2 & 3 Flexible trainees < 40 hrs (p11-13) — pro-rata + banded.
  //  · Table 4 GP Specialty Registrars guidance + General Allowance
  //    "Training Grant" £12,030 (p14) — registrar/trainer grant.
  //  · Table 5 Payment to GP Specialty Registrars (p15-16) — basic (== the
  //    SHO/SpR/StR scales above) + a conditional GPR supplement across
  //    historical supplement periods; the supplement is not base pay.
  //  · Tables 6a & 6 Locum tenens appointments (p17-18) — banding
  //    multipliers, hourly and weekly locum rates.
} as const;
