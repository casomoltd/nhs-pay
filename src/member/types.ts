/**
 * The vocabulary of a member's benefits: what a caller tells the library
 * about a member and their choices, and the shapes it answers with. Types
 * and the ids they are keyed by only, so the service check, the valuation
 * and the owner in `benefits.ts` all read one definition.
 */
import type {PensionInputPeriod, TaxYearEnd} from '@casomoltd/paye-calc';
import type {CashChoice, CommutationResult} from '../commutation.js';
import type {FactorOutcome} from '../factor-basis.js';
import type {IsoDate} from '../iso-date.js';
import type {MemberPay, PayPath} from '../pay-path.js';
import type {ProjectionPoint} from '../pension/curve.js';
import type {EstimatedHistory} from '../pension/history.js';
import type {MemberLedger} from '../pension/ledger.js';
import type {ProjectionMoney} from '../pension/money.js';
import type {Prices} from '../pension/prices.js';
import type {FinalSalaryRules, PayMeasure} from '../sections/final-salary.js';

// ── Vocabulary ──────────────────────────────────────

/**
 * One scheme, the NHS Pension Scheme, in three sections. "Scheme" only
 * ever means the whole; each part is a section, as a member's own
 * Annual Benefit Statement prints it.
 */
export const SECTIONS = {
  s1995: 'section-1995',
  s2008: 'section-2008',
  s2015: 'section-2015',
} as const;

export type SectionId = (typeof SECTIONS)[keyof typeof SECTIONS];

/** The two final-salary sections, which McCloud calls the legacy
 *  scheme. */
export type LegacySectionId = Exclude<SectionId, typeof SECTIONS.s2015>;

// ── What the member told us ─────────────────────────

/** Joined and left, per section, as the member declared it. */
export interface DeclaredPeriod {
  readonly section: SectionId;
  readonly joined: IsoDate;
  /** Null while still in service. */
  readonly left: IsoDate | null;
}

export interface Member {
  readonly dateOfBirth: IsoDate;
  readonly service: readonly DeclaredPeriod[];
  readonly pay: MemberPay;
  /** A 2015 Section balance read off an Annual Benefit Statement,
   *  which seeds its ledger at the statement's date. Null where the
   *  member gave none. */
  readonly statement: {
    readonly accruedPension: number;
    readonly asAt: IsoDate;
  } | null;
}

/** How the cash ruler reads the years behind the run date. */
export const PAST_YEARS = {
  /** The assumption throughout, as for the years ahead. */
  assumed: 'assumed',
  /** The published record: each year's Revaluation Order, and pay
   *  carried into each year's cash by the same Orders' CPI, an
   *  approximation to the pay awards — the ledger an Annual Benefit
   *  Statement prints. See `createPublishedPrices`. */
  published: 'published',
} as const;

export type PastYears = (typeof PAST_YEARS)[keyof typeof PAST_YEARS];


/** Fixed for one valuation, and worth disclosing beside it. Pay growth is
 *  not here: it is GAD's published curve, the same for everybody. */
export interface Assumptions {
  readonly assumedCpi: number;
  /** Which cash ledger comes back, so the caller names it. The
   *  today's-money ruler is the assumption at zero either way. */
  readonly pastYears: PastYears;
}

/**
 * How the remedy window is valued, for a member who has one: as more
 * service in their legacy section, or under the 2015 Section's rules
 * while still paid from the legacy section. There is no default and no
 * preferred answer: which pays more depends on the choices a caller
 * compares, and the library cannot see them.
 */
export const REMEDY_BASES = {
  none: 'none',
  legacy: 'legacy-basis',
  section2015: 'section-2015-basis',
} as const;

export type RemedyBasis = (typeof REMEDY_BASES)[keyof typeof REMEDY_BASES];

export type RemedyElection = {readonly kind: RemedyBasis};

/** One set of choices; a caller comparing options asks once for each. */
export interface RetirementChoices {
  /** The last day of pensionable service: its scheme year accrues
   *  for the months served to it. */
  readonly leaving: IsoDate;
  /** Every section is drawn on this one date. Drawing sections on
   *  different dates, and partial retirement, are deferred:
   *  https://github.com/casomoltd/nhs-pay/issues/17 */
  readonly drawing: IsoDate;
  readonly remedy: RemedyElection;
  readonly cash: CashChoice;
}

