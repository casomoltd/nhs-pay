/**
 * NHS headline pay awards by nation, year and staff family, for both
 * pay frameworks: Agenda for Change, and medical & dental.
 *
 * A negotiated award is published data, NOT derivable from the scale
 * points. Per-point rounding diverges from the headline, and a staged
 * award has no single scale ratio. For doctors the case is starker: a
 * medical & dental circular prints salary scales and no percentage at
 * all. Replaying an award onto the prior year's points reproduces the
 * published figures only to within £1, and the error changes direction
 * between publishers — so awards are recorded here as cited constants
 * and the scales stay transcribed, never derived.
 *
 * Each record is **self-describing**: it carries its nation, year and
 * family as fields rather than relying on where it was found, so an
 * award handed to a caller can say what it applies to. That is why the
 * table is a flat list — a keyed cube would duplicate every coordinate
 * in a field, and the two could disagree.
 *
 * Across both frameworks the figure is what a nation ACCEPTED, never
 * what its review body recommended: a recommendation can be modified,
 * staged or refused on the way in, and when it is, the acceptance is
 * right and the report is not. A nation that has accepted nothing has
 * no row — absence is the honest record of "not announced", which is
 * why Northern Ireland has no 2026-27 medical entry.
 *
 * What this does NOT record is whether our own scale tables carry an
 * award yet. That is already answered by the published scales: compare
 * the year a scale resolved to against the year of the award. A stored
 * flag would be a second source of truth, free to drift from the
 * circulars the moment one publishes.
 *
 * Sources are pinned per row in tests/fixtures/, and every row carries
 * its own {@link AwardSource} so a consumer cites the instrument rather
 * than hand-typing it. Employer-body summaries are deliberately not
 * cited: accurate as they are, they restate an instrument rather than
 * being one.
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, TAX_YEARS} from '@casomoltd/paye-calc';
import {AwardUnavailable} from './errors.js';
import {AFC_BANDS, AFC_BAND_IDS} from './scales.js';
import type {AfcBandId} from './scales.js';
import {MEDICAL_GRADES, MEDICAL_GRADE_IDS} from './medical-scales.js';
import type {MedicalGradeId} from './medical-scales.js';
import {DENTAL_GRADES, DENTAL_GRADE_IDS} from './dental-scales.js';
import type {DentalGradeId} from './dental-scales.js';

/**
 * Every identifier that names a pay scale, across both frameworks —
 * 11 AfC bands, 22 medical grades, 13 dental. The three sets are
 * disjoint, so the union is safe to key a total Record by.
 */
export type PayScaleId =
  | AfcBandId
  | MedicalGradeId
  | DentalGradeId;

/**
 * The staff groups an award is announced for. These are the AWARD's
 * own groupings, coarser than a reader-facing role: one figure covers
 * consultants, SAS and salaried GPs alike.
 *
 * The VALUES are prefixed because the bare words collide with three
 * other identifier unions — `resident` and `salaried-dental` are grade
 * ids, and `medical` is a `RoleKind`. Without the prefix a grade id
 * would compile where a family is required and return a plausible but
 * wrong answer. The keys are unprefixed, so call sites read normally.
 */
export const AWARD_FAMILIES = {
  /** Every AfC band. One award covers all of them, which is a family
   *  of one group — not the absence of a family. */
  afc: 'award-afc',
  /** Consultants, SAS doctors & dentists, and salaried GPs. */
  medical: 'award-medical',
  /** Doctors & dentists in training. */
  resident: 'award-resident',
  /** Salaried dentists in community & public dental services. */
  salariedDental: 'award-salaried-dental',
} as const;

export type AwardFamily =
  (typeof AWARD_FAMILIES)[keyof typeof AWARD_FAMILIES];

/**
 * The document that enacted an award — not commentary about it. Held
 * on the record so a consumer cites the instrument rather than keeping
 * its own copy of the URL.
 */
