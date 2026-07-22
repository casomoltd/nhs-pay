/**
 * GAD factor-table machinery — the translation layer between a
 * verbatim factor-table transcription (the sibling issue files) and
 * the projection domain. Mirrors the medical/dental circulars
 * pattern at reduced weight: an issue file transcribes one printed
 * table 1:1; {@link FactorTable} validates and wraps it; the
 * projection module consumes factors only through it.
 */

import {
  invariant,
  RetirementFactorOutOfRange,
} from '../errors.js';

/**
 * Citation carried in the data itself. Every past defect in this
 * area was a stale-source defect, so the "where did these numbers
 * come from" facts travel with the numbers, not in a comment.
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
  readonly issued: string;
  /** Document the transcription was made from */
  readonly sourceUrl: string;
  /** Methodology document the table defers to */
  readonly methodGuidance: string;
}

/**
 * Everything that differs between the two table kinds, in one
 * place. ERF factors fall as the period grows and part-months
 * round UP (guidance §2.3); LRF factors rise and part-months
 * round DOWN (§3.4). Both roundings are member-conservative;
 * rounding, monotonic direction, and value range all follow from
 * the kind.
 */
const KIND_POLICY = {
  erf: {
    roundsUp: true,
    // Non-strict: GAD prints 3dp and adjacent cells differ by as
    // little as 0.001, so a legitimate issue may print two equal
    // neighbours. The defect this guards (a mis-pasted row, as
    // the 2019 transcription shipped) is a wrong-DIRECTION jump,
    // which non-strict ordering still rejects.
    inOrder: (prev: number, next: number) => next <= prev,
    orderWord: 'non-increasing',
    inRange: (factor: number) => factor > 0 && factor <= 1,
    rangeWord: '(0, 1]',
  },
  lrf: {
    roundsUp: false,
    inOrder: (prev: number, next: number) => next >= prev,
    orderWord: 'non-decreasing',
    inRange: (factor: number) => factor >= 1,
    rangeWord: '[1, ∞)',
  },
} as const;

export type FactorTableKind = keyof typeof KIND_POLICY;

/** Verbatim table data as exported by an issue file. */
export interface FactorTableData {
  readonly kind: FactorTableKind;
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
export class FactorTable {
  readonly kind: FactorTableKind;
  readonly provenance: FactorProvenance;
  private readonly rows: readonly (readonly number[])[];

  constructor(data: FactorTableData) {
    const {kind, provenance, rows} = data;
    const policy = KIND_POLICY[kind];
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
    // Monotonicity across the flattened period order is the
    // transcription tripwire: the superseded 2019 transcription
    // carried final rows that jumped the wrong direction (a
    // mis-pasted row), and this check rejects that class of
    // defect at construction.
    const flat = rows.flat();
    for (let i = 1; i < flat.length; i++) {
      invariant(
        policy.inOrder(flat[i - 1], flat[i]),
        `${ref}: factor order violation at flat index ${i}`
          + ` — expected ${policy.orderWord}`,
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
    this.provenance = provenance;
    this.rows = rows;
  }

  /**
   * Factor for a calendar period, applying this table's rounding
   * policy (§2.3 up for ERF, §3.4 down for LRF). Throws
   * {@link RetirementFactorOutOfRange} when the rounded period
   * falls outside the printed table — the factor genuinely isn't
   * published, so callers catch it by type.
   */
  factorFor(
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
    if (KIND_POLICY[this.kind].roundsUp && period.days > 0) {
      months += 1;
      if (months >= MONTHS_PER_ROW) {
        months = 0;
        years += 1;
      }
    }
    const row = this.rows[years] as
      | readonly number[]
      | undefined;
    const factor = row?.[months];
    if (factor === undefined) {
      const last = this.rows.length - 1;
      throw new RetirementFactorOutOfRange(
        this.provenance.guidanceRef,
        years,
        months,
        last,
        this.rows[last].length - 1,
      );
    }
    return factor;
  }
}