// ── What the library answers with ───────────────────

/** What a period is: service in its own right, or the McCloud remedy
 *  window, held in the legacy section and valued on either basis. */
export const PERIOD_KINDS = {
  ordinary: 'ordinary',
  remedyWindow: 'remedy-window',
} as const;

/** A window of service between two events, held in one section. */
export interface ServicePeriod {
  readonly section: SectionId;
  readonly from: IsoDate;
  /** Null while the member is still in service in it; `at()` closes
   *  it at the leaving date. */
  readonly to: IsoDate | null;
  readonly kind: (typeof PERIOD_KINDS)[keyof typeof PERIOD_KINDS];
}

/** How a section accrues: on final salary, or on a career average. */
export const ACCRUALS = {
  finalSalary: 'final-salary',
  careerAverage: 'career-average',
} as const;

export type Accrual = (typeof ACCRUALS)[keyof typeof ACCRUALS];

/**
 * One section's benefit on one basis. A legacy section returns two
 * when its remedy window is valued on the 2015 basis: that part is
 * paid from the legacy section but determined under the 2015
 * Section's rules. `provenance` says which rules produced the figure,
 * so a reviewer can check it; nothing computes with it.
 */
export interface Award {
  /** Where it is held and paid from. */
  readonly section: SectionId;
  readonly periods: readonly ServicePeriod[];
  /** The PENSION at the drawing before its factor: final salary as
   *  measured, or the career average pot as revalued. */
  readonly pensionBeforeFactor: ProjectionMoney;
  /** After the factor: what is paid. */
  readonly pension: ProjectionMoney;
  /** Nil rather than absent where the rules pay none, so a caller
   *  cannot forget to ask. */
  readonly automaticLumpSum: ProjectionMoney;
  /** The automatic lump sum at the drawing before its early or late
   *  factor, on the same rulers as `pensionBeforeFactor`: the section's multiple
   *  of that pension. Nil where the rules pay none, as a career average
   *  award never does. */
  readonly automaticLumpSumBeforeFactor: ProjectionMoney;
  /** The PENSION's early or late factor. The lump sum is reduced by its
   *  own, `automaticLumpSumFactor`, so read the lump sum before it from
   *  `automaticLumpSumBeforeFactor`, never by dividing by this. */
  readonly pensionFactor: FactorOutcome;
  /** The automatic lump sum's own early or late factor; null where the
   *  rules pay no automatic lump sum, as a career average award never
   *  does. */
  readonly automaticLumpSumFactor: FactorOutcome | null;
  /** A career average award's year-by-year walk, in cash and in today's
   *  money; null for final salary, which keeps no balance to walk. */
  readonly ledgers: {
    readonly cash: MemberLedger;
    readonly todaysMoney: MemberLedger;
  } | null;
  readonly provenance:
    | {
      readonly accrual: typeof ACCRUALS.finalSalary;
      readonly denominator: FinalSalaryRules['denominator'];
      readonly payMeasure: PayMeasure;
      /** The years valued, and the pay they were measured on, in
       *  today's money: the two figures a reviewer checks first. */
      readonly membership: number;
      readonly finalPay: number;
    }
    /** The 2015 Section's rule, 1/54 of each year's pay revalued: the
     *  accrual names it, so no field restates the rate. */
    | {readonly accrual: typeof ACCRUALS.careerAverage};
}

/** One answer to `at()`: every option compared is its own. */
export interface Position {
  readonly choices: RetirementChoices;
  readonly awards: readonly Award[];
  /** Summed across awards, after each award's own factor, before
   *  cash. */
  readonly crystallised: {
    readonly pension: ProjectionMoney;
    readonly automaticLumpSum: ProjectionMoney;
  };
  readonly cash: CommutationResult;
  /** The price series the cash reading walked with, for converting an
   *  outside figure — a cap, a target — into the same rulers. */
  readonly prices: Prices;
  /*
   * The four fields below are the 2015 Section's own, and only its: a
   * final-salary section keeps no year-by-year balance to walk.
   */
  /** The 2015 Section's ledger as the member reads it on a statement,
   *  in cash; and the same walk in today's money. The same objects as
   *  the 2015 Section award's own `ledgers`, named here because a
   *  statement is read against this one section. */
  readonly ledger: MemberLedger;
  readonly todaysMoneyLedger: MemberLedger;
  /** The 2015 Section's years before a stated balance, estimated in
   *  today's money; null where the member gave no statement, or joined
   *  in its own year. Calibrated to land exactly on the stated
   *  balance. */
  readonly estimatedHistory: EstimatedHistory | null;
  /** The 2015 Section's balance at each scheme year end, both
   *  rulers. */
  readonly curve: readonly ProjectionPoint[];
}

