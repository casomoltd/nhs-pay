/**
 * Small shared value objects used across the pay-scale
 * and pension layers — a named home for paired fields
 * that would otherwise travel as loose primitives.
 *
 * Deferred: this local shape stands until paye-calc owns a
 * shared Range/MinMax value object. When it does, re-point
 * SalaryRange and PensionTier at it rather than keep a
 * parallel interval type.
 */

/**
 * A closed salary interval. `max` may be Infinity for an
 * open-topped band (e.g. the top pension tier).
 */
export interface SalaryRange {
  readonly min: number;
  readonly max: number;
}
