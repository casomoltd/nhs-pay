/**
 * The published document a figure in this library was read from.
 *
 * One record type for any cited document, because the library cites
 * three different KINDS and a reader must not confuse them: the
 * instrument that ENACTED an award, the circular that PUBLISHES a pay
 * scale, and the letter that sets an allowance. They are different
 * documents in every nation — England's 2026-27 medical award was
 * enacted by a written ministerial statement while its salaries are
 * printed in a Pay & Conditions circular — so collapsing them into one
 * field is how a parliamentary statement ends up cited beneath a table
 * of salaries.
 *
 * The type is shared; the instances are not. Each carrier holds the
 * document that is true for IT.
 *
 * Lives in its own module rather than beside the awards because a pay
 * scale carries one too, and `award.ts` imports every scale module —
 * so defining it there would make a scale citing its source a cycle.
 */

import type {IsoDate} from './iso-date.js';

/**
 * The fields a {@link DocumentSource} is built from.
 *
 * A named-argument object rather than a positional constructor: four
 * of the six fields are strings, and adjacent parameters of one type
 * are how a value ends up in the wrong slot with nothing to catch it.
 */
export interface DocumentSourceFields {
  /** Who issued it — 'the Scottish Government', 'NHS Wales'. */
  readonly issuer: string;
  /**
   * The document's own title or publisher reference, as printed:
   * 'PCS(AFC)2026/1', 'HCWS1340', 'NHS pay awards'.
   *
   * Identity, deliberately not a phrase, and deliberately separate
   * from {@link issuer}. A consumer composes its own sentence from the
   * two; hand it one pre-joined fragment and it will splice that into
   * a grammar the fragment was never shaped for. This field says which
   * document it is, nothing more.
   */
  readonly reference: string;
  /** The document itself, for a page to link. */
  readonly url: string;
  /** ISO date the document was issued. */
  readonly issued: IsoDate;
  /**
   * ISO date by which a NEWER document is expected to replace or
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
  readonly nextExpected?: IsoDate;
  /**
   * Why a newer document is expected then, when the answer is not
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
 * A document this library cites — not commentary about it. Held on the
 * record so a consumer cites the document rather than keeping its own
 * copy of the URL.
 *
 * A CLASS, not a plain record, because the question a consumer most
 * often asks of a citation — "is this still the newest document
 * expected to exist?" — needs only the fields already on it plus the
 * current time. An entity that carries every coordinate of a query
 * should answer it; a free function asking the caller to pass the
 * record back in is the same fact reached by a longer route.
 *
 * Safe to make a class here because a DocumentSource is never
 * round-tripped through JSON — it is authored in `sources.ts`, read by
 * a renderer, and never parsed back from storage, so nothing loses its
 * methods at a boundary.
 */
export class DocumentSource {
  /** Who issued it — 'the Scottish Government', 'NHS Wales'. */
  readonly issuer: string;
  /** The document's own title or publisher reference, as printed. */
  readonly reference: string;
  /** The document itself, for a page to link. */
  readonly url: string;
  /** ISO date the document was issued. */
  readonly issued: IsoDate;
  /** ISO date by which a NEWER document is expected. */
  readonly nextExpected?: IsoDate;
  /** Why a newer document is expected then, where it is not the
   *  ordinary annual round. */
  readonly nextExpectedReason?: string;

  constructor(fields: DocumentSourceFields) {
    this.issuer = fields.issuer;
    this.reference = fields.reference;
    this.url = fields.url;
    this.issued = fields.issued;
    this.nextExpected = fields.nextExpected;
    this.nextExpectedReason = fields.nextExpectedReason;
  }

  /**
   * Whether this document is still within the window in which it is
   * the newest expected to exist, AS AT a given moment.
   *
   * Takes `now` rather than reading the clock, and is a method rather
   * than a stored flag, because currency is a question about a moment
   * and not a property of the record. A boolean computed at module
   * load would freeze the answer for the life of the process — the
   * same shape as the year defect this round exists to fix — and a
   * caller could not ask "was this current when the page was built?".
   */
  currencyAt(now: Date): SourceCurrency {
    if (!this.nextExpected) {
      return 'unknown';
    }
    return this.nextExpected >= now.toISOString().slice(0, 10)
      ? 'current'
      : 'lapsed';
  }
}

/**
 * Whether a source is still within the window in which it is the
 * newest document expected to exist.
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
