/**
 * The two date precisions this library holds, kept apart by the
 * COMPILER rather than by a doc comment.
 *
 * Both are ISO text at runtime and both stay JSON-safe. The brand
 * exists because the two are otherwise interchangeable, and handing
 * one reader the other's precision fails OPEN: it builds an Invalid
 * Date, every comparison against one is false, and the value then
 * passes every date rule downstream. A wrong answer that looks like a
 * right one is the worst failure this data has, so the type system
 * carries the distinction.
 *
 * Lives here rather than in `@casomoltd/paye-calc`, which deals in tax
 * years and holds no dates at all: a library carrying a concept it
 * does not use is the same layering rule pointing the other way. Move
 * it down if paye-calc ever grows dates.
 *
 * The concrete cost of NOT having this, before it existed: a consumer
 * bridged the two precisions by writing `` `${award.expectedInPay}-01` ``
 * — a hand-rolled splice on a month field, in the same codebase whose
 * production error log was carrying `RangeError: Invalid Date`.
 */

import {invariant} from './errors.js';

/** A 'YYYY-MM' month. Precision is part of the type. */
export type IsoMonth = string & {readonly precision: 'month'};

/** A 'YYYY-MM-DD' calendar date. Precision is part of the type. */
export type IsoDate = string & {readonly precision: 'date'};

/**
 * The ONLY way to make an {@link IsoMonth}, and so the one place the
 * shape is checked. SHAPE, not validity — see {@link isoDate}.
 */
export function isoMonth(value: string): IsoMonth {
  invariant(
    /^\d{4}-\d{2}$/.test(value),
    `not a 'YYYY-MM' month: ${value}`,
  );
  return value as IsoMonth;
}

/**
 * The ONLY way to make an {@link IsoDate}.
 *
 * Checks the SHAPE and nothing more: `2025-02-31` is four digits, two
 * and two, so it mints one, and {@link isoToDate} then rolls it to
 * 3 March. What a date IS cannot be settled by a regex — the real test
 * is a round trip through `Date`, and that belongs at the one place
 * typed text enters a consumer, which hands back the value itself
 * rather than text for this to re-check.
 */
export function isoDate(value: string): IsoDate {
  invariant(
    /^\d{4}-\d{2}-\d{2}$/.test(value),
    `not a 'YYYY-MM-DD' date: ${value}`,
  );
  return value as IsoDate;
}

/**
 * The month a date falls in. The ONE place a day is deliberately
 * dropped, named so the loss shows at the call site instead of inside
 * a `String.slice` nobody reads.
 */
export function monthOf(date: IsoDate): IsoMonth {
  return isoMonth(date.slice(0, 7));
}

/**
 * A month read as its first day.
 *
 * The one sanctioned widening from month precision to date precision,
 * and the reason it is a named function rather than a template string:
 * a consumer that needs a `Date` from a `YYYY-MM` field has to add a
 * day from somewhere, and doing it inline puts an un-reviewed date
 * construction in page code. Total — every 'YYYY-MM' plus '-01' is a
 * valid 'YYYY-MM-DD'.
 */
export function firstOfMonth(month: IsoMonth): IsoDate {
  return isoDate(`${month}-01`);
}

/**
 * A 'YYYY-MM' → the `Date` a caller needs, on the first of the month.
 *
 * Unchecked, because the brand already says the shape was checked —
 * {@link isoMonth} is the only way to hold one.
 */
export function monthToDate(month: IsoMonth): Date {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

/**
 * A 'YYYY-MM-DD' → its `Date`, in the reader's own frame.
 *
 * Parsed by PARTS, never `new Date(iso)`: that reads a bare ISO date
 * as UTC midnight, which then formats as the day BEFORE anywhere west
 * of Greenwich. A stored date names a calendar day and carries no time
 * zone, so the day printed has to be the day stored.
 *
 * This is also why no date question is settled by comparing text:
 * 'YYYY-MM' sorts BEFORE every 'YYYY-MM-DD' that falls inside it, so
 * April 2015 would read as earlier than 1 April 2015. Dates compare as
 * dates.
 *
 * Unchecked for the same reason as {@link monthToDate}: the brand is
 * the check, and {@link isoDate} is the only way to hold one.
 */
export function isoToDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
