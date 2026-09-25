/**
 * The one door every early or late retirement factor is read through.
 *
 * A factor is read against the pension age the reduction is measured
 * from, and the direction. That is how GAD segments the tables: 1-402
 * serves any benefit with a pension age of 65, whichever section holds
 * it. So the key is the pension age, not the section — and each section
 * derives its key privately from its own rules, which is what keeps the
 * 1995 Section from reading 1-402 although the type would allow it.
 *
 * So one drawing age means different things in different sections. Drawn
 * at 66, a 1995 Section pension is late (its pension age is 60) but takes
 * no uplift, because that section pays none; a 2008 Section pension is
 * late against 65 and reads 2-416; a 2015 Section pension with a Normal
 * Pension Age of 67 is early and reads 0-420. Early or late is always
 * judged against the pension age the section names, never the member's
 * age alone.
 */
import {periodInYearsMonths, npaDate} from './dates.js';
import {invariant} from './errors.js';
import {FactorTable} from './gad/factor-table.js';
import type {
  AgeIndex,
  FactorProvenance,
  FactorTableKind,
  PeriodIndex,
} from './gad/factor-table.js';
import {ERF_0_420} from './gad/erf-2023-06-30.js';
import {LRF_0_421} from './gad/lrf-2023-06-30.js';
import {LRF_0_422} from './gad/lrf-0-422-2023-06-30.js';
import {ERF_1_401} from './gad/erf-1-401-2023-06-30.js';
import {ERF_1_402} from './gad/erf-1-402-2023-06-30.js';
import {ERF_1_407} from './gad/erf-1-407-2023-06-30.js';
import {LRF_2_416} from './gad/lrf-2-416-2023-06-30.js';

/**
 * The fixed pension ages the legacy sections' factors are measured from,
 * named for the section that sets each. The tables are keyed by pension
 * age (see the header), and these are the only two a legacy benefit has;
 * the 2015 Section's is the member's own Normal Pension Age.
 */
export const LEGACY_PENSION_AGES = {
  section1995: 60,
  section2008: 65,
} as const;

/**
 * The factor tables the library reads, named for what each is for. The
 * value is GAD's own table reference, which is how the table is found in
 * the workbook and the NHSBSA extract to check it; the name is how code
 * picks one, so no branch below reads a reference it has to decode.
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

const TABLES = {
  [FACTOR_TABLES.early2015]: new FactorTable(ERF_0_420),
  [FACTOR_TABLES.late2015]: new FactorTable(LRF_0_421),
  [FACTOR_TABLES.late2015AdditionalPension]: new FactorTable(LRF_0_422),
  [FACTOR_TABLES.early1995Pension]: new FactorTable(ERF_1_401),
  [FACTOR_TABLES.early1995LumpSum]: new FactorTable(ERF_1_407),
  [FACTOR_TABLES.earlyAge65]: new FactorTable(ERF_1_402),
  [FACTOR_TABLES.late2008]: new FactorTable(LRF_2_416),
} as const;

/** Every table the library reads, by its GAD reference. The one set of
 *  instances, so two callers cannot read the same table two ways. */
export function factorTable<K extends keyof typeof TABLES>(
  ref: K,
): (typeof TABLES)[K] {
  return TABLES[ref];
}

/** Which benefit a factor applies to, where two benefits measured from
 *  one pension age read different tables: a 1995 Section pension and its
 *  automatic lump sum, and 2015 Section additional pension. */
export const FACTOR_APPLIES = {
  pension: 'pension',
  lumpSum: 'lump-sum',
  /** Additional pension bought in the 2015 Section, which GAD gives its
   *  own late factor (0-422) and the main pension's early one. */
  additionalPension: 'additional-pension',
} as const;

/** The benefits each section splits its tables by: typed per section,
 *  so a basis cannot name a benefit its section does not have. */
export type Applies1995 =
  typeof FACTOR_APPLIES.pension | typeof FACTOR_APPLIES.lumpSum;
export type Applies2015 =
  typeof FACTOR_APPLIES.pension | typeof FACTOR_APPLIES.additionalPension;

/** Which side of the pension age a drawing falls. */
export const FACTOR_DIRECTIONS = {
  early: 'early',
  late: 'late',
} as const;

export type FactorDirection =
  (typeof FACTOR_DIRECTIONS)[keyof typeof FACTOR_DIRECTIONS];

/** The 2015 Section's pension age is the member's own, not a fixed one. */
export const MEMBERS_NPA = 'npa';

