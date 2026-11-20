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
 * AfC pay scales rule). The HCAS zones and the Welsh living-wage floor sit beside it
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
 * of an interval the publisher does print. For the three circular
 * nations the year is derived in `afc-scales.ts` from the transcribed
 * interval; England's are authored as years in `published/`. All four go through
 * `afcPoint`, which writes the label and the year from one number, so
 * a label and the timing a pay path reads from it cannot disagree.
 *
 * Labels are lookup keys for `afcResolver.fromScalePoint`, so changing
 * one is an API change, and the fixtures assert them.
 */

import type {
  Nation, PayYear, YearLabel,
} from '@casomoltd/paye-calc';
import {
  NATION_KEYS,
  YEAR_LABELS,
  CURRENT_TAX_YEAR,
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
import type {SteppedPoint} from './scale-point.js';
import {
  NI_SCALES_2025_26,
  SCOTLAND_SCALES_2025_26,
  SCOTLAND_SCALES_2026_27,
  WALES_SCALES_2025_26,
  WALES_SCALES_2026_27,
} from './afc-scales.js';
import type {AfcBandId} from './afc-band.js';
import {ENGLAND_AFC_2025_26, ENGLAND_AFC_2026_27} from './published/england-afc.js';
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
   *  nation, and no later than the round after the tax year in force: its
   *  award is awaited. A year further on is refused. */
  awaited: 'awaited',
} as const;

/** A scheme year's AfC pay year, or why there is none to read. */
export type AfcPayYearLookup =
  | {readonly kind: typeof AFC_PAY_YEAR_KINDS.held; readonly year: PayYear}
  | {readonly kind: typeof AFC_PAY_YEAR_KINDS.notHeld}
  | {readonly kind: typeof AFC_PAY_YEAR_KINDS.awaited};

/** One nation's published AfC scale for one year: its ladder per band,
 *  and the document that publishes it. One record, so a year cannot be
 *  served without a source to cite, nor cited without a scale. */
interface AfcScaleYear {
  readonly scales: Record<AfcBandId, SteppedPoint[]>;
  readonly source: DocumentSource;
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
 * Scotland, Wales and Northern Ireland take their points from their
 * verbatim circulars through `afc-scales.ts`, which also holds each
 * circular's notes; England's are transcribed in `published/`.
 */
const AFC_SCALE_YEARS: Record<
  Nation, Partial<Record<YearLabel, AfcScaleYear>>
> = {
  [NATION_KEYS.england]: {
    [YEAR_LABELS.Y2025_26]:
      {scales: ENGLAND_AFC_2025_26, source: AFC_ENGLAND_SCALES_2025},
    [YEAR_LABELS.Y2026_27]:
      {scales: ENGLAND_AFC_2026_27, source: AFC_ENGLAND_SCALES_2026},
  },
  [NATION_KEYS.northernIreland]: {
    // One year: NI has issued no 2026-27 circular (see NI_SCALES_2025_26).
    [YEAR_LABELS.Y2025_26]: {scales: NI_SCALES_2025_26, source: AFC_NI_2025},
  },
  [NATION_KEYS.scotland]: {
    // One circular restates both years: PCS(AFC)2026/1 revised the
    // 2025-26 figure when the inflation guarantee triggered and restates
    // 2026-27, so it is current for each.
    [YEAR_LABELS.Y2025_26]:
      {scales: SCOTLAND_SCALES_2025_26, source: AFC_SCOTLAND},
    [YEAR_LABELS.Y2026_27]:
      {scales: SCOTLAND_SCALES_2026_27, source: AFC_SCOTLAND},
  },
  [NATION_KEYS.wales]: {
    [YEAR_LABELS.Y2025_26]:
      {scales: WALES_SCALES_2025_26, source: AFC_W_02_2025},
    [YEAR_LABELS.Y2026_27]:
      {scales: WALES_SCALES_2026_27, source: AFC_W_02_2026},
  },
};

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
  // guarantee callers rely on (`resolver.ts` reverses it to find the
  // latest year), and object-literal order would silently break it if
  // a new year were authored above an old one. Year labels collate in year
  // order because they are fixed-width and zero-padded.
  return (
    Object.keys(AFC_SCALE_YEARS[nation]) as PayYear[]
  ).sort((a, b) => a.localeCompare(b));
}

