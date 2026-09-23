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
 * The difference is about a third of a percent a year, and it is
 * the whole reason for the distinction. Deflating a CPI + 1.5 projection
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
  /** The date the figure falls on. A figure that does not
   * carry its own date can be deflated over the wrong horizon
   * by a consumer with no way to tell. */
  readonly asAt: Date;
}

/** The two readings of one figure, before a date is attached. */
interface Readings {
  readonly nominal: number;
  readonly real: number;
}

/**
 * A figure at a date. Takes the readings as one object, never two
 * same-typed positional numbers, so a transposition cannot swap the
 * rulers silently.
 */
export function moneyAt(readings: Readings, asAt: Date): ProjectionMoney {
  return {nominal: readings.nominal, real: readings.real, asAt};
}

/** Several figures added, each ruler on its own, at one date. */
export function sumMoney(
  xs: readonly Readings[], asAt: Date,
): ProjectionMoney {
  return moneyAt({
    nominal: xs.reduce((n, x) => n + x.nominal, 0),
    real: xs.reduce((n, x) => n + x.real, 0),
  }, asAt);
}

/** `a` less `b`, each ruler on its own, at `a`'s date. */
export function minusMoney(
  a: ProjectionMoney, b: Readings,
): ProjectionMoney {
  return moneyAt({nominal: a.nominal - b.nominal, real: a.real - b.real},
    a.asAt);
}

/** A figure divided by a scalar, both rulers, at its own date. */
export function divideMoney(
  m: ProjectionMoney, by: number,
): ProjectionMoney {
  return moneyAt({nominal: m.nominal / by, real: m.real / by}, m.asAt);
}