export interface AwardSource {
  /** Who issued it — 'the Scottish Government', 'NHS Wales'. */
  readonly issuer: string;
  /**
   * The document's own title or publisher reference, as printed:
   * 'PCS(AFC)2026/1', 'HCWS1340', 'NHS pay awards'.
   *
   * Identity, deliberately not a phrase. An earlier shape held one
   * reader-facing sentence fragment per source, which a consumer then
   * spliced into its own grammar — and produced "voted to accept a the
   * government's offer" on a live page. Wording is the consumer's;
   * this says which document it is.
   */
  readonly reference: string;
  /** The document itself, for a page to link. */
  readonly url: string;
  /** ISO date the instrument was issued. */
  readonly issued: string;
  /**
   * ISO date by which a NEWER instrument is expected to replace or
   * revise this one.
   *
   * Two jobs, which is why it is one field rather than a note. It
   * lets a page tell a reader how fresh the figures are — "published
   * 23 January 2026, next expected April 2027" — and it lets a check
   * assert the date is still in the future. Once it passes, the page
   * is visibly claiming something stale and nobody has to remember to
   * look.
   *
   * A lapsed date is NOT necessarily our error. Northern Ireland has
   * missed its cycle two years running; saying so is more useful to a
   * reader than silence, and locates the delay where it belongs.
   *
   * Usually the ordinary annual cycle. Where it is not — a settlement
   * with a review trigger written into it — {@link nextExpectedReason}
   * says what the trigger is.
   */
  readonly nextExpected?: string;
  /**
   * Why a newer instrument is expected then, when the answer is not
   * "the next annual round".
   *
   * Scotland's 2025-26 settlement is the case this exists for: it
   * carried an inflation guarantee of at least a point above average
   * CPI for the calendar year, so a revision was a scheduled
   * contingency with a knowable date — CPI confirms in January — and
   * it duly arrived on 23 January 2026, moving 4.25% to 4.4%. A
   * foreseeable revision that nothing was watching for is how 50 pay
   * points stayed understated for a year.
   */
  readonly nextExpectedReason?: string;
}

/**
 * Whether a source is still within the window in which it is the
 * newest instrument expected to exist.
 *
 * `lapsed` means the date we expected a successor by has passed and
 * we hold no successor — so either the publisher is late, or one
 * exists and we have not transcribed it. Both are worth surfacing;
 * the caller decides which it is.
 *
 * `unknown` where no `nextExpected` is recorded. Absence of a date is
 * not evidence of currency, and a consumer must never render it as
 * "current" — nor render nothing, which reads the same way. House
 * position is to state the gap: an unchecked citation should not look
 * identical to a fresh one.
 */
export type SourceCurrency = 'current' | 'lapsed' | 'unknown';

export function sourceCurrency(
  source: AwardSource,
  today: Date,
): SourceCurrency {
  if (!source.nextExpected) {
    return 'unknown';
  }
  return source.nextExpected >= today.toISOString().slice(0, 10)
    ? 'current'
    : 'lapsed';
}

/** One nation's settled award, for one family in one year. */
export interface PayAward {
  readonly kind: 'settled';
  readonly nation: Nation;
  readonly year: TaxYear;
  readonly family: AwardFamily;
  /** Headline consolidated uplift — `3.5` means 3.5%. */
  readonly pct: number;
  /**
   * The date the award takes effect, which pay is backdated to. Held
   * per row rather than derived from the tax year: an award need not
   * start on 6 April, and a new contract within a round can start
   * mid-year.
   */
  readonly effectiveFrom: string;
  /**
   * The month (`YYYY-MM`) the announcement expected the money to reach
   * salaries, where it said so. An expectation the source published,
   * not a guarantee and not a payroll date.
   */
  readonly expectedInPay?: string;
  readonly source: AwardSource;
  /** The scales this award reaches. Derived from {@link AWARD_COVERAGE}
   *  at load, never authored, so the two cannot disagree. */
  readonly covers: readonly PayScaleId[];
}

/**
 * An agreed change to pay that CANNOT yet be stated as a percentage
 * against a published scale — a sibling of {@link PayAward}, not a
 * state of one. Everything in the award table is already accepted;
 * what differs here is that no headline figure applies.
 *
 * It carries NO `pct`, and that absence is the design: a consumer
 * cannot render a figure that does not exist, because there is nowhere
 * to read one from. Anything quantitative stays prose beside the cited
 * instrument until a circular makes it an award.
 */
export interface ForthcomingChange {
  readonly kind: 'forthcoming';
  readonly nation: Nation;
  readonly family: AwardFamily;
  /** When it starts, or its first phase where it is staged. */
  readonly effectiveFrom: string;
  /** Later phases, as ISO dates and only where the source gives one —
   *  a change phased "during 2027" gets no invented date here. */
  readonly laterPhases?: readonly string[];
  readonly source: AwardSource;
  readonly covers: readonly PayScaleId[];
}

