/**
 * The table shapes AfC pay circulars actually print.
 *
 * Shared by the verbatim transcriptions in this directory because the
 * publishers genuinely share them, not to save typing: Wales and
 * Northern Ireland both print an "Entry step point / Years until
 * eligible for pay progression / Intermediate step point / Top step
 * point" table, with the same columns in the same order, so one type
 * describes both faithfully. Scotland prints something different and
 * has its own shapes below.
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
 * used is the point: England's two-point shape was once copied across
 * to NI, and only a later reading of the PDF caught it.
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
 * `yearsToIntermediate` / `yearsToTop` are the publisher's OWN
 * "Years until eligible for pay progression" figures, transcribed as
 * printed. Our "Year N" point labels are DERIVED from them rather
 * than typed alongside the salaries, so a mis-transcribed interval
 * shows up as a wrong label that a fixture catches, instead of a label
 * and an interval quietly disagreeing.
 */
export interface SteppedBandRow {
  /** The band as the circular prints it, e.g. 'Band 8a'. */
  readonly band: string;
  readonly entry: number;
  /**
   * Years at the entry point before the next step. Where there is an
   * intermediate step this is the wait for it; where there is not, it
   * is the wait for the top.
   */
  readonly yearsToNext: number;
  /** Absent for a two-point band. */
  readonly intermediate?: number;
  /** Present only alongside {@link SteppedBandRow.intermediate}. */
  readonly yearsToTop?: number;
  readonly top: number;
  readonly note?: string;
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
