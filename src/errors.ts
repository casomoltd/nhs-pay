/**
 * Fail-loud machinery. Two kinds, kept together:
 *   - Errors for absent pay data — part of the API contract,
 *     caught by type (see {@link ScaleUnavailable} & siblings).
 *     Never silently substitute another year's or nation's figures.
 *   - {@link invariant} — an internal consistency guard. Its failure
 *     is a library bug, not an input problem, so no caller catches it;
 *     it throws a bare Error to fail loud in tests and pages.
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';

/**
 * Assert a domain invariant that must ALWAYS hold. Throws a bare
 * Error when `condition` is false. Unlike the absent-data errors
 * below — which callers catch by type — an invariant failure signals
 * an internal inconsistency (a regression), so it is deliberately a
 * plain, uncatchable-by-type throw: better a loud stop in a test or
 * page than a silently wrong figure.
 */
export function invariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Thrown when no pay scale is published for a
 * (nation, year), optionally narrowed to a grade and a
 * scale point. The UI enumerates valid combinations first,
 * so this signals genuine data-absence, not control flow.
 */
export class ScaleUnavailable extends Error {
  constructor(
    readonly nation: Nation,
    readonly year: TaxYear,
    readonly gradeId?: string,
    /** Set when the scale exists but the point label doesn't. */
    readonly pointLabel?: string,
  ) {
    super(scaleMessage(nation, year, gradeId, pointLabel));
    this.name = 'ScaleUnavailable';
  }
}

/**
 * Thrown when NHS pension contribution tiers are not
 * published for a (nation, year). Sibling of {@link ScaleUnavailable}
 * so both absent-pay-data paths can be caught by type. Carries the
 * nation because the three schemes (NHSBSA E&W, SPPA Scotland, HSC
 * NI) publish independently — a year present for one may be absent
 * for another.
 */
export class PensionTiersUnavailable extends Error {
  constructor(
    readonly year: TaxYear,
    readonly nation: Nation,
  ) {
    super(
      `No NHS pension tiers published for ${nation} ${year}`,
    );
    this.name = 'PensionTiersUnavailable';
  }
}

/**
 * Thrown when a retirement period falls outside the printed GAD
 * factor table — e.g. more than 13y0m early under the 30 Jun 2023
 * ERF1. Sibling of {@link ScaleUnavailable}: the factor genuinely
 * isn't published for that period, so callers with free date
 * inputs catch it by type rather than matching message text.
 */
export class RetirementFactorOutOfRange extends Error {
  constructor(
    /** Table name in the governing guidance, e.g. 'ERF1' */
    readonly guidanceRef: string,
    readonly years: number,
    readonly months: number,
    readonly maxYears: number,
    readonly maxMonths: number,
  ) {
    super(
      `${guidanceRef} out of range: ${years}yr ${months}mo `
        + `(max ${maxYears}yr ${maxMonths}mo)`,
    );
    this.name = 'RetirementFactorOutOfRange';
  }
}

/**
 * Thrown when no AfC pay award (consolidated % uplift) is recorded
 * for a (nation, year). Sibling of {@link ScaleUnavailable} — the
 * award is negotiated data, absent until published.
 */
export class AwardUnavailable extends Error {
  constructor(
    readonly year: TaxYear,
    readonly nation: Nation,
  ) {
    super(`No AfC pay award recorded for ${nation} ${year}`);
    this.name = 'AwardUnavailable';
  }
}

function scaleMessage(
  nation: Nation,
  year: TaxYear,
  gradeId?: string,
  pointLabel?: string,
): string {
  if (pointLabel !== undefined) {
    return `No scale point "${pointLabel}" for `
      + `${gradeId} in ${nation} ${year}`;
  }
  if (gradeId !== undefined) {
    return `No published scale for ${gradeId} in `
      + `${nation} ${year}`;
  }
  return `No published pay scale for ${nation} ${year}`;
}
