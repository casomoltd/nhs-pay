/**
 * The table shapes AfC pay publishers actually print.
 *
 * Shared by the AfC verbatim transcriptions, the circulars in this
 * directory and England's published page in `src/published/england-afc.ts`,
 * because the publishers genuinely share them, not to save typing: NHS
 * Employers, Wales and Northern Ireland all print an "Entry step point /
 * Years until eligible for pay progression / Intermediate step point /
 * Top step point" table, with the same columns in the same order, so one
 * type describes them faithfully. Scotland prints something different
 * and has its own shapes below.
 *
 * These describe the SOURCE, not the domain. A band is `'Band 8a'`
 * because that is what the page says; the mapping to an `AfcBandId`,
 * and the derivation of our own point labels, belong to the
 * translation layer in `afc-scales.ts`.
 */

/**
 * A band whose pay the circular prints as a single figure with NO
 * progression columns.
 *
 * Northern Ireland's Bands 1 and 2 are the case this exists for: its
 * Basic Pay block gives one flat figure each and its entry/interval
 * table starts at Band 3. England's publisher prints Band 2 with an
 * entry point, a two-year interval and a top point — same cash,
 * different published structure. Recording the shape the publisher
 * used is the point: a two-point shape cannot then be copied onto a
 * nation that prints one figure.
 */
export interface FlatBandRow {
  /** The band as the circular prints it, e.g. 'Band 1'. */
  readonly band: string;
  readonly salary: number;
  /** Set where the circular footnotes the band, e.g. closed to new
   *  entrants. Carried because it is a claim about the band, printed
   *  beside it. */
  readonly note?: string;
}

/**
 * A band printed with an entry point, a progression interval, and a
 * top point — optionally with an intermediate step between them.
 *
 * `yearsToNext` / `yearsToTop` are the publisher's OWN
 * "Years until eligible for pay progression" figures, transcribed as
 * printed. Our "Year N" point labels are DERIVED from them rather
 * than typed alongside the salaries, so a mis-transcribed interval
 * shows up as a wrong label that a fixture catches, instead of a label
 * and an interval quietly disagreeing.
 */
export type SteppedBandRow = TwoPointRow | ThreePointRow;

/** A stepped band printed as entry, interval and top. */
interface TwoPointRow {
  /** The band as the circular prints it, e.g. 'Band 3'. */
  readonly band: string;
  readonly entry: number;
  /** Years at the entry point before the top. */
  readonly yearsToNext: number;
  readonly top: number;
  readonly note?: string;
  /** Forbidden, so a row printing an intermediate step must be a
   *  {@link ThreePointRow} and carry both intervals. */
  readonly intermediate?: never;
  readonly yearsToTop?: never;
}

/** A stepped band printed with an intermediate step between entry and
 *  top: two intervals, so neither can be printed without the other. */
interface ThreePointRow {
  /** The band as the circular prints it, e.g. 'Band 8a'. */
  readonly band: string;
  readonly entry: number;
  /** Years at the entry point before the intermediate step. */
  readonly yearsToNext: number;
  readonly intermediate: number;
  /** Years at the intermediate step before the top. */
  readonly yearsToTop: number;
  readonly top: number;
  readonly note?: string;
}

/** A publisher's AfC tables in the shared shape: the bands it prints as
 *  one figure, and the bands it prints as a progression. */
export interface PrintedAfcTables {
  readonly flatBands: readonly FlatBandRow[];
  readonly steppedBands: readonly SteppedBandRow[];
}

/**
 * One row of Scotland's Annex B, which prints a band's points as
 * numbered rows rather than as an entry/top pair.
 */
export interface AnnexBRow {
  /** The band as the circular prints it, e.g. 'Band 8A'. */
  readonly band: string;
  /** The point number in the circular's own `Pt` column. */
  readonly point: number;
  readonly salary: number;
  /**
   * The hourly rate the circular prints beside the annual figure.
   *
   * Transcribed because it is a published figure we can be checked
   * against, and because it pins the contracted week the publisher
   * computed it on — Scotland's is 37 hours for 2025-26 and 36 from
   * 1 April 2026, which is a change no annual salary reveals.
   */
  readonly hourly: number;
}

/**
 * One row of Scotland's Annex C, "Full pay journey", which enumerates
 * the year of service a member is in against the rate they are on.
 *
 * This is the column that settles Scotland's point labels. Consecutive
 * increments at one salary are one point, and the increment the group
 * starts at is that point's year — which is the same reading Wales's
 * "Years until eligible" column gives, from a publisher that states it
 * directly.
 */
export interface PayJourneyRow {
  readonly band: string;
  /** The circular's own `Yearly Increment` value. */
  readonly increment: number;
  readonly salary: number;
}
