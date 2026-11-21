/**
 * NHS Agenda for Change pay scales by pay year, for every nation, and the
 * lookups over them.
 *
 * Pure salary data — no metadata (labels, slugs, role
 * descriptions); presentation copy is a consumer concern.
 *
 * ── Where each nation's figures come from ──
 *
 * Scotland, Wales and Northern Ireland each publish an AfC pay
 * CIRCULAR, so each is transcribed verbatim in `src/circulars/*` and
 * translated to canonical points by `afc-scales.ts`. This module holds
 * the result, not the transcription.
 *
 * England publishes no AfC circular, so its tables are transcribed from
 * the publisher's page in `src/published/england-afc.ts` (the README's
 * AfC pay scales rule) and translated by `afc-scales.ts` like the
 * others. The HCAS zones and the Welsh living-wage floor sit beside it
 * in `src/published/`, each citing its own
 * source. The other three nations' sources are cited in their own
 * circular files, beside the data they justify — including the warning
 * that Scotland's MSG consolidated table prints superseded 4.25% rates and
 * must not be read instead of the circular.
 *
 * POINT LABELS — one convention, all four nations. A point's label is
 * the year of service in which a member first reaches it: increment 1
 * is `Year 1`, and the top point takes a `+` because service continues
 * past it. No publisher prints such a label; every one is our reading
 * of an interval the publisher does print. For all four nations the
 * year is derived in `afc-scales.ts`, from the transcribed interval
 * (England, Wales, Northern Ireland) or Annex C's yearly increment
 * (Scotland), through `afcPoint`, which writes the label and the year
 * from one number, so
 * a label and the timing a pay path reads from it cannot disagree.
 *
 * Labels are lookup keys for `afcResolver.fromScalePoint`, so changing
 * one is an API change, and the fixtures assert them.
 *
 * Pension tiers are a separate read (`getPensionTiers`), since a nation
 * can publish a scale for a year with no tier table.
 */

import type {
  Nation, PayYear, TaxYear, YearLabel,
} from '@casomoltd/paye-calc';
import {
  NATION_KEYS,
  YEAR_LABELS,
  closingYearOf,
} from '@casomoltd/paye-calc';
import {ScaleUnavailable, invariant} from './errors.js';
import type {DocumentSource} from './document-source.js';
import {
  AFC_ENGLAND_SCALES_2025,
  AFC_ENGLAND_SCALES_2026,
  AFC_NI_2025,
  AFC_SCOTLAND,
  AFC_W_02_2025,
  AFC_W_02_2026,
} from './sources.js';
import {onlyPointLabelled} from './scale-point.js';
import type {PayLadder, SteppedPoint} from './scale-point.js';
import type {SalaryRange} from './values.js';
import {salaryRangeOf} from './values.js';
import {
  ENGLAND_TABLES_2025_26,
  ENGLAND_TABLES_2026_27,
  NI_TABLES_2025_26,
  SCOTLAND_TABLES_2025_26,
  SCOTLAND_TABLES_2026_27,
  WALES_TABLES_2025_26,
  WALES_TABLES_2026_27,
} from './afc-scales.js';
import type {AfcTables, PrintedBand1} from './afc-scales.js';
import {AFC_BAND_IDS} from './afc-band.js';
import type {AfcBandId} from './afc-band.js';
import {schemeYearOfPayYear} from './pay-year.js';
import type {SchemeYearEnd} from './pension/scheme-year.js';

/** What {@link afcPayYearFor} finds for a scheme year. */
export const AFC_PAY_YEAR_KINDS = {
  /** This library holds the nation's scale for the year. */
  held: 'held',
  /** The year is before the earliest scale this library holds for the
   *  nation. */
  notHeld: 'notHeld',
  /** The year is after the latest scale this library holds for the
   *  nation, and no later than the round after the tax year given: its
   *  award is awaited. A year further on is refused. */
  awaited: 'awaited',
} as const;

/** A scheme year's AfC pay year, or why there is none to read. */
export type AfcPayYearLookup =
  | {readonly kind: typeof AFC_PAY_YEAR_KINDS.held; readonly year: PayYear}
  | {readonly kind: typeof AFC_PAY_YEAR_KINDS.notHeld}
  | {readonly kind: typeof AFC_PAY_YEAR_KINDS.awaited};