/** A legacy section's rules, read from its statute. */
export interface LegacyRules {
  readonly section: LegacySectionId;
  /** The age its pension is payable unreduced, which its factors are
   *  measured from. */
  readonly pensionAge: number;
  /** The 80 in "1/80 of final pay for each year". */
  readonly denominator: FinalSalaryRules['denominator'];
  /** The automatic lump sum as a multiple of the pension; null where
   *  the section pays none. */
  readonly automaticLumpSum: number | null;
  /** Whether drawing after the pension age raises the pension. */
  readonly lateUplift: boolean;
}

/** What the member holds today, per section, with the remedy window
 *  on the legacy basis — their position since rollback. */
export interface Holdings {
  readonly bySection: readonly {
    readonly section: SectionId;
    readonly pension: ProjectionMoney;
    /** The automatic lump sum that comes with it, unreduced; nil where
     *  the section pays none. */
    readonly automaticLumpSum: ProjectionMoney;
  }[];
  readonly total: ProjectionMoney;
}

export interface MemberBenefits {
  /** What the member holds, derived from their service and checked. */
  readonly periods: readonly ServicePeriod[];
  /** Whether they have a remedy window, and so must pass an election
   *  to `at()`. */
  readonly remedy: boolean;
  /** The legacy section they hold and its rules; null where they hold
   *  the 2015 Section alone. */
  readonly legacy: LegacyRules | null;
  /** The pay every section reads, built once for the member. */
  readonly payPath: PayPath;
  /** The earliest age this member may draw every section they hold on
   *  `drawing`, other than through ill health: the law's minimum pension
   *  age on that day, or the protected age they keep. A 1995 Section age
   *  below it is that section's alone and is not modelled
   *  (docs/how-it-works.md#minimum-pension-age). `at()` refuses a drawing
   *  before they reach it. */
  minimumPensionAgeOn(drawing: IsoDate): number;
  /** Whether this member may draw on `drawing`, other than through ill
   *  health: on or after the birthday at which they reach
   *  `minimumPensionAgeOn(drawing)`. `at()` refuses a drawing this
   *  refuses. */
  mayDrawOn(drawing: IsoDate): boolean;
  /** Worth today, before any drawing: unreduced, with the remedy window on
   *  the legacy basis. A member who has left holds their deferred
   *  benefits, final pay measured at leaving. */
  now(): Holdings;
  /** Worth when drawn, for one set of choices. Throws RangeError for a
   *  drawing before the member reaches `minimumPensionAgeOn(drawing)`. */
  at(choices: RetirementChoices): Position;
  /**
   * The pension input period for the tax year ending in `taxYearEnd` (2027
   * for 2026-27; paye-calc's `taxYearEndFor` names the one a date falls in,
   * and no scheme year passes for one), for a member leaving on
   * `choices.leaving` on the McCloud election `choices.remedy`, both as
   * `at()` takes them, for paye-calc's `definedBenefitInput`: each
   * arrangement's pension and automatic lump sum at the year's start and
   * end, before any early or late factor, in cash at `assumedCpi` (a
   * decimal) on this member's reading of the past years, whatever CPI they
   * were built at. The period's own `cpi` is read from that series, so on
   * published past years it is the Order's figure. The year the member
   * leaves in closes on the leaving date, and every year after holds the
   * deferred benefits. Throws RangeError for a year before 2016-17, a
   * leaving after the one declared, or an election `at()` would refuse
   * (docs/how-it-works.md#a-years-pension-input).
   */
  pensionInputPeriod(
    taxYearEnd: TaxYearEnd,
    choices: Pick<RetirementChoices, 'leaving' | 'remedy'>,
    assumedCpi: number,
  ): PensionInputPeriod;
}
