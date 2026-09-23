/**
 * The one door every early or late retirement factor is read through.
 *
 * A factor is read against the pension age the reduction is measured
 * from, and the direction. That is how GAD segments the tables: 1-402
 * serves any benefit with a pension age of 65, whichever section holds
 * it. So the key is the pension age, not the section — and each section
 * derives its key privately from its own rules, which is what keeps the
 * 1995 Section from reading 1-402 although the type would allow it.
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
import {ERF_1_401} from './gad/erf-1-401-2023-06-30.js';
import {ERF_1_402} from './gad/erf-1-402-2023-06-30.js';
import {ERF_1_407} from './gad/erf-1-407-2023-06-30.js';
import {LRF_2_416} from './gad/lrf-2-416-2023-06-30.js';

const TABLES = {
  '0-420': new FactorTable(ERF_0_420),
  '0-421': new FactorTable(LRF_0_421),
  '1-401': new FactorTable(ERF_1_401),
  '1-402': new FactorTable(ERF_1_402),
  '1-407': new FactorTable(ERF_1_407),
  '2-416': new FactorTable(LRF_2_416),
} as const;

/** Every table the library reads, by its GAD reference. The one set of
 *  instances, so two callers cannot read the same table two ways. */
export function factorTable<K extends keyof typeof TABLES>(
  ref: K,
): (typeof TABLES)[K] {
  return TABLES[ref];
}

/** Which 1995 Section benefit a factor reduces: the pension and the
 *  automatic lump sum read different tables. */
export const FACTOR_APPLIES = {
  pension: 'pension',
  lumpSum: 'lump-sum',
} as const;

export type FactorApplies =
  (typeof FACTOR_APPLIES)[keyof typeof FACTOR_APPLIES];

/**
 * What a factor is measured against. A 1995 Section drawing before 60
 * reduces its pension and its automatic lump sum by two different
 * tables, so that basis says which of the two it is for.
 */
export type FactorBasis =
  | {against: 60; direction: 'early'; applies: FactorApplies}
  | {against: 65; direction: 'early'}
  | {against: 65; direction: 'late'}
  | {against: 'npa'; npa: number; direction: 'early' | 'late'};

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
  if (basis.against === 'npa') {
    return basis.direction === 'early'
      ? TABLES['0-420']
      : TABLES['0-421'];
  }
  if (basis.against === 60) {
    return basis.applies === FACTOR_APPLIES.pension
      ? TABLES['1-401']
      : TABLES['1-407'];
  }
  return basis.direction === 'early'
    ? TABLES['1-402']
    : TABLES['2-416'];
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
  const pensionAge = basis.against === 'npa' ? basis.npa : basis.against;
  const at = npaDate(dateOfBirth, pensionAge);
  if (drawn.getTime() === at.getTime()) {
    return {source: FACTOR_SOURCES.atPensionAge, factor: 1};
  }
  invariant(
    (drawn < at) === (basis.direction === 'early'),
    `factor basis says ${basis.direction} for a drawing on `
      + `${drawn.toDateString()} against ${at.toDateString()}`,
  );
  const table = tableFor(basis);
  if (keyedByAge(table)) {
    return {
      source: FACTOR_SOURCES.table,
      factor: table.factorAtAge(periodInYearsMonths(dateOfBirth, drawn)),
      tableKind: table.kind,
      provenance: table.provenance,
    };
  }
  const period = drawn < at
    ? periodInYearsMonths(drawn, at)
    : periodInYearsMonths(at, drawn);
  return {
    source: FACTOR_SOURCES.table,
    factor: table.factorFor(period),
    tableKind: table.kind,
    provenance: table.provenance,
  };
}