/** One nation's published AfC scale for one year: its ladder per band,
 *  its Band 1, and the document that publishes it. One record, so a year cannot be
 *  served without a source to cite, nor cited without a scale. */
interface AfcScaleYear extends AfcTables {
  readonly source: DocumentSource;
}

/** Band 1 for a nation and pay year: the figure and status its publisher
 *  prints, with the year and source it is held under. */
export interface AfcBand1 extends PrintedBand1 {
  readonly year: PayYear;
  readonly source: DocumentSource;
}

/** A band's nation, attached from the key it is stored under rather
 *  than stored beside it — one fact, one producer. */
export interface AfcBand1Published extends AfcBand1 {
  readonly nation: Nation;
}

/** One AfC band's published ladder for a nation and year. */
export interface AfcBandMeta {
  band: AfcBandId;
  points: SteppedPoint[];
  salary: SalaryRange;
  /** The document that publishes these figures for this nation and
   *  year — the same value across a nation's bands, because one
   *  circular publishes the whole ladder. Carried per band anyway so a
   *  consumer reads a scale's source the same way whichever family it
   *  is rendering; medical and dental genuinely differ per grade. */
  source: DocumentSource;
}

/**
 * Every nation's published AfC scales, by pay year. Total over Nation, so
 * adding a nation is a compile error here rather than a silent fall-through
 * to England's. Each nation is its own even where the figures coincide.
 *
 * Held per (nation, year), source included: a year-blind citation puts the
 * 2026/27 pay-scales page beneath a 2025-26 table, which reads as a claim
 * the reader cannot check. England and Northern Ireland share a salary
 * TABLE and do not share a SOURCE: NI publishes its own circular, and its
 * figures matching England's is a fact about the two publishers rather
 * than a licence to cite one for the other.
 *
 * Every nation's points come through `afc-scales.ts`: the three devolved
 * nations from their verbatim circulars, England from its NHS Employers
 * page in `published/`. Each record carries the nation-year's Band 1
 * beside its ladder, so a new round is one entry here.
 */
const AFC_SCALE_YEARS: Record<
  Nation, Partial<Record<YearLabel, AfcScaleYear>>
> = {
  [NATION_KEYS.england]: {
    [YEAR_LABELS.Y2025_26]:
      {...ENGLAND_TABLES_2025_26, source: AFC_ENGLAND_SCALES_2025},
    [YEAR_LABELS.Y2026_27]:
      {...ENGLAND_TABLES_2026_27, source: AFC_ENGLAND_SCALES_2026},
  },
  [NATION_KEYS.northernIreland]: {
    // One year: NI has issued no 2026-27 circular (see NI_TABLES_2025_26).
    [YEAR_LABELS.Y2025_26]: {...NI_TABLES_2025_26, source: AFC_NI_2025},
  },
  [NATION_KEYS.scotland]: {
    // One circular restates both years: PCS(AFC)2026/1 revised the
    // 2025-26 figure when the inflation guarantee triggered and restates
    // 2026-27, so it is current for each.
    [YEAR_LABELS.Y2025_26]:
      {...SCOTLAND_TABLES_2025_26, source: AFC_SCOTLAND},
    [YEAR_LABELS.Y2026_27]:
      {...SCOTLAND_TABLES_2026_27, source: AFC_SCOTLAND},
  },
  [NATION_KEYS.wales]: {
    [YEAR_LABELS.Y2025_26]:
      {...WALES_TABLES_2025_26, source: AFC_W_02_2025},
    [YEAR_LABELS.Y2026_27]:
      {...WALES_TABLES_2026_27, source: AFC_W_02_2026},
  },
};

/**
 * England's latest AfC PAY year.
 *
 * Read from England's scale table, so it moves when a round is
 * transcribed rather than by hand. Typed as a `PayYear`: an unbranded
 * literal assigns to `TaxYear` and `PayYear` alike, and would pass into a
 * tax-year parameter silently.
 *
 * NOT a site-wide "current year": Northern Ireland is a round behind.
 * A consumer resolving figures for a reader's nation wants
 * `latestAfcYear(nation)`; a consumer applying deductions wants the tax
 * year in force, which it reads from its own clock.
 */
