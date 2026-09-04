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

/**
 * A document this library cites — not commentary about it. Held on the
 * record so a consumer cites the document rather than keeping its own
 * copy of the URL.
 */
export interface DocumentSource {
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
  readonly issued: string;
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
  readonly nextExpected?: string;
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

export function sourceCurrency(
  source: DocumentSource,
  today: Date,
): SourceCurrency {
  if (!source.nextExpected) {
    return 'unknown';
  }
  return source.nextExpected >= today.toISOString().slice(0, 10)
    ? 'current'
    : 'lapsed';
}
