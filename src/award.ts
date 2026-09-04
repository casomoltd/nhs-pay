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
 * its own {@link DocumentSource} so a consumer cites the instrument rather
 * than hand-typing it. Employer-body summaries are deliberately not
 * cited: accurate as they are, they restate an instrument rather than
 * being one.
 */

import type {Nation, PayYear} from '@casomoltd/paye-calc';
import {payYear} from '@casomoltd/paye-calc';
import type {IsoDate, IsoMonth} from './iso-date.js';
import {isoDate, isoMonth} from './iso-date.js';
import {NATION_KEYS, TAX_YEARS} from '@casomoltd/paye-calc';
import {AwardUnavailable} from './errors.js';
import {DocumentSource} from './document-source.js';
import {
  AFC_ENGLAND_2025,
  AFC_ENGLAND_2026,
  AFC_NI_2025,
  AFC_NI_2026,
  AFC_SCOTLAND,
  AFC_WALES_2025,
  AFC_WALES_2026,
  DDRB_54_ENGLAND,
  DDRB_54_SCOTLAND,
  DDRB_54_WALES,
} from './sources.js';
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

/** One nation's settled award, for one family in one year. */
export interface PayAward {
  readonly kind: 'settled';
  readonly nation: Nation;
  readonly year: PayYear;
  readonly family: AwardFamily;
  /**
   * Headline consolidated uplift — `3.5` means 3.5%.
   *
   * The AWARD, which is not always the whole movement in the scales. A
   * round can carry a restructure alongside its percentage: England's
   * 2026-27 resident scale moved by more than this figure, because
   * PC(M&D) 1/2026 R2 applied the award and re-cut the nodal points in
   * the same circular. Rendering this as "the pay rise" understates
   * such a round; compare the published scales where that matters.
   */
  readonly pct: number;
  /**
   * The date the award takes effect, which pay is backdated to. Held
   * per row rather than derived from the tax year: an award need not
   * start on 6 April, and a new contract within a round can start
   * mid-year.
   */
  readonly effectiveFrom: IsoDate;
  /**
   * The month (`YYYY-MM`) the announcement expected the money to reach
   * salaries, where it said so. An expectation the source published,
   * not a guarantee and not a payroll date.
   *
   * MONTH precision, and typed as such: a consumer that needs a Date
   * from it must go through `firstOfMonth`, not splice a day on.
   */
  readonly expectedInPay?: IsoMonth;
  readonly source: DocumentSource;
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
  /** When the change starts. Where it is staged, this is the earliest
   *  phase NOT yet reflected in the published scales — England's row
   *  moved to April 2027 once R2 put the April 2026 phase in the
   *  circular, because a forthcoming record describes what has not
   *  landed. */
  readonly effectiveFrom: IsoDate;
  readonly source: DocumentSource;
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

const AWARD_ROWS: readonly AwardRow[] = [
  {
    kind: 'settled',
    nation: NATION_KEYS.england, year: payYear(TAX_YEARS.Y2026_27),
    family: AWARD_FAMILIES.medical, pct: 3.5,
    effectiveFrom: isoDate('2026-04-01'), expectedInPay: isoMonth('2026-06'),
    source: DDRB_54_ENGLAND,
  },
  {
    // `pct` is the DDRB award and nothing more, which for this one
    // family is LESS than the scale actually moved: PC(M&D) 1/2026 R2
    // applied the 3.5% and then restructured the nodal points under
    // the BMA agreement, so a 2026-27 England resident point can be
    // several percent above its 2025-26 counterpart. The award and the
    // scale delta are different quantities here, and a consumer
    // presenting this figure as the whole rise would understate it.
    kind: 'settled',
    nation: NATION_KEYS.england, year: payYear(TAX_YEARS.Y2026_27),
    family: AWARD_FAMILIES.resident, pct: 3.5,
    effectiveFrom: isoDate('2026-04-01'), expectedInPay: isoMonth('2026-06'),
    source: DDRB_54_ENGLAND,
  },
  {
    kind: 'settled',
    nation: NATION_KEYS.england, year: payYear(TAX_YEARS.Y2026_27),
    family: AWARD_FAMILIES.salariedDental, pct: 3.75,
    effectiveFrom: isoDate('2026-04-01'), expectedInPay: isoMonth('2026-06'),
    source: DDRB_54_ENGLAND,
  },
  {
    kind: 'settled',
    nation: NATION_KEYS.wales, year: payYear(TAX_YEARS.Y2026_27),
    family: AWARD_FAMILIES.medical, pct: 3.5,
    effectiveFrom: isoDate('2026-04-01'), source: DDRB_54_WALES,
  },
  {
    kind: 'settled',
    nation: NATION_KEYS.wales, year: payYear(TAX_YEARS.Y2026_27),
    family: AWARD_FAMILIES.resident, pct: 3.5,
    effectiveFrom: isoDate('2026-04-01'), source: DDRB_54_WALES,
  },
  {
    kind: 'settled',
    nation: NATION_KEYS.wales, year: payYear(TAX_YEARS.Y2026_27),
    family: AWARD_FAMILIES.salariedDental, pct: 3.75,
    effectiveFrom: isoDate('2026-04-01'), source: DDRB_54_WALES,
  },
  // Scotland records no `resident` row: its training grades were
  // settled separately under the BMA agreement and promulgated through
  // PCS(DD)2026/01, which prints scale points and no percentage.
  {
    kind: 'settled',
    nation: NATION_KEYS.scotland, year: payYear(TAX_YEARS.Y2026_27),
    family: AWARD_FAMILIES.medical, pct: 3.5,
    effectiveFrom: isoDate('2026-04-01'), expectedInPay: isoMonth('2026-09'),
    source: DDRB_54_SCOTLAND,
  },
  {
    kind: 'settled',
    nation: NATION_KEYS.scotland, year: payYear(TAX_YEARS.Y2026_27),
    family: AWARD_FAMILIES.salariedDental, pct: 3.75,
    effectiveFrom: isoDate('2026-04-01'), expectedInPay: isoMonth('2026-09'),
    source: DDRB_54_SCOTLAND,
  },
  // Northern Ireland has accepted no 2026-27 medical & dental award.
  // Its absence from this list IS the record of that.

  // ── Agenda for Change ──
  {
    kind: 'settled', nation: NATION_KEYS.england,
    year: payYear(TAX_YEARS.Y2025_26), family: AWARD_FAMILIES.afc,
    pct: 3.6, effectiveFrom: isoDate('2025-04-01'), source: AFC_ENGLAND_2025,
  },
  {
    kind: 'settled', nation: NATION_KEYS.england,
    year: payYear(TAX_YEARS.Y2026_27), family: AWARD_FAMILIES.afc,
    pct: 3.3, effectiveFrom: isoDate('2026-04-01'), source: AFC_ENGLAND_2026,
  },
  {
    kind: 'settled', nation: NATION_KEYS.wales,
    year: payYear(TAX_YEARS.Y2025_26), family: AWARD_FAMILIES.afc,
    pct: 3.6, effectiveFrom: isoDate('2025-04-01'), source: AFC_WALES_2025,
  },
  {
    kind: 'settled', nation: NATION_KEYS.wales,
    year: payYear(TAX_YEARS.Y2026_27), family: AWARD_FAMILIES.afc,
    pct: 3.3, effectiveFrom: isoDate('2026-04-01'), source: AFC_WALES_2026,
  },
  {
    // 4.4, not the 4.25 the two-year deal originally set: its inflation
    // guarantee (each year at least a point above that calendar year's
    // average CPI) triggered when 2025 CPI confirmed at 3.4%, and
    // PCS(AFC)2026/1 adjusted the rate backdated to 1 April 2025 with
    // arrears. 4.4% is the headline in force, not an average.
    kind: 'settled', nation: NATION_KEYS.scotland,
    year: payYear(TAX_YEARS.Y2025_26), family: AWARD_FAMILIES.afc,
    pct: 4.4, effectiveFrom: isoDate('2025-04-01'), source: AFC_SCOTLAND,
  },
  {
    kind: 'settled', nation: NATION_KEYS.scotland,
    year: payYear(TAX_YEARS.Y2026_27), family: AWARD_FAMILIES.afc,
    pct: 3.75, effectiveFrom: isoDate('2026-04-01'), source: AFC_SCOTLAND,
  },
  {
    kind: 'settled', nation: NATION_KEYS.northernIreland,
    year: payYear(TAX_YEARS.Y2025_26), family: AWARD_FAMILIES.afc,
    pct: 3.6, effectiveFrom: isoDate('2025-04-01'), source: AFC_NI_2025,
  },
  {
    // Weaker instrument than every other row — see AFC_NI_2026.
    kind: 'settled', nation: NATION_KEYS.northernIreland,
    year: payYear(TAX_YEARS.Y2026_27), family: AWARD_FAMILIES.afc,
    pct: 3.3, effectiveFrom: isoDate('2026-04-01'), source: AFC_NI_2026,
  },
];

/**
 * Changes agreed but not yet expressible as an award. Two instances,
 * both resident contracts:
 *  - England's April 2027 phase of the offer accepted July 2026, which
 *    moves pay by a RANGE across nodal points — a vector, not a
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
    // The offer's April 2026 phase is in the scales already, via
    // PC(M&D) 1/2026 R2 (`england-md-1-2026-r2.ts`); April 2027 is the
    // phase still to come, and a forthcoming row dates itself to what
    // has NOT landed.
    kind: 'forthcoming',
    nation: NATION_KEYS.england,
    family: AWARD_FAMILIES.resident,
    effectiveFrom: isoDate('2027-04-01'),
    source: new DocumentSource({
      issuer: 'the UK government',
      reference: 'offer to resident doctors June 2026',
      url: 'https://www.gov.uk/government/publications'
        + '/government-offer-to-resident-doctors-june-2026'
        + '/offer-to-bma-uk-resident-doctors-committee-june-2026'
        + '-accessible-version',
      issued: isoDate('2026-06-17'),
    }),
  },
  {
    // The later cohorts (core trainees, then registrars) are phased
    // across 2027 and 2028, which the circular gives as years rather
    // than dates. A forthcoming row carries one date, so those stay
    // prose on the page beside this citation.
    kind: 'forthcoming',
    nation: NATION_KEYS.wales,
    family: AWARD_FAMILIES.resident,
    effectiveFrom: isoDate('2026-08-01'),
    source: new DocumentSource({
      issuer: 'NHS Wales',
      reference: 'circular M&D(W) 01/2026',
      url: 'https://www.nhs.wales/files/pc-resources'
        + '/md-w-0126-pay-award-02-04-26-version-2/',
      issued: isoDate('2026-05-05'),
    }),
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

/**
 * Every award recorded for a pay scale in a nation, newest year first
 * — the "which awards affect this role?" direction, and the same
 * question whichever framework the scale belongs to. Empty where none
 * has been announced; absence is a normal state, not an error, because
 * a partly-settled round is the usual mid-year position.
 *
 * A list rather than a single award, because the question is about a
 * history, not just this year's figure.
 */
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
export function afcAward(year: PayYear, nation: Nation): PayAward {
  const award = awardsInFamily(nation, AWARD_FAMILIES.afc).find(
    (a) => a.year === year,
  );
  if (award === undefined) {
    throw new AwardUnavailable(year, nation);
  }
  return award;
}