/**
 * What a factor is measured against, and for which benefit where the
 * tables differ by benefit: a 1995 Section drawing before 60 reduces its
 * pension and its automatic lump sum by two tables, and a late 2015
 * Section drawing uplifts main and additional pension by two.
 */
export type FactorBasis =
  | {
    against: typeof LEGACY_PENSION_AGES.section1995;
    direction: typeof FACTOR_DIRECTIONS.early;
    applies: Applies1995;
  }
  | {
    against: typeof LEGACY_PENSION_AGES.section2008;
    direction: FactorDirection;
  }
  | {
    against: typeof MEMBERS_NPA;
    npa: number;
    direction: FactorDirection;
    applies: Applies2015;
  };

/**
 * Where a factor came from: a table, or one of the two reasons a drawing
 * reads none. Every 1.000 says why it is 1.000, because "drawn exactly
 * at the pension age" and "this section pays no late uplift" are
 * different facts that print the same number.
 */
export const FACTOR_SOURCES = {
  table: 'table',
  atPensionAge: 'at-normal-pension-age',
  noLateUplift: 'section-awards-no-late-uplift',
} as const;

/** A factor and where it came from, discriminated on `source`. */
export type FactorOutcome =
  | {
    readonly source: typeof FACTOR_SOURCES.table;
    readonly factor: number;
    readonly tableKind: FactorTableKind;
    readonly provenance: FactorProvenance;
  }
  | {
    readonly source: typeof FACTOR_SOURCES.atPensionAge;
    readonly factor: 1;
  }
  | {
    readonly source: typeof FACTOR_SOURCES.noLateUplift;
    readonly factor: 1;
  };

/** The table a basis reads, and how it is keyed. */
function tableFor(
  basis: FactorBasis,
): FactorTable<PeriodIndex> | FactorTable<AgeIndex> {
  const section2015 = basis.against === MEMBERS_NPA;
  const section1995 = basis.against === LEGACY_PENSION_AGES.section1995;
  const early = basis.direction === FACTOR_DIRECTIONS.early;
  if (section2015) {
    const additionalPension =
      basis.applies === FACTOR_APPLIES.additionalPension;
    if (early) return TABLES[FACTOR_TABLES.early2015];
    return additionalPension
      ? TABLES[FACTOR_TABLES.late2015AdditionalPension]
      : TABLES[FACTOR_TABLES.late2015];
  }
  if (section1995) {
    const pension = basis.applies === FACTOR_APPLIES.pension;
    return pension
      ? TABLES[FACTOR_TABLES.early1995Pension]
      : TABLES[FACTOR_TABLES.early1995LumpSum];
  }
  return early
    ? TABLES[FACTOR_TABLES.earlyAge65]
    : TABLES[FACTOR_TABLES.late2008];
}

const keyedByAge = (
  table: FactorTable<PeriodIndex> | FactorTable<AgeIndex>,
): table is FactorTable<AgeIndex> => table.index.by === 'age';

/**
 * Read the factor for a drawing. The date decides the direction as well
 * as the cell, so a basis whose direction the dates contradict is a bug
 * in the section that derived it and fails loud.
 */
export function readFactor(
  basis: FactorBasis,
  dateOfBirth: Date,
  drawn: Date,
): FactorOutcome {
  const section2015 = basis.against === MEMBERS_NPA;
  const pensionAge = section2015 ? basis.npa : basis.against;
  const at = npaDate(dateOfBirth, pensionAge);
  const drawnAtPensionAge = drawn.getTime() === at.getTime();
  if (drawnAtPensionAge) {
    return {source: FACTOR_SOURCES.atPensionAge, factor: 1};
  }
  const drawnEarly = drawn < at;
  invariant(
    drawnEarly === (basis.direction === FACTOR_DIRECTIONS.early),
    `factor basis says ${basis.direction} for a drawing on `
      + `${drawn.toDateString()} against ${at.toDateString()}`,
  );
  const table = tableFor(basis);
  // The 1995 and 2008 Sections' tables are read at the member's age on
  // the day they draw; the 2015 Section's at the time to or after its
  // Normal Pension Age.
  const readAtMembersAge = keyedByAge(table);
  if (readAtMembersAge) {
    return {
      source: FACTOR_SOURCES.table,
      factor: table.factorAtAge(periodInYearsMonths(dateOfBirth, drawn)),
      tableKind: table.kind,
      provenance: table.provenance,
    };
  }
  const period = drawnEarly
    ? periodInYearsMonths(drawn, at)
    : periodInYearsMonths(at, drawn);
  return {
    source: FACTOR_SOURCES.table,
    factor: table.factorFor(period),
    tableKind: table.kind,
    provenance: table.provenance,
  };
}
