/**
 * Small shared value objects used across the pay-scale
 * and pension layers — a named home for paired fields
 * that would otherwise travel as loose primitives.
 *
 * Deferred: paye-calc will own a shared Range/MinMax value
 * object (Dev task 392d9af2-a639-81b2-ab03-c22c12007bde);
 * when it lands, re-point SalaryRange/PensionTier at it and
 * drop this local shape rather than keep a parallel interval
 * type.
 */

/**
 * A closed salary interval. `max` may be Infinity for an
 * open-topped band (e.g. the top pension tier).
 */
export interface SalaryRange {
  readonly min: number;
  readonly max: number;
}