/**
 * What the library knows about a scale's pay movement. A caller must
 * narrow on `kind` before rendering, which is the point: quoting a
 * percentage that only a settled award carries becomes a compile error
 * rather than a review catch.
 */
export type PayChange = PayAward | ForthcomingChange;

/** A row as authored — the record minus what is derived from it. */
type AwardRow = Omit<PayAward, 'covers'>;
type ForthcomingRow = Omit<ForthcomingChange, 'covers'>;

// ── Coverage: which family covers each scale ─────
//
// Total over PayScaleId, so a new grade fails the build until someone
// says which award covers it — the compiler asks the question rather
// than a reviewer noticing. It states coverage at the granularity the
// ANNOUNCEMENTS state it: it claims a grade belongs to a staff group,
// never that a nation awarded that grade a percentage. Whether the
// group has an award in a given nation and year is the table below's
// answer, and is frequently "no".
//
// The eleven identical AfC rows are the point, not noise: the NHSPRB
// settles ONE award covering every band, and saying so here makes it a
// checkable claim rather than something implied by a lookup that takes
// no band.

const AWARD_COVERAGE: Record<PayScaleId, AwardFamily> = {
  [AFC_BANDS.B2]: AWARD_FAMILIES.afc,
  [AFC_BANDS.B3]: AWARD_FAMILIES.afc,
  [AFC_BANDS.B4]: AWARD_FAMILIES.afc,
  [AFC_BANDS.B5]: AWARD_FAMILIES.afc,
  [AFC_BANDS.B6]: AWARD_FAMILIES.afc,
  [AFC_BANDS.B7]: AWARD_FAMILIES.afc,
  [AFC_BANDS.B8a]: AWARD_FAMILIES.afc,
  [AFC_BANDS.B8b]: AWARD_FAMILIES.afc,
  [AFC_BANDS.B8c]: AWARD_FAMILIES.afc,
  [AFC_BANDS.B8d]: AWARD_FAMILIES.afc,
  [AFC_BANDS.B9]: AWARD_FAMILIES.afc,

  // Consultants, SAS and salaried GPs — DDRB recommendation 1's
  // "consultants, SAS doctors and dentists, salaried GPs".
  [MEDICAL_GRADES.consultant]: AWARD_FAMILIES.medical,
  [MEDICAL_GRADES.specialtyDoctor]: AWARD_FAMILIES.medical,
  [MEDICAL_GRADES.specialist]: AWARD_FAMILIES.medical,
  [MEDICAL_GRADES.salariedGp]: AWARD_FAMILIES.medical,
  [MEDICAL_GRADES.gpEducator]: AWARD_FAMILIES.medical,
  [MEDICAL_GRADES.staffGrade]: AWARD_FAMILIES.medical,
  [MEDICAL_GRADES.associateSpecialist]: AWARD_FAMILIES.medical,
  [MEDICAL_GRADES.specialtyDoctor2008]: AWARD_FAMILIES.medical,
  [MEDICAL_GRADES.associateSpecialist2008]: AWARD_FAMILIES.medical,
  [MEDICAL_GRADES.hospitalPractitioner]: AWARD_FAMILIES.medical,
  // The least certain entry: a locally-employed doctor holds a
  // non-training post, so it sits with the other non-training grades —
  // but no announcement names the group explicitly. Revisit if a round
  // ever treats LEDs separately.
  [MEDICAL_GRADES.locallyEmployedDoctor]: AWARD_FAMILIES.medical,

  // Doctors in training — DDRB recommendation 1's "resident doctors".
  [MEDICAL_GRADES.resident]: AWARD_FAMILIES.resident,
  [MEDICAL_GRADES.fho1]: AWARD_FAMILIES.resident,
  [MEDICAL_GRADES.fho2]: AWARD_FAMILIES.resident,
  [MEDICAL_GRADES.sho]: AWARD_FAMILIES.resident,
  [MEDICAL_GRADES.spr]: AWARD_FAMILIES.resident,
  [MEDICAL_GRADES.str]: AWARD_FAMILIES.resident,
  [MEDICAL_GRADES.specialtyRegistrarCore]: AWARD_FAMILIES.resident,
  [MEDICAL_GRADES.specialtyRegistrarFixed]: AWARD_FAMILIES.resident,
  [MEDICAL_GRADES.gpRegistrarSho]: AWARD_FAMILIES.resident,
  [MEDICAL_GRADES.gpRegistrarSpr]: AWARD_FAMILIES.resident,
  [MEDICAL_GRADES.gpRegistrarStr]: AWARD_FAMILIES.resident,

  // Dentists in TRAINING take the resident award, not the salaried
  // dental one — the split a reader-facing "dental" grouping loses.
  [DENTAL_GRADES.dentalCoreTraining]: AWARD_FAMILIES.resident,
  [DENTAL_GRADES.dentalSpecialtyTraining]: AWARD_FAMILIES.resident,
  // A dental educator is an SAS dentist, so it takes the medical award.
  [DENTAL_GRADES.dentalEducator]: AWARD_FAMILIES.medical,

  // Salaried dentists in community & public dental services — DDRB
  // recommendation 2, a separate and higher figure.
  [DENTAL_GRADES.salariedDental]: AWARD_FAMILIES.salariedDental,
  [DENTAL_GRADES.salariedDentist]: AWARD_FAMILIES.salariedDental,
  [DENTAL_GRADES.seniorSalariedDentist]: AWARD_FAMILIES.salariedDental,
  [DENTAL_GRADES.assistantClinicalDirectorDentist]:
    AWARD_FAMILIES.salariedDental,
  [DENTAL_GRADES.clinicalDirectorDentist]: AWARD_FAMILIES.salariedDental,
  [DENTAL_GRADES.communityDentalOfficer]: AWARD_FAMILIES.salariedDental,
  [DENTAL_GRADES.seniorCommunityDentalOfficer]:
    AWARD_FAMILIES.salariedDental,
  [DENTAL_GRADES.assistantCommunityDentalClinicalDirector]:
    AWARD_FAMILIES.salariedDental,
  [DENTAL_GRADES.specialistCommunityDentist]:
    AWARD_FAMILIES.salariedDental,
  [DENTAL_GRADES.communityDentalClinicalDirector]:
    AWARD_FAMILIES.salariedDental,
};

