/**
 * The GAD issue of the early and late retirement factors the library
 * prices every drawing on: GAD's "2026 factor review set", the current
 * issue of the seven tables it reads. A reissue replaces the set whole.
 */
import {invariant} from '../errors.js';
import {FactorTable, oneIssue} from './factor-table.js';
import type {
  AgeIndex, FactorTableData, FactorTableIndex, PeriodIndex,
} from './factor-table.js';
import {ERF_0_420} from './erf-0-420-2026-07-08.js';
import {LRF_0_421} from './lrf-0-421-2026-07-08.js';
import {LRF_0_422} from './lrf-0-422-2026-07-08.js';
import {ERF_1_401} from './erf-1-401-2026-07-08.js';
import {ERF_1_402} from './erf-1-402-2026-07-08.js';
import {ERF_1_407} from './erf-1-407-2026-07-08.js';
import {LRF_2_416} from './lrf-2-416-2026-07-08.js';

/**
 * The factor tables the library reads, named for what each is for. The
 * value is GAD's own table reference, which is how the table is found in
 * the workbook and the NHSBSA extract to check it; the name is how code
 * picks one, so no branch reads a reference it has to decode.
 */
export const FACTOR_TABLES = {
  /** 2015 Section, taken before its Normal Pension Age: main and
   *  additional pension alike (ERF1). */
  early2015: '0-420',
  /** 2015 Section main pension, taken after its Normal Pension Age from
   *  active service (LRF1). */
  late2015: '0-421',
  /** 2015 Section additional pension, taken after its Normal Pension Age
   *  from active service (LRF2). */
  late2015AdditionalPension: '0-422',
  /** 1995 Section pension, taken before 60. */
  early1995Pension: '1-401',
  /** 1995 Section automatic lump sum, taken before 60. */
  early1995LumpSum: '1-407',
  /** 2008 Section, taken before 65. GAD prints it for any benefit
   *  with a pension age of 65, hence the name. */
  earlyAge65: '1-402',
  /** 2008 Section, taken after 65. */
  late2008: '2-416',
} as const;

/** What a table is for: how code names a table. */
export type FactorPurpose = keyof typeof FACTOR_TABLES;

/** Names purposes by key, so a misspelt one fails to compile. */
export type PurposeOf<P extends FactorPurpose> = P;
/** The 2015 Section's tables are keyed by period from its pension age;
 *  the legacy sections' by the member's age. */
type PeriodPurpose = PurposeOf<
  'early2015' | 'late2015' | 'late2015AdditionalPension'
>;
type IndexOf<P extends FactorPurpose> =
  P extends PeriodPurpose ? PeriodIndex : AgeIndex;

/** One GAD issue of every table the library reads, by purpose. */
type FactorIssue = {
  readonly [P in FactorPurpose]: FactorTableData<IndexOf<P>>;
};

/** The tables, by purpose. The GAD reference a reader cites is on each
 *  table's `provenance.tableRef`. */
type FactorTables = {
  readonly [P in FactorPurpose]: FactorTable<IndexOf<P>>;
};

/** GAD's "2026 factor review set", issued 8 July 2026 and in use from 1
 *  December 2026, as each table's "Date Factors Implemented" cell in the
 *  workbook (version 2026-04) states. */
const ISSUE_2026: FactorIssue = {
  early2015: ERF_0_420,
  late2015: LRF_0_421,
  late2015AdditionalPension: LRF_0_422,
  early1995Pension: ERF_1_401,
  early1995LumpSum: ERF_1_407,
  earlyAge65: ERF_1_402,
  late2008: LRF_2_416,
};

const TABLES = tablesOf(ISSUE_2026);

/** The table the library reads for a purpose. */
export function factorTable<P extends FactorPurpose>(
  purpose: P,
): FactorTables[P] {
  return TABLES[purpose];
}

/** An issue's tables, each checked to be the one its purpose names and
 *  to share one in-use date: a transcription slip that files a table
 *  under the wrong purpose, or mixes in a table from another issue,
 *  fails here at load rather than pricing a drawing on it. Exported for
 *  its test; the package root does not reach this module. */
export function tablesOf(issue: FactorIssue): FactorTables {
  for (const [purpose, data] of entriesOf(issue)) {
    const ref = data.provenance.tableRef;
    invariant(
      ref === FACTOR_TABLES[purpose],
      `table ${ref} is held as ${purpose}, which is ${FACTOR_TABLES[purpose]}`,
    );
  }
  oneIssue(Object.values(issue));
  // The cast is sound: the entries are every key of a total
  // `FactorIssue`, each wrapped with the index its own data carries.
  return Object.fromEntries(
    entriesOf(issue).map(([purpose, data]) => [
      purpose, new FactorTable<FactorTableIndex>(data),
    ]),
  ) as FactorTables;
}

function entriesOf(
  issue: FactorIssue,
): [FactorPurpose, FactorIssue[FactorPurpose]][] {
  // `Object.entries` widens keys to string, and structural typing lets
  // a `FactorIssue` value carry keys beyond its purposes, so the
  // assertion is not proved by the type. It is safe because `tablesOf`
  // reads `FACTOR_TABLES[purpose]` for every entry first and fails loud
  // on a key that is not a purpose, before any table is built.
  return Object.entries(issue) as [FactorPurpose, FactorIssue[FactorPurpose]][];
}