export const AFC_CURRENT_YEAR: PayYear = latestAfcYear(NATION_KEYS.england);

/** The previous AfC pay year, for a year-on-year comparison: the one
 *  before {@link AFC_CURRENT_YEAR} in England's table. */
export const AFC_PREVIOUS_YEAR: PayYear = previousAfcYear(NATION_KEYS.england);

/** The most rounds a pay year may sit from the tax year it is priced in:
 *  one, either way ({@link payRoundLag}). */
const MOST_ROUNDS_APART = 1;

/** A nation's AfC bands for a year, each with its ladder, salary range
 *  and source — synchronous, no file I/O. Every nation's ladder is
 *  transcribed from its own instrument, Northern Ireland's included
 *  though its figures match England's, so no nation's scale is computed
 *  from another's. `year` and `nation` are both required — the accessor
 *  never defaults a locale, since a forgotten `nation` would silently
 *  return England figures for every region. */
export function getAfcScales(
  year: PayYear,
  nation: Nation,
): AfcBandMeta[] {
  const {scales, source} = getScalesForYear(year, nation);
  return AFC_BAND_IDS.map((band) => ({
    band,
    points: scales[band],
    salary: salaryRangeOf(scales[band]),
    source,
  }));
}

/**
 * Band 1 for a nation and pay year. Throws {@link ScaleUnavailable} for a
 * year that nation has not published, as {@link getAfcScales} does, so
 * the two reads of one ladder fail the same way.
 *
 * Deliberately NOT part of `AFC_BANDS` or the scale list. Band 1 joining
 * either shifts every index that reads the list by position, and this
 * needs to shift nothing — it is a lookup beside the ladder, not a rung
 * added to it.
 */
export function afcBand1(
  year: PayYear,
  nation: Nation,
): AfcBand1Published {
  const {band1, source} = getScalesForYear(year, nation);
  return {...band1, year, source, nation};
}

/** One band's published ladder for a pay year and nation. Every band is
 *  on every ladder (a nation-year's scales are total over the bands), so
 *  only the year and nation can be unpublished, which throws
 *  {@link ScaleUnavailable}. */
export function afcBandPoints(
  year: PayYear,
  nation: Nation,
  band: AfcBandId,
): SteppedPoint[] {
  return getScalesForYear(year, nation).scales[band];
}

/**
 * The point labelled `label` on an AfC band, with the band's points, for
 * a pay year and nation, read from {@link getAfcScales}. Throws
 * `ScaleUnavailable` where the year and nation publish no scale or the
 * band has no such point, and `AmbiguousScalePoint` where the label names
 * more than one, so a caller never prices a point it did not ask for.
 */
export function afcPointOf(
  year: PayYear,
  nation: Nation,
  band: AfcBandId,
  label: string,
): PayLadder {
  const points = afcBandPoints(year, nation, band);
  const current = onlyPointLabelled(points, label, band,
    () => new ScaleUnavailable(nation, year, band, label));
  return {points, current};
}

/** The circular or page that publishes a nation's AfC scales for a
 *  year. Throws for a combination that has no published scale, in step
 *  with {@link getScalesForYear} — a scale we cannot cite is a scale we
 *  should not be serving. */
export function afcScaleSource(
  year: PayYear,
  nation: Nation,
): DocumentSource {
  return getScalesForYear(year, nation).source;
}

/** PAY years a given nation publishes AfC scales for, oldest
 *  first. Nations do not move in lockstep — a year one has
 *  published may be outstanding for another — so a caller
 *  resolving figures for a nation must ask for that nation's
 *  years rather than assuming England's.
 *
 *  Pay years, not tax years: this answers "which scale can I ask
 *  for", never "which tax rules apply". Northern Ireland publishes
 *  one pay year while every nation shares the same tax year. */