// ── The awards ───────────────────────────────────

const DDRB_54_ENGLAND: AwardSource = {
  issuer: 'the UK government',
  reference: 'written ministerial statement HCWS1462',
  url: 'https://questions-statements.parliament.uk/written-statements'
    + '/detail/2026-03-25/hcws1462',
  issued: '2026-03-25',  // The DDRB reports annually and government responds in the
  // spring, ahead of the April start.
  nextExpected: '2027-04-01',
};

const DDRB_54_WALES: AwardSource = {
  issuer: 'the Welsh Government',
  reference: 'written statement on the 54th DDRB report',
  url: 'https://www.gov.wales'
    + '/written-statement-responding-54th-doctors-and-dentists-review-body',
  issued: '2026-03-25',  // The DDRB reports annually and government responds in the
  // spring, ahead of the April start.
  nextExpected: '2027-04-01',
};

const DDRB_54_SCOTLAND: AwardSource = {
  issuer: 'the Scottish Government',
  reference: 'NHS pay awards',
  url: 'https://www.gov.scot/news/nhs-pay-awards/',
  issued: '2026-08-12',  // The DDRB reports annually and government responds in the
  // spring, ahead of the April start.
  nextExpected: '2027-04-01',
};

const AFC_ENGLAND_2025: AwardSource = {
  issuer: 'the UK government',
  reference: 'NHS pay award 2025 to 2026',
  url: 'https://www.gov.uk/government/publications'
    + '/nhs-pay-awards-2025-to-2026-agenda-for-change-staff'
    + '/nhs-pay-award-2025-to-2026-a-fair-deal-for-nhs-staff',
  issued: '2025-05-22',
};
const AFC_ENGLAND_2026: AwardSource = {
  issuer: 'the UK government',
  reference: 'written ministerial statement HCWS1340',
  url: 'https://questions-statements.parliament.uk/written-statements'
    + '/detail/2026-02-12/hcws1340',
  issued: '2026-02-12',
  // The AfC round is annual and effective 1 April; the review
  // body reports and the government responds in the months
  // before it.
  nextExpected: '2027-04-01',
};
const AFC_WALES_2025: AwardSource = {
  issuer: 'the Welsh Government',
  reference: 'written statement on the 38th NHSPRB report',
  url: 'https://www.gov.wales'
    + '/written-statement-responding-38th-nhs-pay-review-body'
    + '-and-53rd-doctors-and-dentists-review-body',
  issued: '2025-05-22',
};
const AFC_WALES_2026: AwardSource = {
  issuer: 'the Welsh Government',
  reference: 'written statement on the 39th NHSPRB report',
  url: 'https://www.gov.wales'
    + '/written-statement-responding-39th-nhs-pay-review-body',
  issued: '2026-02-12',
  // The AfC round is annual and effective 1 April; the review
  // body reports and the government responds in the months
  // before it.
  nextExpected: '2027-04-01',
};
/**
 * The prior year's Welsh circular. Same role as
 * {@link AFC_W_02_2026}: it publishes Wales's own ladder and its
 * allowance table, where the written statement announces only a
 * percentage.
 */
