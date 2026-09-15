/**
 * Where one nation's pay round has got to, for one staff family, as at
 * a given moment.
 *
 * A DERIVED VIEW over records that already exist — the award table and
 * the published scales — so nothing here is authored and nothing can
 * drift from them. It exists because the question a page actually asks
 * is "what do I tell this reader today", and answering that from the
 * parts meant assembling `isOlderRound`, the award's `kind`,
 * `effectiveFrom`, `expectedInPay` and a document's own currency at
 * every call site. Five things to get right, and the failure mode is
 * silence rather than error: a condition assembled from some of them
 * answers a narrower question than the one asked, and a page that
 * should say something says nothing at all.
 *
 * The status is a closed union, so a consumer that forgets a state is
 * a compile error rather than a page that quietly implies payment.
 *
 * What this deliberately does NOT model is our own transcription
 * state. A circular that exists and we have not read is our fault, not
 * the world's, and it belongs in a check that fails rather than in a
 * status a page can render calmly. `SourceCurrency` is the other thing
 * it is not: that is a document's shelf-life for a provenance footer
 * and has no opinion about whether anybody has been paid.
 */

import type {Nation, PayYear} from '@casomoltd/paye-calc';
import type {DocumentSource} from './document-source.js';
import type {AwardFamily, PayAward, PayScaleId} from './award.js';
import {
  AWARD_FAMILIES,
  anyNationSettled,
  familyAward,
  familyForthcomingChange,
} from './award.js';
import {ScaleUnavailable, invariant} from './errors.js';
import type {IsoMonth} from './iso-date.js';
import {monthToDate} from './iso-date.js';
import {getMedicalScales} from './medical-scales.js';
import {getDentalScales} from './dental-scales.js';
import {afcScaleSource} from './scales.js';

/**
 * How far one nation's round has got, from nothing announced to money
 * observed in salaries.
 *
 * A string union rather than an enum, matching `SourceCurrency` and
 * the award's own `kind`.
 *
 * The order below is the order a round travels, and the gap between
 * the last two is the one that matters: `pending` expires to
 * `unconfirmed`, never to `inPayment`, because nothing in this library
 * observes whether money arrived. Letting a date close that gap would
 * turn an expectation a third party published into an event we
 * witnessed.
 */
export type RoundStatus =
  /** The round has begun and the nation has announced nothing. */
  | 'overdue'
  /** A change is agreed but carries no percentage yet. */
  | 'forthcoming'
  /** Announced, and not yet on a payslip so far as anyone has said. */
  | 'pending'
  /** Expected month gone, or never stated; nobody has checked. */
  | 'unconfirmed'
  /** Observed in salaries, with a date behind it. */
  | 'inPayment';

/**
 * Everything a page needs to describe one nation's round, in one read.
 *
 * Both documents are optional because the states above are precisely
 * the cases where one or both are absent — a nation with nothing
 * announced has no instrument to cite, and an announced round whose
 * circular has not landed has no scale document yet. A consumer
 * narrows on `status` before reaching for either.
 */
export interface PayRound {
  readonly status: RoundStatus;
  /** Absent unless the nation has settled this family's round. */
  readonly award?: PayAward;
  /** The instrument that ENACTED the award. */
  readonly announcement?: DocumentSource;
  /** The circular that PUBLISHED the scale points. */
  readonly circular?: DocumentSource;
}

/**
 * The round for a nation, family and year, as at `now`.
 *
 * Takes `now` rather than reading the clock, for the reason
 * `DocumentSource.currencyAt` does: a status is the answer to a
 * question about a moment, and a value computed at module load freezes
 * it for the life of the process.
 *
 * Answered by the YEAR asked about: where that round has an award, the
 * award settles the status, and an agreed change starting in a later
 * round is a later round's answer rather than this one's. A family can
 * hold both at once, an award already in salaries and a further phase
 * agreed for a round to come, and one status cannot carry both without
 * hiding one of them.
 *
 * Throws in the two cases where no honest status exists: a round the
 * award table does not reach, and a round that has not begun.
 */
export function payRound(
  nation: Nation,
  family: AwardFamily,
  year: PayYear,
  now: Date,
): PayRound {
  const award = familyAward(nation, family, year);
  if (award) {
    return {
      status: settledStatus(award, now),
      award,
      announcement: award.source,
      circular: circularFor(award, nation, year),
    };
  }
  invariant(
    anyNationSettled(family, year),
    `payRound: the award table holds no ${year} ${family} round for `
    + `any nation, so its absence for ${nation} says nothing about `
    + `${nation} — it says the table does not reach that round`,
  );
  // A forthcoming change carries its own instrument, which this view
  // does not surface: `announcement` means the document that enacted
  // an AWARD, and conflating the two is what the separate document
  // kinds exist to prevent. A caller rendering a forthcoming change
  // reads the change itself.
  if (familyForthcomingChange(nation, family)) {
    return {status: 'forthcoming'};
  }
  invariant(
    now >= roundStart(year),
    `payRound: ${nation}/${family} has nothing recorded for ${year} `
    + 'and that round has not begun, so there is no status to report '
    + '— answering would assert a nation is late for a round that has '
    + 'not started',
  );
  return {status: 'overdue'};
}

