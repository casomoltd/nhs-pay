/**
 * The one door every early or late retirement factor is read through,
 * and the citations of the tables behind them.
 *
 * A factor is read against the pension age the reduction is measured
 * from. That is how GAD segments the tables: 1-402 serves any benefit
 * with a pension age of 65, whichever section holds it. So a basis is
 * keyed by the pension age, and states the table each side of it reads:
 * each section declares its own, and the type ties every table to the
 * pension age it is printed against, so the 1995 Section, measured from
 * 60, has no way to name 1-402.
 *
 * So one drawing age means different things in different sections. Drawn
 * at 66, a 1995 Section pension is late (its pension age is 60) but takes
 * no uplift, because that section's basis declares none; a 2008 Section
 * pension is late against 65 and reads 2-416; a 2015 Section pension with
 * a Normal Pension Age of 67 is early and reads 0-420. Early or late is
 * judged here, from the dates against the pension age the basis names,
 * never the member's age alone. The one other judgement is the
 * deprecated `retirementFactor` route, which takes a pension-age date
 * rather than a date of birth and so judges its own side until it
 * retires (https://github.com/casomoltd/nhs-pay/issues/21).
 */
import {periodInYearsMonths, npaDate} from './dates.js';
import type {Period} from './dates.js';
import {LEGACY_PENSION_AGES} from './pension/ages.js';
import {factorTable} from './gad/factor-set.js';
import type {FactorPurpose, PurposeOf} from './gad/factor-set.js';
import {timesMoney} from './pension/money.js';
import type {ProjectionMoney} from './pension/money.js';
import type {
  AgeIndex,
  FactorProvenance,
  FactorTable,
  FactorTableKind,
  PeriodIndex,
} from './gad/factor-table.js';

/**
 * What a factor is measured against, and the table read on each side of
 * it. A 1995 Section drawing before 60 reduces its pension and its
 * automatic lump sum by two tables, and its late arm is a declared
 * absence rather than a table; a late 2015 Section drawing uplifts main
 * and additional pension by two.
 */
export type FactorBasis =
  | {
    readonly against: typeof LEGACY_PENSION_AGES.section1995;
    readonly early: PurposeOf<'early1995Pension' | 'early1995LumpSum'>;
    readonly late: typeof FACTOR_SOURCES.noLateUplift;
  }
  | {
    readonly against: typeof LEGACY_PENSION_AGES.section2008;
    readonly early: PurposeOf<'earlyAge65'>;
    readonly late: PurposeOf<'late2008'>;
  }
  | Basis2015;

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

/**
 * A figure before and after its early or late factor, and the factor.
 * Read the figure before it from `beforeFactor`, never by dividing `after`
 * by `factor`: a pension and its lump sum each have their own factor.
 * `F` is `FactorOutcome | null` where the rules may apply no factor
 * because they pay nothing.
 */