export const AFC_W_02_2025: AwardSource = {
  issuer: 'NHS Wales',
  reference: 'circular AfC(W) 02/2025',
  url: 'https://www.nhs.wales/files/pc-resources'
    + '/afc-w-02-2025-pdf-2-pdf/',
  issued: '2025-05-29',
};

/**
 * The circular that PUBLISHES the Welsh scales and allowances.
 *
 * Distinct from {@link AFC_WALES_2026}, which is the written
 * statement ANNOUNCING the percentage: the statement prints no
 * pay table and no allowance rate, so it cannot be the source of
 * either figure. Exported because `allowances.ts` cites the same
 * document — one document, one record.
 */
export const AFC_W_02_2026: AwardSource = {
  issuer: 'NHS Wales',
  reference: 'circular AfC(W) 02/2026',
  url: 'https://www.nhs.wales/files/pc-resources'
    + '/afc-w-02-2026-pdf-pdf/',
  // The date on the circular's face, not the date its rates
  // take effect (1 April 2026) — `issued` is when the
  // publisher said it, which is what dates the citation.
  issued: '2026-02-12',
  nextExpected: '2027-04-01',
};
/**
 * Both Scottish years. The two-year deal was ENACTED by
 * PCS(AFC)2025/5; this circular revised its 2025-26 figure once the
 * inflation guarantee triggered, and restates the 2026-27 one.
 *
 * Exported because the same circular also sets the on-call
 * availability allowance in `allowances.ts`: one document, one
 * record, so a corrected url or issue date cannot half-apply.
 */
export const AFC_SCOTLAND: AwardSource = {
  issuer: 'NHS Scotland',
  reference: 'circular PCS(AFC)2026/1',
  url: 'https://www.publications.scot.nhs.uk/files/pcs2026-afc-01.pdf',
  issued: '2026-01-23',
  // NOT the annual round — a REVISION lands first. Annex A carries
  // the same inflation guarantee into 2026-27: if CPI for calendar
  // 2026 averages above 2.75%, pay is adjusted, and the 2025-26
  // adjustment was paid the March after the calendar year. So the
  // next instrument to touch these figures is due around March
  // 2027, ahead of the 2027-28 round. Dating this at the annual
  // cycle would have us believe the figures were current through a
  // restatement — which is exactly how the 4.25% column stayed on
  // the site for a year.
  nextExpected: '2027-03-01',
  nextExpectedReason:
    'a possible restatement under the settlement\'s inflation '
    + 'guarantee, once CPI for calendar 2026 is confirmed',
};
/**
 * The document NHS Employers publishes the England/NI AfC scales
 * in. Unlike the devolved nations it is not a numbered circular —
 * NHS Employers states the scales on a per-year page — so the
 * `reference` names the publisher's own title for it.
 *
 * Exported for the same reason as the Welsh and NI circulars: a
 * consumer citing "where these figures come from" should read the
 * record, not keep its own copy of the URL.
 */
export const AFC_ENGLAND_SCALES: AwardSource = {
  issuer: 'NHS Employers',
  reference: 'Pay scales for 2026/27',
  url: 'https://www.nhsemployers.org'
    + '/articles/pay-scales-202627',
  issued: '2026-02-12',
  nextExpected: '2027-04-01',
};

/**
 * Northern Ireland's AfC pay arrangements circular — the instrument
 * that PUBLISHES the NI scales. Exported because consumers cite the
 * scale source, and NI's is not England's: it has its own circular,
 * its own issuer and its own reference.
 */
