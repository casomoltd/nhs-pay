/**
 * Fail-loud machinery. Three kinds, kept together:
 *   - Errors a caller catches by type, part of the API contract: data
 *     the library does not publish ({@link ScaleUnavailable} and
 *     siblings — never silently substitute another year's or nation's
 *     figures), a member it cannot build pay for
 *     ({@link PayPathUnavailable}), and service it does not model
 *     ({@link BenefitNotModelled}, keyed by a {@link NOT_MODELLED}
 *     code).
 *   - RangeError, thrown where a caller's input cannot be true.
 *   - {@link invariant} — an internal consistency guard. Its failure
 *     is a library bug, not an input problem, so no caller catches it;
 *     it throws a bare Error to fail loud in tests and pages.
 */

import type {
  Nation, PayYear, TaxYear,
} from '@casomoltd/paye-calc';
import type {
  FactorProvenance, FactorTableIndex,
} from './gad/factor-table.js';

/** A span, or an age, to the month: how a GAD table is keyed. */
interface YearsMonths {
  readonly years: number;
  readonly months: number;
}

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
    /** The PAY year — which scale was asked for, not which tax
     *  rules apply. A nation whose award is not yet in payment is
     *  short a pay year, never a tax year. */
    readonly year: PayYear,
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
 * Thrown when a drawing falls outside the printed GAD factor table —
 * e.g. more than 13y0m early under 0-420, or an age below 50 on 1-401.
 * Sibling of {@link ScaleUnavailable}: the factor genuinely isn't
 * published, so callers with free date inputs catch it by type rather
 * than matching message text.
 *
 * `tableRef` names the table; `guidanceRef` alone does not, because the
 * guidance numbers each scheme's tables from 1 and so `ERF1` is both
 * 0-420 and 1-401. `years`, `months` and the bounds are a PERIOD from
 * the pension age on a period table and the member's AGE on an age
 * table, which `keyedBy` says.
 */
export class RetirementFactorOutOfRange extends Error {
  /** Table name in the governing guidance, e.g. 'ERF1' */
  readonly guidanceRef: string;
  /** GAD's table reference, e.g. '0-420': unique, where
   *  `guidanceRef` is not. */
  readonly tableRef: string;
  readonly keyedBy: FactorTableIndex;
  readonly years: number;
  readonly months: number;
  readonly maxYears: number;
  readonly maxMonths: number;

  constructor({provenance, index, at, max}: {
    readonly provenance: FactorProvenance;
    readonly index: FactorTableIndex;
    /** Where the drawing fell, and the furthest the table prints. */
    readonly at: YearsMonths;
    readonly max: YearsMonths;
  }) {
    const {tableRef, guidanceRef} = provenance;
    super(index.by === 'period'
      ? `${tableRef} (${guidanceRef}) out of range: ${at.years}yr `
        + `${at.months}mo (max ${max.years}yr ${max.months}mo)`
      : `${tableRef} (${guidanceRef}): age ${at.years}yr ${at.months}mo `
        + `is outside ${index.firstAge}yr 0mo to `
        + `${max.years}yr ${max.months}mo`);
    this.name = 'RetirementFactorOutOfRange';
    this.guidanceRef = guidanceRef;
    this.tableRef = tableRef;
    this.keyedBy = index;
    this.years = at.years;
    this.months = at.months;
    this.maxYears = max.years;
    this.maxMonths = max.months;
  }
}

/**
 * Thrown when no AfC pay award (consolidated % uplift) is recorded
 * for a (nation, year). Sibling of {@link ScaleUnavailable} — the
 * award is negotiated data, absent until published.
 */
export class AwardUnavailable extends Error {
  constructor(
    /** The PAY year the award would apply to. */
    readonly year: PayYear,
    readonly nation: Nation,
  ) {
    super(`No AfC pay award recorded for ${nation} ${year}`);
    this.name = 'AwardUnavailable';
  }
}

function scaleMessage(
  nation: Nation,
  year: PayYear,
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

/**
 * A pay-point label matched more than one point on a scale.
 *
 * Thrown rather than returning the first match. England's consultant
 * scale is 20 points carrying 5 labels — `Threshold 3` names six of
 * them, differing in years of service — so a label is not an
 * identifier there, and picking the first is an arbitrary answer
 * dressed as a lookup. A caller that already holds the point should
 * use the resolver's `fromPoint` instead.
 */
export class AmbiguousScalePoint extends Error {
  constructor(
    readonly grade: string,
    readonly pointLabel: string,
    readonly matches: number,
  ) {
    super(
      `Pay point "${pointLabel}" matches ${matches} points on `
      + `${grade} — it does not identify one. Use fromPoint with the `
      + 'point itself.',
    );
    this.name = 'AmbiguousScalePoint';
  }
}

/**
 * There is nothing to build a member's pay from: no usable current
 * pay. Every year the pay path reconstructs or projects is scaled from
 * that one figure, so without it there is no figure to scale, and any
 * substitute would be a guess presented as the member's pay.
 */
export class PayPathUnavailable extends Error {
  constructor(readonly reason: string) {
    super(`No pay path can be built: ${reason}`);
    this.name = 'PayPathUnavailable';
  }
}

/** What {@link BenefitNotModelled} refuses, as a closed set a
 *  consumer can branch on. Each is deferred, and each names the issue
 *  that carries what a build would take. */
export const NOT_MODELLED = {
  // https://github.com/casomoltd/nhs-pay/issues/16
  breakInService: 'break-in-service',
  // https://github.com/casomoltd/nhs-pay/issues/16
  bothLegacySections: 'both-legacy-sections',
  // https://github.com/casomoltd/nhs-pay/issues/19
  no2015Section: 'no-2015-section',
  // https://github.com/casomoltd/nhs-pay/issues/19
  remedyMemberLeftEarly: 'remedy-member-left-before-2022',
  // https://github.com/casomoltd/nhs-pay/issues/20
  statementBeforeRollback: 'statement-before-rollback',
  // https://github.com/casomoltd/nhs-pay/issues/18
  preservedDrawnEarly: 'preserved-benefits-drawn-early',
} as const;

export type NotModelled = (typeof NOT_MODELLED)[keyof typeof NOT_MODELLED];

/**
 * A benefit the library can name but has not modelled, refused rather
 * than priced on an assumption nobody would see. `code` says which, so
 * a consumer can tell a member what cannot yet be answered instead of
 * showing a figure that answers something else.
 */
export class BenefitNotModelled extends Error {
  constructor(readonly code: NotModelled, detail: string) {
    super(`Not modelled: ${detail}`);
    this.name = 'BenefitNotModelled';
  }
}