export interface Factored<F extends FactorOutcome | null = FactorOutcome> {
  readonly beforeFactor: ProjectionMoney;
  /** After the factor: what is paid. */
  readonly after: ProjectionMoney;
  readonly factor: F;
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
 *  so a section cannot name a benefit it does not have. */
export type Applies1995 =
  typeof FACTOR_APPLIES.pension | typeof FACTOR_APPLIES.lumpSum;
export type Applies2015 =
  typeof FACTOR_APPLIES.pension | typeof FACTOR_APPLIES.additionalPension;

/** A 2015 Section basis: the member's own pension age, one early table
 *  for every benefit, and a late table per benefit. */
type Basis2015 = {
  readonly against: typeof MEMBERS_NPA;
  readonly npa: number;
  readonly early: PurposeOf<'early2015'>;
  readonly late: PurposeOf<'late2015' | 'late2015AdditionalPension'>;
};

/** The 2015 Section's pension age is the member's own, not a fixed one. */
export const MEMBERS_NPA = 'npa';

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

/**
 * The 2015 Section's table on each side of its pension age, by benefit.
 * Held at the door rather than in the section because the citation
 * accessors below name the main pension's tables too, and one statement
 * of the choice serves both.
 */
export const TABLES_2015 = {
  [FACTOR_APPLIES.pension]: {early: 'early2015', late: 'late2015'},
  [FACTOR_APPLIES.additionalPension]: {
    early: 'early2015', late: 'late2015AdditionalPension',
  },
} as const satisfies Record<Applies2015, Pick<Basis2015, 'early' | 'late'>>;

/** Which side of the pension age a drawing falls, and the name of the
 *  arm of a basis it reads. */
const FACTOR_DIRECTIONS = {
  early: 'early',
  late: 'late',
} as const;

/** The 2015 Section main pension's table for each factor kind: an ERF is
 *  its early table, an LRF its late one. */
const MAIN_2015_OF_KIND = {
  erf: TABLES_2015[FACTOR_APPLIES.pension].early,
  lrf: TABLES_2015[FACTOR_APPLIES.pension].late,
} as const satisfies Record<FactorTableKind, FactorPurpose>;

/* Every table is read from the one set (`factor-set.ts`); re-exported
   so the deprecated `retirementFactor` route reads it through this door
   too, and two callers cannot read one table two ways. */
export {factorTable};

/**
 * Whether a drawing falls before the pension age a basis is measured
 * from: the judgement of early or late that `readFactor` and a section
 * refusing an early drawing both take from here. Only the deprecated
 * `retirementFactor` route judges its own, until it retires
 * (https://github.com/casomoltd/nhs-pay/issues/21).
 */
export function drawnEarly(
  basis: FactorBasis,
  dateOfBirth: Date,
  drawn: Date,
): boolean {
  return drawn < pensionAgeDate(basis, dateOfBirth);
}

/**
 * Read the factor for a drawing. The dates decide the direction, once,
 * and the basis's arm for that direction names the table or declares
 * that none is read.
 */
export function readFactor(
  basis: FactorBasis,
  dateOfBirth: Date,
  drawn: Date,
): FactorOutcome {
  const at = pensionAgeDate(basis, dateOfBirth);
  const drawnAtPensionAge = drawn.getTime() === at.getTime();
  if (drawnAtPensionAge) {
    return {source: FACTOR_SOURCES.atPensionAge, factor: 1};
  }
  const early = drawnEarly(basis, dateOfBirth, drawn);
  const reads = basis[
    early ? FACTOR_DIRECTIONS.early : FACTOR_DIRECTIONS.late
  ];
  if (reads === FACTOR_SOURCES.noLateUplift) {
    return {source: FACTOR_SOURCES.noLateUplift, factor: 1};
  }
  const table = factorTable(reads);
  // The 1995 and 2008 Sections' tables are read at the member's age on
  // the day they draw; the 2015 Section's at the time to or after its
  // Normal Pension Age.
  const fromPensionAge = early
    ? periodInYearsMonths(drawn, at)
    : periodInYearsMonths(at, drawn);
  const factor = keyedByAge(table)
    ? table.factorAtAge(periodInYearsMonths(dateOfBirth, drawn))
    : table.factorFor(fromPensionAge);
  return {
    source: FACTOR_SOURCES.table,
    factor,
    tableKind: table.kind,
    provenance: table.provenance,
  };
}

/**
 * A figure with its factor applied: the one place `after` is made, so it
 * is always `beforeFactor` times the factor, in both rulers. No factor
 * means the rules pay nothing, so nothing is paid after it.
 */
export function factored<F extends FactorOutcome | null>(
  beforeFactor: ProjectionMoney, factor: F,
): Factored<F> {
  const times = factor === null ? 0 : factor.factor;
  return {beforeFactor, after: timesMoney(beforeFactor, times), factor};
}

/**
 * Provenance of the **2015 Section main pension's** table behind a factor
 * kind: `erf` is 0-420 and `lrf` is 0-421. These are the citation facts
 * (table ref, guidance name, issue and implementation dates, source)
 * consumers render instead of hand-typing them.
 *
 * The additional-pension late table, 0-422, has no accessor here: a
 * drawing that read it carries its provenance on its `FactorOutcome`.
 */
export function factorProvenance(kind: FactorTableKind): FactorProvenance {
  return factorTable(MAIN_2015_OF_KIND[kind]).provenance;
}

/**
 * The **2015 Section's** early retirement factor for drawing a whole
 * period before its pension age, for a caller that holds the period
 * rather than the two dates it spans. The 1995 and 2008 Sections are
 * keyed by age and are not read here. A whole period has no part-month
 * to round, so the table is read at exactly that row. Months are 0 to
 * 11; a period past the last printed row raises
 * `RetirementFactorOutOfRange`.
 */
export function erf2015For(period: Omit<Period, 'days'>): number {
  return factorTable(MAIN_2015_OF_KIND.erf).factorFor({...period, days: 0});
}

/** The day a basis's pension age falls for a member. */
function pensionAgeDate(basis: FactorBasis, dateOfBirth: Date): Date {
  const pensionAge = basis.against === MEMBERS_NPA ? basis.npa : basis.against;
  return npaDate(dateOfBirth, pensionAge);
}

function keyedByAge(
  table: FactorTable<PeriodIndex> | FactorTable<AgeIndex>,
): table is FactorTable<AgeIndex> {
  return table.index.by === 'age';
}