export const AFC_NI_2025: AwardSource = {
  issuer: 'the Department of Health (NI)',
  reference: 'HSC (AfC) (6) 2025',
  url: 'https://www.health-ni.gov.uk/sites/default/files/2025-12'
    + '/HE1%2025%20379860%20%20HSC%20%28AfC%29%20%286%29%202025%20-%20'
    + 'Agenda%20for%20Change%20Pay%20Arrangements%202025-26.pdf',
  issued: '2025-12-03',
};
/**
 * Northern Ireland's 2026-27 figure rests on a WEAKER instrument than
 * every other row here, and the difference is not modelled — it is
 * recorded here so a maintainer knows.
 *
 * The Health Minister stated a desire to proceed with 3.3% for AfC
 * staff in 2026/27, explicitly subject to his budgetary position; no
 * HSC pay circular implementing it had been issued as at 1 Sep 2026.
 * Every other row is a settled acceptance or an implementing circular.
 * Carrying that distinction as a field was considered and rejected:
 * the caveat's only use is wording on a page, and presentation copy is
 * the consumer's. Re-check for an implementing circular before relying
 * on this row, and revisit the decision if a second conditional award
 * ever appears.
 */
const AFC_NI_2026: AwardSource = {
  issuer: 'the Department of Health (NI)',
  reference: 'Health Minister’s statement on 2026/27 HSC pay',
  url: 'https://www.health-ni.gov.uk/news'
    + '/health-minister-reaffirms-commitment-time-pay-settlement-health-staff',
  issued: '2026-02-12',
  // Deliberately in the past. This is a ministerial statement of
  // intent, explicitly subject to the NI Executive's budget, and the
  // HSC (AfC) circular that would implement it has not appeared —
  // so a reader is looking at an announced figure with no
  // instrument behind it. Recording the lapse is the honest
  // position: the delay is the publisher's, and saying so is more
  // use to an NI reader than silence.
  nextExpected: '2026-04-01',
  nextExpectedReason:
    'the implementing HSC (AfC) pay circular, which normally follows '
    + 'the statement before the April start',
};

