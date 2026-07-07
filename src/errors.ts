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
 * published for a tax year. Sibling of {@link ScaleUnavailable}
 * so both absent-pay-data paths can be caught by type.
 */
export class PensionTiersUnavailable extends Error {
  constructor(readonly year: TaxYear) {
    super(`No NHS pension tiers published for ${year}`);
    this.name = 'PensionTiersUnavailable';
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
