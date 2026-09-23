/**
 * GAD factor-table machinery — the translation layer between a
 * verbatim factor-table transcription (the sibling issue files) and
 * the domain. Mirrors the medical/dental circulars pattern at reduced
 * weight: an issue file transcribes one printed table 1:1;
 * {@link FactorTable} validates and wraps it; every factor is read
 * through `factor-basis.ts`, which holds the one set of instances.
 */

import type {IsoDate} from '../iso-date.js';
import {
  invariant,
  RetirementFactorOutOfRange,
} from '../errors.js';

/**
 * Citation carried in the data itself, so "where did these numbers
 * come from" travels with the numbers and a stale table can be told
 * from a current one without reading a comment.
 */
export interface FactorProvenance {
  /** Consolidated-workbook table reference, e.g. '0-420' */
  readonly tableRef: string;
  /** Workbook sheet the table is printed on, e.g. 'x-420' */
  readonly sheet: string;
  /** Page in the published PDF, e.g. 25 */
  readonly page: number;
  /** Name in the governing guidance, e.g. 'ERF1' */
  readonly guidanceRef: string;
  /** Date GAD issued the factors, ISO date, e.g. '2023-06-30' */
  readonly issued: IsoDate;
  /** The publisher's own URL. A consumer renders it as the
   * citation, which is why it is data rather than a comment, and
   * why it is the one URL this library still holds.
   *
   * There is no `archiveUrl` beside it on purpose. The archived
   * copy is inventoried in `docs/source-archive.md`, and a
   * second copy of a Drive id here would be one more place to
   * chase when a file is replaced. One home for the archive;
   * this field is for the link a reader follows. */
  readonly sourceUrl: string;
  /** Methodology document the table defers to */
  readonly methodGuidance: string;
}

/**
 * What each kind's factors may be, and how a part month is read on a
 * table keyed by period: an ERF factor is a reduction and rounds a
 * part month UP (guidance §2.3), an LRF factor an uplift and rounds it
 * DOWN (§3.4), both member-conservative. Direction depends on the key
 * as well as the kind, so it lives with the key: see {@link runsUp}.
 */
const KIND_POLICY = {
  erf: {
    inRange: (factor: number) => factor > 0 && factor <= 1,
    rangeWord: '(0, 1]',
    partMonthRoundsUp: true,
  },
  lrf: {
    inRange: (factor: number) => factor >= 1,
    rangeWord: '[1, ∞)',
    partMonthRoundsUp: false,
  },
} as const;

export type FactorTableKind = keyof typeof KIND_POLICY;

/**
 * How a table's rows are keyed. GAD prints two kinds and they are not
 * interchangeable: the 2015 Section's tables by PERIOD to or after the
 * pension age, the 1995 and 2008 Sections' by the member's AGE.
 *
 * - `period`: row 0 is 0 years from the pension age.
 * - `age`: row 0 is `firstAge`, the youngest age printed.
 */
export type PeriodIndex = {readonly by: 'period'};
export type AgeIndex = {readonly by: 'age'; readonly firstAge: number};
export type FactorTableIndex = PeriodIndex | AgeIndex;

/** Which way a table's factors run through its printed order. A factor
 *  moves towards 1 as the drawing nears the pension age, so an ERF
 *  keyed by period falls down the page and one keyed by age rises. */
function runsUp(kind: FactorTableKind, index: FactorTableIndex): boolean {
  return kind === 'lrf' || index.by === 'age';
}

/** Verbatim table data as exported by an issue file. */
export interface FactorTableData<
  I extends FactorTableIndex = FactorTableIndex,
> {
  readonly kind: FactorTableKind;
  readonly index: I;
  readonly provenance: FactorProvenance;
  /**
   * Ragged, exactly as printed: full rows have 12 month columns;
   * the final row may hold fewer (the 2023 issue prints one). A
   * cell the source doesn't publish is unrepresentable here.
   */
  readonly rows: readonly (readonly number[])[];
}

const MONTHS_PER_ROW = 12;

/**
 * Lookup value object over one GAD factor table (pattern:
 * PensionTiers). Bounds derive from the rows — never restated —
 * and the rounding policy lives with the data it governs, so no
 * caller can reach a raw cell and skip the rounding rule.
 */
export class FactorTable<I extends FactorTableIndex = FactorTableIndex> {
  readonly kind: FactorTableKind;
  /** How the rows are keyed. The type carries it, so a period lookup
   *  on an age table does not compile. */
  readonly index: I;
  readonly provenance: FactorProvenance;
  private readonly rows: readonly (readonly number[])[];