const AWARD_ROWS: readonly AwardRow[] = [
  {
    kind: 'settled',
    nation: NATION_KEYS.england, year: TAX_YEARS.Y2026_27,
    family: AWARD_FAMILIES.medical, pct: 3.5,
    effectiveFrom: '2026-04-01', expectedInPay: '2026-06',
    source: DDRB_54_ENGLAND,
  },
  {
    kind: 'settled',
    nation: NATION_KEYS.england, year: TAX_YEARS.Y2026_27,
    family: AWARD_FAMILIES.resident, pct: 3.5,
    effectiveFrom: '2026-04-01', expectedInPay: '2026-06',
    source: DDRB_54_ENGLAND,
  },
  {
    kind: 'settled',
    nation: NATION_KEYS.england, year: TAX_YEARS.Y2026_27,
    family: AWARD_FAMILIES.salariedDental, pct: 3.75,
    effectiveFrom: '2026-04-01', expectedInPay: '2026-06',
    source: DDRB_54_ENGLAND,
  },
  {
    kind: 'settled',
    nation: NATION_KEYS.wales, year: TAX_YEARS.Y2026_27,
    family: AWARD_FAMILIES.medical, pct: 3.5,
    effectiveFrom: '2026-04-01', source: DDRB_54_WALES,
  },
  {
    kind: 'settled',
    nation: NATION_KEYS.wales, year: TAX_YEARS.Y2026_27,
    family: AWARD_FAMILIES.resident, pct: 3.5,
    effectiveFrom: '2026-04-01', source: DDRB_54_WALES,
  },
  {
    kind: 'settled',
    nation: NATION_KEYS.wales, year: TAX_YEARS.Y2026_27,
    family: AWARD_FAMILIES.salariedDental, pct: 3.75,
    effectiveFrom: '2026-04-01', source: DDRB_54_WALES,
  },
  // Scotland records no `resident` row: its training grades were
  // settled separately under the BMA agreement and promulgated through
  // PCS(DD)2026/01, which prints scale points and no percentage.
  {
    kind: 'settled',
    nation: NATION_KEYS.scotland, year: TAX_YEARS.Y2026_27,
    family: AWARD_FAMILIES.medical, pct: 3.5,
    effectiveFrom: '2026-04-01', expectedInPay: '2026-09',
    source: DDRB_54_SCOTLAND,
  },
  {
    kind: 'settled',
    nation: NATION_KEYS.scotland, year: TAX_YEARS.Y2026_27,
    family: AWARD_FAMILIES.salariedDental, pct: 3.75,
    effectiveFrom: '2026-04-01', expectedInPay: '2026-09',
    source: DDRB_54_SCOTLAND,
  },
  // Northern Ireland has accepted no 2026-27 medical & dental award.
  // Its absence from this list IS the record of that.

  // ── Agenda for Change ──
  {
    kind: 'settled', nation: NATION_KEYS.england,
    year: TAX_YEARS.Y2025_26, family: AWARD_FAMILIES.afc,
    pct: 3.6, effectiveFrom: '2025-04-01', source: AFC_ENGLAND_2025,
  },
  {
    kind: 'settled', nation: NATION_KEYS.england,
    year: TAX_YEARS.Y2026_27, family: AWARD_FAMILIES.afc,
    pct: 3.3, effectiveFrom: '2026-04-01', source: AFC_ENGLAND_2026,
  },
  {
    kind: 'settled', nation: NATION_KEYS.wales,
    year: TAX_YEARS.Y2025_26, family: AWARD_FAMILIES.afc,
    pct: 3.6, effectiveFrom: '2025-04-01', source: AFC_WALES_2025,
  },
  {
    kind: 'settled', nation: NATION_KEYS.wales,
    year: TAX_YEARS.Y2026_27, family: AWARD_FAMILIES.afc,
    pct: 3.3, effectiveFrom: '2026-04-01', source: AFC_WALES_2026,
  },
  {
    // 4.4, not the 4.25 the two-year deal originally set: its inflation
    // guarantee (each year at least a point above that calendar year's
    // average CPI) triggered when 2025 CPI confirmed at 3.4%, and
    // PCS(AFC)2026/1 adjusted the rate backdated to 1 April 2025 with
    // arrears. 4.4% is the headline in force, not an average.
    kind: 'settled', nation: NATION_KEYS.scotland,
    year: TAX_YEARS.Y2025_26, family: AWARD_FAMILIES.afc,
    pct: 4.4, effectiveFrom: '2025-04-01', source: AFC_SCOTLAND,
  },
  {
    kind: 'settled', nation: NATION_KEYS.scotland,
    year: TAX_YEARS.Y2026_27, family: AWARD_FAMILIES.afc,
    pct: 3.75, effectiveFrom: '2026-04-01', source: AFC_SCOTLAND,
  },
  {
    kind: 'settled', nation: NATION_KEYS.northernIreland,
    year: TAX_YEARS.Y2025_26, family: AWARD_FAMILIES.afc,
    pct: 3.6, effectiveFrom: '2025-04-01', source: AFC_NI_2025,
  },
  {
    // Weaker instrument than every other row — see AFC_NI_2026.
    kind: 'settled', nation: NATION_KEYS.northernIreland,
    year: TAX_YEARS.Y2026_27, family: AWARD_FAMILIES.afc,
    pct: 3.3, effectiveFrom: '2026-04-01', source: AFC_NI_2026,
  },
];

/**
 * Changes agreed but not yet expressible as an award. Two instances,
 * both resident contracts:
 *  - England's offer, accepted July 2026, raises pay by a RANGE across
 *    nodal points with a second phase in April 2027 — a vector, not a
 *    headline, which is why no `pct` is recorded.
 *  - Wales replaces the 2002 resident contract with a 2026 one, phased
 *    by cohort. A contract replacement has no percentage at all.
 *
 * Each cites the instrument that agreed it, not commentary about it:
 * the government's own offer document, and the Welsh pay circular that
 * introduces the contract.
 */