/**
 * Where a settled award has got to.
 *
 * The absent-`expectedInPay` case reads as `unconfirmed` rather than
 * `pending`, and the distinction is load-bearing. `pending` is a
 * positive claim that money has not arrived, and the only evidence for
 * it is a publisher naming a month still in the future. Where no month
 * was ever published there is no basis for that claim, and making one
 * would put "your pay is confirmed and not yet in salaries" on a page
 * whose money may have landed months ago. Absence of
 * the field means the publisher never said, which is the same position
 * as a month that has since passed: nobody has checked.
 */
export function settledStatus(award: PayAward, now: Date): RoundStatus {
  if (award.confirmedInPay) {
    return 'inPayment';
  }
  if (!award.expectedInPay) {
    return 'unconfirmed';
  }
  return monthHasCompleted(award.expectedInPay, now)
    ? 'unconfirmed'
    : 'pending';
}

/**
 * Whether `now` is past the last day of a month.
 *
 * Compared as dates, never as text: a 'YYYY-MM' sorts before every
 * 'YYYY-MM-DD' inside it, so September 2026 would read as earlier than
 * 1 September 2026.
 */
function monthHasCompleted(month: IsoMonth, now: Date): boolean {
  const start = monthToDate(month);
  const afterEnd = new Date(
    start.getFullYear(), start.getMonth() + 1, 1,
  );
  return now >= afterEnd;
}

/**
 * The first day of a pay round.
 *
 * 1 April, not 6 April: a pay round is not a tax year, and every
 * `effectiveFrom` in the award table says so.
 */
function roundStart(year: PayYear): Date {
  const startYear = Number(year.slice(0, 4));
  invariant(
    Number.isInteger(startYear),
    `payRound: '${year}' does not start with a four-digit year`,
  );
  return new Date(startYear, 3, 1);
}

/**
 * The one circular that published this award's scales, where there is
 * exactly one.
 *
 * Undefined in the two cases where naming one document would mislead,
 * and a caller cannot tell them apart from the field alone. Nothing is
 * published yet: an award enacted before its salaries are printed,
 * which is the first half of `pending`. Or several documents publish
 * the round between them — a nation can split its training grades from
 * the rest — and picking either would cite a document that does not
 * contain some of the figures it is printed beneath.
 *
 * A caller needing provenance per grade reads it off the scale, which
 * carries its own source for exactly this reason. One that needs to
 * distinguish the two absences should ask the scales directly rather
 * than infer it from here.
 */
function circularFor(
  award: PayAward,
  nation: Nation,
  year: PayYear,
): DocumentSource | undefined {
  const byUrl = new Map<string, DocumentSource>();
  for (const source of scaleSources(award, nation, year)) {
    byUrl.set(source.url, source);
  }
  return byUrl.size === 1 ? [...byUrl.values()][0] : undefined;
}

/** Every document publishing a scale this award covers, in the nation
 *  and year asked about. */
function scaleSources(
  award: PayAward,
  nation: Nation,
  year: PayYear,
): readonly DocumentSource[] {
  if (award.family === AWARD_FAMILIES.afc) {
    // One award covers every band and one circular publishes them, so
    // there is a direct lookup and no grade to filter by.
    return unlessUnpublished(() => [afcScaleSource(year, nation)]);
  }
  const covered = new Set<PayScaleId>(award.covers);
  return [
    ...unlessUnpublished(() => getMedicalScales(year, nation)),
    ...unlessUnpublished(() => getDentalScales(year, nation)),
  ]
    .filter((meta) => covered.has(meta.grade))
    .map((meta) => meta.source);
}

/**
 * A lookup's result, or nothing where the nation/year is unpublished.
 *
 * An unpublished combination is a normal mid-round state here — it is
 * what `pending`'s first half IS — so it degrades to an empty list.
 * Any other failure still throws.
 */
function unlessUnpublished<T>(load: () => readonly T[]): readonly T[] {
  try {
    return load();
  } catch (error) {
    if (error instanceof ScaleUnavailable) {
      return [];
    }
    throw error;
  }
}