export function afcPayYears(nation: Nation): PayYear[] {
  // Sorted, not authoring order: the "oldest first" above is a
  // guarantee callers rely on (`latestAfcYear` and `previousAfcYear` read
  // the last two), and object-literal order would silently break it if
  // a new year were authored above an old one. Year labels collate in year
  // order because they are fixed-width and zero-padded.
  return (
    Object.keys(AFC_SCALE_YEARS[nation]) as PayYear[]
  ).sort((a, b) => a.localeCompare(b));
}

/**
 * The most recent year a nation has actually published AfC scales for.
 *
 * Nations do not move together: Northern Ireland's latest is a round
 * behind the others (see `NI_TABLES_2025_26` in `afc-scales.ts`). A
 * consumer that asks for a site-wide "current year" gets
 * `ScaleUnavailable` there, which is correct but is not an answer; this
 * is the answer.
 *
 * Lives here rather than in a consumer because it is a fact about what
 * this library holds. A consumer deriving it would be re-computing,
 * from the outside, something only these tables know.
 */
export function latestAfcYear(nation: Nation): PayYear {
  const years = afcPayYears(nation);
  const latest = years[years.length - 1];
  if (!latest) {
    // A plain Error, not ScaleUnavailable: that type's `year` is a
    // TaxYear, and there is no year to name here. Casting a filler
    // string into the union would make `error.year` lie to any caller
    // that reads it.
    throw new Error(
      `latestAfcYear: ${nation} publishes no AfC scale in any year`,
    );
  }
  return latest;
}

/**
 * How many rounds `payYear` sits behind `taxYear`. Positive means the pay
 * round is BEHIND the tax year; negative means it is ahead.
 *
 * ## The domain rule this exists to state
 *
 * A person's salary comes from an Agenda for Change round; the tax, NI
 * and pension tiers applied to it come from the tax year they are
 * being paid IN. Those are different facts that normally name the
 * same year, so one value serving both looks right until the day they
 * diverge.
 *
 * They diverge in exactly one way. An AfC round is agreed and
 * implemented by each nation separately, and a nation whose award is
 * not yet funded keeps paying last year's scales into this tax year.
 * Tax never waits: the thresholds change on 6 April whatever the
 * employer has settled.
 *
 * So the legitimate values are:
 *
 * | lag | meaning |
 * |---|---|
 * | `0` | the award is implemented; pay year and tax year agree |
 * | `1` | the award for this year is not yet in payment |
 * | `-1` | next year's round is out but its tax year has not begun |
 *
 * Anything else is a round that was never transcribed or a caller pricing
 * a stale round, not a fact about the world ({@link isPayRoundInReach}).
 *
 * Counted in years from each label's closing year, not by position in a
 * list of labels, so it holds however the labels are ordered. What this
 * cannot catch is a pay year passed where a tax year was wanted: the
 * distinct `PayYear` and `TaxYear` types are what stop that.
 */
export function payRoundLag(payYear: PayYear, taxYear: TaxYear): number {
  return closingYearOf(taxYear) - closingYearOf(payYear);
}

/**
 * True where `payYear` is a round this library will price under
 * `taxYear`'s deductions: at most one round from it, either way
 * ({@link payRoundLag}). One rule for every reader, so a caller refusing
 * a stale round and this library checking its own tables cannot disagree
 * about what "too far apart" means.
 */
export function isPayRoundInReach(payYear: PayYear, taxYear: TaxYear): boolean {
  return Math.abs(payRoundLag(payYear, taxYear)) <= MOST_ROUNDS_APART;
}

/**
 * How far a nation's newest published pay scales sit from `taxYear`:
 * {@link payRoundLag} of {@link latestAfcYear}. Positive means the pay
 * scales are BEHIND, which is the nations still paying an earlier round.
 *
 * `taxYear` is the caller's: this library holds no clock, so the tax year
 * in force is a fact the consumer brings, read at its own build or run.
 */
export function latestRoundLag(nation: Nation, taxYear: TaxYear): number {
  return payRoundLag(latestAfcYear(nation), taxYear);
}

/**
 * True while a nation is still paying an older round than `taxYear` — its
 * award is announced or awaited, but not in payment.
 *
 * The domain question ("is this nation behind?") rather than a
 * comparison against some particular year, so a consumer cannot get
 * the comparison subtly wrong: testing against a fixed year answers
 * "is it exactly 2025-26" and quietly says no for a nation two rounds
 * behind, which is the case that most needs saying yes.
 */
