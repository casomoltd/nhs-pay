/**
 * Errors for absent pay data. Fail loud — never silently
 * substitute another year's or nation's figures.
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';

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