  constructor(data: FactorTableData<I>) {
    const {kind, index, provenance, rows} = data;
    const policy = KIND_POLICY[kind];
    const up = runsUp(kind, index);
    const ref = provenance.guidanceRef;
    invariant(rows.length > 0, `${ref}: no rows`);
    rows.forEach((row, y) => {
      const isLast = y === rows.length - 1;
      invariant(
        row.length === MONTHS_PER_ROW
          || (isLast && row.length >= 1
            && row.length < MONTHS_PER_ROW),
        `${ref}: row ${y} has ${row.length} cells — only the`
          + ' final row may be shorter than 12, and no row'
          + ' longer',
      );
    });
    // Monotonicity across the rows in printed order is the
    // transcription tripwire: a mis-pasted row jumps the wrong
    // direction, and this check rejects that class of defect at
    // construction.
    //
    // Non-strict: GAD prints 3dp and adjacent cells differ by as
    // little as 0.001, so a legitimate issue may print two equal
    // neighbours. The defect this guards is a wrong-DIRECTION jump,
    // which non-strict ordering still rejects.
    const flat = rows.flat();
    for (let i = 1; i < flat.length; i++) {
      invariant(
        up ? flat[i] >= flat[i - 1] : flat[i] <= flat[i - 1],
        `${ref}: factor order violation at flat index ${i}`
          + ` — expected ${up ? 'non-decreasing' : 'non-increasing'}`,
      );
    }
    for (const factor of flat) {
      invariant(
        policy.inRange(factor),
        `${ref}: factor ${factor} outside the `
          + `${policy.rangeWord} range`,
      );
    }
    this.kind = kind;
    this.index = index;
    /* Frozen because a table is a process-wide singleton: the
       citation a member's drawing row carries IS this object,
       not a copy, so one write through a ledger row would
       restate the source of every projection after it. */
    this.provenance = Object.freeze(provenance);
    this.rows = rows;
  }

  /**
   * Factor for a calendar period to or after the pension age, on a
   * table keyed by period. Part-months round UP on an ERF (guidance
   * §2.3) and DOWN on an LRF (§3.4), both member-conservative.
   * Throws {@link RetirementFactorOutOfRange} when the rounded period
   * falls outside the printed table — the factor genuinely isn't
   * published, so callers catch it by type.
   */
  factorFor(
    this: FactorTable<PeriodIndex>,
    period: { years: number; months: number; days: number },
  ): number {
    // Precondition, not table bounds: a malformed period (a
    // date-arithmetic bug upstream) must fail loud here, never
    // masquerade as the typed "factor not published" error.
    invariant(
      Number.isInteger(period.years) && period.years >= 0
        && Number.isInteger(period.months)
        && period.months >= 0
        && period.months < MONTHS_PER_ROW
        && period.days >= 0,
      `${this.provenance.guidanceRef}: malformed period `
        + `${period.years}yr ${period.months}mo `
        + `${period.days}d`,
    );
    let {years, months} = period;
    if (KIND_POLICY[this.kind].partMonthRoundsUp && period.days > 0) {
      months += 1;
      if (months >= MONTHS_PER_ROW) {
        months = 0;
        years += 1;
      }
    }
    return this.cell(years, months, 0);
  }

  /**
   * Factor at the member's age on the drawing date, on a table keyed
   * by age. The age is read in complete years and months, the
   * definition each table prints in its own header ("Age (complete
   * years & months)"), so the days beyond the last whole month are
   * dropped. On either kind that reads the lower factor, which is the
   * member-conservative direction the period tables round in too.
   */
  factorAtAge(
    this: FactorTable<AgeIndex>,
    age: { years: number; months: number; days: number },
  ): number {
    const {index} = this;
    invariant(
      Number.isInteger(age.years) && Number.isInteger(age.months)
        && age.months >= 0 && age.months < MONTHS_PER_ROW,
      `${this.provenance.guidanceRef}: malformed age `
        + `${age.years}yr ${age.months}mo`,
    );
    return this.cell(
      age.years - index.firstAge, age.months, index.firstAge,
    );
  }

  /** One printed cell. `firstLabel` is what row 0 is printed as, so
   *  an out-of-range error names the age or period the reader would
   *  look for rather than a row number. */
  private cell(
    years: number,
    months: number,
    firstLabel: number,
  ): number {
    const row = this.rows[years] as
      | readonly number[]
      | undefined;
    const factor = row?.[months];
    if (factor === undefined) {
      const last = this.rows.length - 1;
      const {index} = this;
      throw new RetirementFactorOutOfRange({
        provenance: this.provenance,
        index,
        at: {years: years + firstLabel, months},
        max: {years: last + firstLabel, months: this.rows[last].length - 1},
      });
    }
    return factor;
  }
}