export function isAwaitingPayAward(nation: Nation, taxYear: TaxYear): boolean {
  return latestRoundLag(nation, taxYear) > 0;
}

/**
 * Fail loudly if any nation's newest scale is out of reach of `taxYear`
 * ({@link isPayRoundInReach}).
 *
 * A function rather than a module-scope check: this library is
 * published, and a throw at import time would take down every consumer
 * over a data problem they cannot fix. It runs in this repo's tests,
 * which is where a transcription gap should surface, and a consumer can
 * run it against the tax year it prices in.
 */
export function assertLatestRoundsInReach(taxYear: TaxYear): void {
  for (const nation of Object.keys(AFC_SCALE_YEARS) as Nation[]) {
    const latest = latestAfcYear(nation);
    invariant(
      isPayRoundInReach(latest, taxYear),
      `${nation} is ${payRoundLag(latest, taxYear)} rounds from the `
      + `${taxYear} tax year: its newest published scale is ${latest}. A `
      + `gap beyond ${MOST_ROUNDS_APART} round means a pay round was never `
      + 'transcribed, not that a nation skipped one.',
    );
  }
}

/**
 * The AfC pay year whose round runs over one scheme year, where this
 * library holds its scale for the nation, and otherwise which side of the
 * held years the scheme year falls ({@link AFC_PAY_YEAR_KINDS}). A pay year
 * is one scheme year (`pay-year.ts`). `taxYear` is the tax year in force,
 * which bounds how far ahead a round can be awaited.
 *
 * The round a scheme year names is not always the scale staff were paid
 * on in it: a nation whose award is late still pays the previous round's
 * scale (`latestRoundLag`, `latestAfcYear`). Ask those for that.
 */
export function afcPayYearFor(
  end: SchemeYearEnd,
  nation: Nation,
  taxYear: TaxYear,
): AfcPayYearLookup {
  const years = afcPayYears(nation);
  const year = years.find((y) => schemeYearOfPayYear(y) === end);
  if (year !== undefined) return {kind: AFC_PAY_YEAR_KINDS.held, year};
  if (end > schemeYearOfPayYear(latestAfcYear(nation))) {
    // A round can be awaited up to the one after `taxYear`; a year beyond
    // that has no round to wait for, which this cannot answer.
    const lastAwaitable = closingYearOf(taxYear) + MOST_ROUNDS_APART;
    invariant(end <= lastAwaitable,
      `afcPayYearFor: the scheme year ending ${end} is past the next pay `
      + `round (${lastAwaitable})`);
    return {kind: AFC_PAY_YEAR_KINDS.awaited};
  }
  // Below the latest and not found, so before the earliest: a nation's
  // years run unbroken, and a gap among them is a round never
  // transcribed.
  invariant(
    years.every((y) => schemeYearOfPayYear(y) > end),
    `afcPayYearFor: ${nation} has no AfC scale for the scheme year ending `
    + `${end}, between years it does hold`,
  );
  return {kind: AFC_PAY_YEAR_KINDS.notHeld};
}

/** The AfC year a nation published before its latest, for a year-on-year
 *  comparison. Throws where the nation holds only one year. */
function previousAfcYear(nation: Nation): PayYear {
  const years = afcPayYears(nation);
  const previous = years.slice(0, -1).at(-1);
  invariant(previous !== undefined,
    `previousAfcYear: ${nation} holds one AfC year only`);
  return previous;
}

/** Resolve a nation's published scale table for a year.
 *  Every figure returned is transcribed from that nation's
 *  own instrument, and each nation's fixture rows pin its
 *  values against its OWN document, so a divergence fails
 *  rather than propagating. Throws {@link ScaleUnavailable} for a
 *  year that nation has not published, rather than silently
 *  substituting another year's or nation's figures. */
function getScalesForYear(
  year: PayYear,
  nation: Nation,
): AfcScaleYear {
  const key: YearLabel = year;
  const held = AFC_SCALE_YEARS[nation][key];
  if (!held) {
    throw new ScaleUnavailable(nation, year);
  }
  return held;
}
