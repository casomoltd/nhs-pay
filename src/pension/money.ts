/**
 * One figure under BOTH projections.
 *
 * Every scalar reported here is a pair, so a consumer picks a
 * reading rather than doing CPI arithmetic of its own.
 *
 * **Neither reading is derived from the other.** They are two
 * runs of the same model: `nominal` at the caller's inflation
 * assumption, `real` with that assumption set to zero. So
 * `real` is not `nominal` deflated, and dividing one by the
 * other does not give the assumption back.
 *
 * That distinction is the whole of a long-running disagreement
 * about a third of a percent. Deflating a CPI + 1.5 projection
 * leaves 1.5 / (1 + cpi) of real growth — 1.47% at 2% — because
 * the 1.5 points are added before the growth and eaten into by
 * the same year's inflation. Running the model at zero gives
 * 1.5% flat, which is what "ignore inflation" means and what
 * every member's own arithmetic does.
 */
export interface ProjectionMoney {
  /** Actual pounds at `asAt`, the pension revalued at CPI plus
   * 1.5 points a year while accruing. */
  readonly nominal: number;
  /** Today's pounds: the same projection with inflation
   * ignored, so 1.5% a year while accruing and flat once
   * deferred. */
  readonly real: number;
  /** The date the figure falls on. Its absence is how a
   * consumer once deflated an exit figure over the horizon to
   * retirement: a figure that does not carry its own date
   * cannot defend itself. */
  readonly asAt: Date;
}