const FORTHCOMING_ROWS: readonly ForthcomingRow[] = [
  {
    kind: 'forthcoming',
    nation: NATION_KEYS.england,
    family: AWARD_FAMILIES.resident,
    effectiveFrom: '2026-04-01',
    laterPhases: ['2027-04-01'],
    source: {
      issuer: 'the UK government',
      reference: 'offer to resident doctors June 2026',
      url: 'https://www.gov.uk/government/publications'
        + '/government-offer-to-resident-doctors-june-2026'
        + '/offer-to-bma-uk-resident-doctors-committee-june-2026'
        + '-accessible-version',
      issued: '2026-06-17',
    },
  },
  {
    // The later cohorts (core trainees, then registrars) are phased
    // across 2027 and 2028, which the circular gives as years rather
    // than dates — so `laterPhases` is absent rather than invented.
    kind: 'forthcoming',
    nation: NATION_KEYS.wales,
    family: AWARD_FAMILIES.resident,
    effectiveFrom: '2026-08-01',
    source: {
      issuer: 'NHS Wales',
      reference: 'circular M&D(W) 01/2026',
      url: 'https://www.nhs.wales/files/pc-resources'
        + '/md-w-0126-pay-award-02-04-26-version-2/',
      issued: '2026-05-05',
    },
  },
];

/** The scales a family reaches — the inverse of {@link AWARD_COVERAGE},
 *  computed once so the two directions cannot disagree. */
const ALL_SCALE_IDS: readonly PayScaleId[] = [
  ...AFC_BAND_IDS,
  ...MEDICAL_GRADE_IDS,
  ...DENTAL_GRADE_IDS,
];

/**
 * Iterated from the canonical id arrays, NOT `Object.keys` — a Record
 * lists integer-like keys first and in numeric order, which would put
 * band 9 ahead of 8a and hand a consumer an order the authored table
 * does not have.
 */
function scalesCoveredBy(family: AwardFamily): readonly PayScaleId[] {
  return ALL_SCALE_IDS.filter(
    (scale) => AWARD_COVERAGE[scale] === family,
  );
}

const AWARDS: readonly PayAward[] = AWARD_ROWS.map((row) => ({
  ...row,
  covers: scalesCoveredBy(row.family),
}));

const FORTHCOMING: readonly ForthcomingChange[] =
  FORTHCOMING_ROWS.map((row) => ({
    ...row,
    covers: scalesCoveredBy(row.family),
  }));

/**
 * Every award recorded for a pay scale in a nation, newest year first
 * — the "which awards affect this role?" direction, and the same
 * question whichever framework the scale belongs to. Empty where none
 * has been announced; absence is a normal state, not an error, because
 * a partly-settled round is the usual mid-year position.
 *
 * A list rather than a single award, because the question is about a
 * history: every award recorded for that scale's family in that
 * nation, newest year first.
 */
/** One producer for "this nation's awards in this family, newest
 *  first" — both public lookups read it. */
function awardsInFamily(
  nation: Nation,
  family: AwardFamily,
): readonly PayAward[] {
  return AWARDS
    .filter((a) => a.nation === nation && a.family === family)
    .sort((a, b) => b.year.localeCompare(a.year));
}

export function awardsFor(
  nation: Nation,
  scale: PayScaleId,
): readonly PayAward[] {
  return awardsInFamily(nation, AWARD_COVERAGE[scale]);
}

/**
 * Everything the library knows about a scale's pay movement in a
 * nation. Settled awards first, newest year first, then any
 * forthcoming changes — NOT one merged chronology, because the two
 * arms are not comparable: a settled award is dated by the year it
 * belongs to, a forthcoming change only by when it starts.
 *
 * Callers narrow on `kind`; those that only ever quote a percentage
 * should use {@link awardsFor} and never see the other arm.
 */
export function changesFor(
  nation: Nation,
  scale: PayScaleId,
): readonly PayChange[] {
  const family = AWARD_COVERAGE[scale];
  const forthcoming = FORTHCOMING.filter(
    (c) => c.nation === nation && c.family === family,
  );
  return [...awardsFor(nation, scale), ...forthcoming];
}

/**
 * The AfC award for a nation and year. Throws {@link AwardUnavailable}
 * rather than returning undefined — unlike the medical & dental
 * families, every nation settles an AfC award every year, so a missing
 * one is a real error and not the normal mid-year state.
 *
 * A convenience over the same table {@link awardsFor} reads: the AfC
 * headline needs no band, because one award covers every band, and
 * that fact is stated in AWARD_COVERAGE rather than implied by this
 * signature taking no band.
 */
export function afcAward(year: TaxYear, nation: Nation): PayAward {
  const award = awardsInFamily(nation, AWARD_FAMILIES.afc).find(
    (a) => a.year === year,
  );
  if (award === undefined) {
    throw new AwardUnavailable(year, nation);
  }
  return award;
}