/**
 * How far a nation's newest published pay scales sit from the tax year
 * in force. Positive means the pay scales are BEHIND.
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
 * not yet funded keeps paying last year's scales into this tax year;
 * this function says which nations are. Tax never waits: the thresholds
 * change on 6 April whatever the employer has settled.
 *
 * So the legitimate values are:
 *
 * | lag | meaning |
 * |---|---|
 * | `0` | the award is implemented; pay year and tax year agree |
 * | `1` | the award for this year is not yet in payment |
 * | `-1` | next year's circular is out but its tax year has not begun |
 *
 * Anything else is a defect in THIS library's data, not a fact about
 * the world: a lag of 2 means a whole round was never transcribed.
 * {@link assertPayYearLagIsSane} is where that is enforced.
 *
 * What this cannot catch is a pay year passed where a tax year was
 * wanted: the values here would look perfectly legal. The distinct
 * `PayYear` and `TaxYear` types are what stop that.
 */
export function payYearLag(nation: Nation): number {
  // Counted in years from each label's closing year, not by position in a
  // list of labels, so it holds however the labels are ordered.
  return closingYearOf(CURRENT_TAX_YEAR) - closingYearOf(latestAfcYear(nation));
}

/**
 * True while a nation is still paying an older round than the tax year
 * in force — its award is announced or awaited, but not in payment.
 *
 * The domain question ("is this nation behind?") rather than a
 * comparison against some particular year, so a consumer cannot get
 * the comparison subtly wrong: testing against a fixed year answers
 * "is it exactly 2025-26" and quietly says no for a nation two rounds
 * behind, which is the case that most needs saying yes.
 */
export function isAwaitingPayAward(nation: Nation): boolean {
  return payYearLag(nation) > 0;
}

/**
 * Fail loudly if any nation's pay scales have drifted further from the
 * tax year than the domain allows. See {@link payYearLag}.
 *
 * A function rather than a module-scope check: this library is
 * published, and a throw at import time would take down every consumer
 * over a data problem they cannot fix. It runs in this repo's tests,
 * which is where a transcription gap should surface.
 */
export function assertPayYearLagIsSane(): void {
  for (const nation of Object.keys(AFC_SCALE_YEARS) as Nation[]) {
    const lag = payYearLag(nation);
    invariant(
      lag >= -1 && lag <= 1,
      `${nation} is ${lag} years from the tax year in force `
      + `(${CURRENT_TAX_YEAR}): its newest published scale is `
      + `${latestAfcYear(nation)}. A gap beyond one year means a pay `
      + 'round was never transcribed, not that a nation skipped one.',
    );
  }
}

/**
 * The AfC pay year whose round runs over one scheme year, where this
 * library holds its scale for the nation, and otherwise which side of the
 * held years the scheme year falls ({@link AFC_PAY_YEAR_KINDS}). A pay year
 * is one scheme year (`pay-year.ts`).
 *
 * The round a scheme year names is not always the scale staff were paid
 * on in it: a nation whose award is late still pays the previous round's
 * scale (`payYearLag`, `latestAfcYear`). Ask those for that.
 */
export function afcPayYearFor(
  end: SchemeYearEnd,
  nation: Nation,
): AfcPayYearLookup {
  const years = afcPayYears(nation);
  const year = years.find((y) => schemeYearOfPayYear(y) === end);
  if (year !== undefined) return {kind: AFC_PAY_YEAR_KINDS.held, year};
  if (end > schemeYearOfPayYear(latestAfcYear(nation))) {
    // A round can be awaited up to the one after the tax year in force; a
    // year beyond that has no round to wait for, which this cannot answer.
    const lastAwaitable = closingYearOf(CURRENT_TAX_YEAR) + 1;
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

/**
 * The most recent year a nation has actually published AfC scales for.
 *
 * Nations do not move together: Northern Ireland's latest is a round
 * behind the others (see `NI_SCALES_2025_26` in `afc-scales.ts`). A
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

/** The AfC year a nation published before its latest, for a year-on-year
 *  comparison. Throws where the nation holds only one year. */
export function previousAfcYear(nation: Nation): PayYear {
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
export function getScalesForYear(
  year: PayYear,
  nation: Nation,
): AfcScaleYear {
  const key: YearLabel = year;
  const base = AFC_SCALE_YEARS[nation][key];
  if (!base) {
    throw new ScaleUnavailable(nation, year);
  }
  return base;
}
