/**
 * Small shared values used across the pay-scale and
 * pension layers: the per-cent unit, and value objects, a
 * named home for paired fields that would otherwise travel
 * as loose primitives.
 *
 * Deferred: this local shape stands until paye-calc owns a
 * shared Range/MinMax value object. When it does, re-point
 * SalaryRange and PensionTier at it rather than keep a
 * parallel interval type.
 */

/** Per cent: a rate stated per 100. */
export const PER_CENT = 100;

/**
 * A closed salary interval. `max` may be Infinity for an
 * open-topped band (e.g. the top pension tier).
 */
export interface SalaryRange {
  readonly min: number;
  readonly max: number;
}

/** The range a scale's points span, lowest salary to highest. */
export function salaryRangeOf(
  points: readonly {readonly salary: number}[],
): SalaryRange {
  const salaries = points.map((p) => p.salary);
  return {min: Math.min(...salaries), max: Math.max(...salaries)};
}
