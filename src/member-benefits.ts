/**
 * A member's benefits across every section they hold: built once from
 * what the member told us, then asked one question per set of
 * retirement choices.
 *
 * Everything ABOUT the member goes in once, when the owner is built;
 * each method takes only the question. So a caller never assembles the
 * member again per option, and no section, pay path or ledger is a
 * thing it has to build.
 *
 * Rules come in two tiers. Each section's own — denominator, pay
 * measure, pension age, lump sum, factors — belong to that section;
 * the ones a caller reads are the legacy section's, through
 * `MemberBenefits.legacy`. The rules over the whole set live
 * here: which sections a member holds and whether their service is
 * eligible for the McCloud remedy, then, at the drawing, summing every
 * award into one pension and one automatic lump sum and taking cash
 * across that one total.
 */
import {cashAt, nhsCommutationLimits} from './commutation.js';
import type {CashChoice, CommutationResult} from './commutation.js';
import {BenefitNotModelled, invariant, NOT_MODELLED} from './errors.js';
import type {FactorOutcome} from './factor-basis.js';
import type {IsoDate} from './iso-date.js';
import {isoDate, isoDateOf, isoToDate} from './iso-date.js';
import {normalPensionAge} from './npa.js';
import {buildPayPath} from './pay-path.js';
import type {MemberPay, PayPath} from './pay-path.js';
import {earliest} from './dates.js';
import {buildCurve, walkThrough} from './pension/curve.js';
import type {ProjectionPoint} from './pension/curve.js';
import {seedFromBalanceAt} from './pension/uplift.js';
import type {MemberLedger} from './pension/ledger.js';
import {estimateHistory} from './pension/history.js';
import type {EstimatedHistory} from './pension/history.js';
import {moneyAt, sumMoney} from './pension/money.js';
import type {ProjectionMoney} from './pension/money.js';
import {createPrices} from './pension/prices.js';
import type {Prices} from './pension/prices.js';
import {
  schemeYearEndDate,
  schemeYearEndFor,
  seedFromJoinDate,
} from './pension/seed.js';
import type {LedgerSeed} from './pension/seed.js';
import {
  finalSalaryBenefit,
  unreducedPension,
} from './sections/final-salary.js';
import type {
  FinalSalaryRules, PayMeasure,
} from './sections/final-salary.js';
import {RULES_1995} from './sections/section-1995.js';
import {RULES_2008} from './sections/section-2008.js';
import {careerAverage} from './sections/section-2015.js';
import {npaDate} from './dates.js';

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

/** Fixed for one valuation, and worth disclosing beside it. Pay growth is
 *  not here: it is GAD's published curve, the same for everybody. */
export interface Assumptions {
  readonly assumedCpi: number;
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
  /** Stops accruing. Accrues the whole scheme year it falls in. */
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
  /** The pension at the drawing before its factor: final salary as
   *  measured, or the career average pot as revalued. */
  readonly beforeFactor: ProjectionMoney;
  /** After the factor: what is paid. */
  readonly pension: ProjectionMoney;
  /** Nil rather than absent where the rules pay none, so a caller
   *  cannot forget to ask. */
  readonly automaticLumpSum: ProjectionMoney;
  readonly factor: FactorOutcome;
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
  /** Worth today, before any drawing. */
  now(): Holdings;
  /** Worth when drawn, for one set of choices. */
  at(choices: RetirementChoices): Position;
}

/** A legacy section's rules, as `MemberBenefits.legacy` states them. */
function legacyOf(section: LegacySectionId): LegacyRules {
  const rules = RULES[section];
  return {
    section,
    pensionAge: rules.pensionAge,
    denominator: rules.denominator,
    automaticLumpSum: rules.automaticLumpSum?.multiple ?? null,
    lateUplift: rules.lateUplift,
  };
}

// ── The service, checked ────────────────────────────

/** The remedy period, 1 April 2015 to 31 March 2022, as PSPJOA 2022
 *  s.1 defines it. The days either side are derived from it. */
const REMEDY_FROM = isoDate('2015-04-01');
const REMEDY_TO = isoDate('2022-03-31');
/** PSPJOA 2022 s.1: in pensionable service "on 31 March 2012 or any
 *  earlier day". */
const ELIGIBLE_BY = isoDate('2012-03-31');
/** Rollback put remedy service back in the legacy section on this
 *  date (SI 2023/985), so a statement before it counts the remedy
 *  years in the 2015 Section. */
const ROLLBACK = isoDate('2023-10-01');

/**
 * The dates the McCloud remedy turns on, for a caller that has to read
 * a member's answers against them before it can declare their service.
 */
export const REMEDY = {
  eligibleBy: ELIGIBLE_BY,
  from: REMEDY_FROM,
  to: REMEDY_TO,
  rollback: ROLLBACK,
} as const;

/**
 * The day each later section opened: the 2008 Section to new joiners
 * under SI 2008/653, and the 2015 Section, which every member moved to
 * for service from that day, under SI 2015/94. The 1995 Section is
 * absent: no answer a member gives turns on its opening.
 */
export const SECTION_OPENED = {
  [SECTIONS.s2008]: isoDate('2008-04-01'),
  [SECTIONS.s2015]: REMEDY_FROM,
} as const;


const on = (d: IsoDate) => isoToDate(d);
const daysFrom = (d: IsoDate, days: number) => {
  const date = on(d);
  return new Date(
    date.getFullYear(), date.getMonth(), date.getDate() + days,
  );
};
const dayAfter = (d: IsoDate) => daysFrom(d, 1);
const LAST_BEFORE_2015 = isoDateOf(daysFrom(REMEDY_FROM, -1));
const AFTER_REMEDY = isoDateOf(dayAfter(REMEDY_TO));
/** The last day a period is valued to: its own end, or the leaving
 *  date where that comes first or the period is still open. */
const until = (p: ServicePeriod, leaving: Date) =>
  p.to === null || on(p.to) > leaving ? leaving : on(p.to);

const isLegacy = (section: SectionId): section is LegacySectionId =>
  section !== SECTIONS.s2015;

/** A legacy holding: its section, and its periods in date order. */
interface LegacyHolding {
  readonly section: LegacySectionId;
  readonly periods: readonly ServicePeriod[];
}

/**
 * The periods a member holds, derived from what they declared and
 * refused where it describes something the library does not model.
 *
 * Service is taken as continuous. A break — a gap between one period
 * and the next — decides whether remedy service qualifies, and how a
 * member comes to hold both legacy sections; both are deferred, so a
 * declared break is refused rather than priced as though it were
 * continuous: https://github.com/casomoltd/nhs-pay/issues/16
 *
 * A member with no 2015 Section service after rollback is refused
 * too: https://github.com/casomoltd/nhs-pay/issues/19
 *
 * A declaration that cannot be true — nothing declared, leaving
 * before joining, periods that overlap — is a caller's mistake and
 * throws RangeError.
 */
function servicePeriods(declared: readonly DeclaredPeriod[]): {
  periods: ServicePeriod[];
  legacy: LegacyHolding | null;
} {
  if (declared.length === 0) {
    throw new RangeError('member: no service declared');
  }
  const sorted = [...declared].sort(
    (a, b) => on(a.joined).getTime() - on(b.joined).getTime(),
  );
  sorted.forEach((p, i) => {
    if (p.left !== null && on(p.left) < on(p.joined)) {
      throw new RangeError(`member: ${p.section} left before it was joined`);
    }
    const next = sorted.at(i + 1);
    if (next === undefined) return;
    if (p.left === null || on(next.joined) <= on(p.left)) {
      throw new RangeError(`member: ${p.section} overlaps the next period`);
    }
    if (dayAfter(p.left).getTime() !== on(next.joined).getTime()) {
      throw new BenefitNotModelled(
        NOT_MODELLED.breakInService, 'a break in pensionable service',
      );
    }
  });
  const legacyDeclared = sorted.filter((p) => isLegacy(p.section));
  const reformed = sorted.filter((p) => p.section === SECTIONS.s2015);
  if (legacyDeclared.length > 1) {
    throw new BenefitNotModelled(
      NOT_MODELLED.bothLegacySections, 'service in both legacy sections',
    );
  }
  const current = reformed.at(0);
  if (current === undefined || reformed.length > 1) {
    throw new BenefitNotModelled(
      NOT_MODELLED.no2015Section, 'service without the 2015 Section',
    );
  }
  const held = legacyDeclared.at(0);
  const end = current.left;
  const remedy = held !== undefined
    && on(held.joined) <= on(ELIGIBLE_BY)
    && (end === null || on(end) >= on(REMEDY_FROM));
  if (remedy && end !== null && on(end) <= on(REMEDY_TO)) {
    throw new BenefitNotModelled(
      NOT_MODELLED.remedyMemberLeftEarly,
      'a remedy member who left before 1 April 2022',
    );
  }

  let legacy: LegacyHolding | null = null;
  if (held !== undefined && isLegacy(held.section)) {
    // A legacy period before a 2015 one has a leaving date: the
    // contiguity check above refused an open one.
    invariant(held.left !== null, 'a legacy period with no end');
    const own: ServicePeriod = {
      section: held.section,
      from: held.joined,
      to: remedy ? LAST_BEFORE_2015 : held.left,
      kind: PERIOD_KINDS.ordinary,
    };
    legacy = {
      section: held.section,
      periods: remedy
        ? [own, {
          section: held.section, from: REMEDY_FROM, to: REMEDY_TO,
          kind: PERIOD_KINDS.remedyWindow,
        }]
        : [own],
    };
  }
  const periods: ServicePeriod[] = [
    ...(legacy?.periods ?? []),
    {
      section: SECTIONS.s2015,
      from: remedy ? AFTER_REMEDY : current.joined,
      to: end,
      kind: PERIOD_KINDS.ordinary,
    },
  ];
  return {periods, legacy};
}

// ── The owner ───────────────────────────────────────

const RULES: Record<LegacySectionId, FinalSalaryRules> = {
  [SECTIONS.s1995]: RULES_1995,
  [SECTIONS.s2008]: RULES_2008,
};


type CareerAverageRun = ReturnType<typeof careerAverage>;

/** Everything about the member, derived once, that every question
 *  asked of them reads. */
interface Built {
  readonly member: Member;
  readonly today: Date;
  readonly born: Date;
  readonly npaOn: Date;
  readonly payPath: PayPath;
  readonly legacy: LegacyHolding | null;
  readonly ordinary2015: ServicePeriod;
  readonly cashPrices: Prices;
  readonly todaysPrices: Prices;
}

/** The dates one set of choices is valued at. */
interface Drawing {
  readonly leaving: Date;
  readonly drawing: Date;
}

/** A career average walk over `window`, accruing only inside it. */
function walk(
  b: Built, window: ServicePeriod, seed: LedgerSeed,
  {leaving, drawing}: Drawing, prices: Prices,
): CareerAverageRun {
  const first = schemeYearEndFor(on(window.from));
  const last = schemeYearEndFor(until(window, leaving));
  return careerAverage({
    seed,
    payIn: (year) => (year >= first && year <= last
      ? b.payPath.payFor(year)
      : null),
    dateOfBirth: b.born,
    leaving,
    drawing,
    prices,
    through: walkThrough(drawing, b.npaOn),
  });
}

/** The 2015 Section's own seed: its statement, or its first day. */
function seed2015(b: Built, {leaving, drawing}: Drawing, prices: Prices) {
  const {statement} = b.member;
  return statement === null
    ? seedFromJoinDate(on(b.ordinary2015.from))
    : seedFromBalanceAt(
        statement.accruedPension, on(statement.asAt),
        leaving, drawing, prices,
      );
}

/** The legacy windows as final-salary membership, to `leaving`. */
const membershipOf = (valued: readonly ServicePeriod[], leaving: Date) =>
  valued
    .filter((p) => on(p.from) <= leaving)
    .map((p) => ({from: on(p.from), to: until(p, leaving)}));

/** What the member holds today, with the remedy window on the legacy
 *  basis: unreduced, since nothing is drawn. */
function holdings(b: Built): Holdings {
  const {today} = b;
  const bySection: Holdings['bySection'][number][] = [];
  const flat = (x: number) => moneyAt({nominal: x, real: x}, today);
  if (b.legacy !== null) {
    const {pension, automaticLumpSum} = unreducedPension(
      RULES[b.legacy.section], membershipOf(b.legacy.periods, today),
      b.payPath, schemeYearEndFor(today),
    );
    bySection.push({
      section: b.legacy.section,
      pension: flat(pension),
      automaticLumpSum: flat(automaticLumpSum),
    });
  }
  // Any leaving and drawing after today give the same balance today;
  // these are only where the walk has to stop.
  const leaving = b.ordinary2015.to === null
    ? b.npaOn
    : on(b.ordinary2015.to);
  const dates = {leaving, drawing: leaving < b.npaOn ? b.npaOn : leaving};
  const accrued = walk(
    b, b.ordinary2015, seed2015(b, dates, b.todaysPrices),
    dates, b.todaysPrices,
  ).ledger.accruedAt(today);
  bySection.push({
    section: SECTIONS.s2015,
    pension: flat(accrued),
    automaticLumpSum: flat(0),
  });
  return {
    bySection, total: sumMoney(bySection.map((x) => x.pension), today),
  };
}

/** Refuse choices that cannot be valued, and return their dates. */
function checked(
  b: Built, remedy: boolean, choices: RetirementChoices,
): Drawing {
  const leaving = on(choices.leaving);
  const drawing = on(choices.drawing);
  if (drawing < leaving) {
    throw new RangeError('at: drawn before leaving');
  }
  if (b.ordinary2015.to !== null && on(b.ordinary2015.to) < leaving) {
    throw new RangeError(
      `at: leaving after the member already left, on ${b.ordinary2015.to}`,
    );
  }
  if (remedy !== (choices.remedy.kind !== REMEDY_BASES.none)) {
    throw new RangeError(remedy
      ? 'at: a remedy member needs an election'
      : 'at: an election for a member with no remediable service');
  }
  return {leaving, drawing};
}

/** The legacy section's final-salary award over the periods valued on
 *  final salary, which the election decides. */
function legacyAward(
  b: Built, legacy: LegacyHolding, valued: readonly ServicePeriod[],
  dates: Drawing,
): Award {
  const rules = RULES[legacy.section];
  const benefit = finalSalaryBenefit(rules, {
    windows: membershipOf(valued, dates.leaving),
    payPath: b.payPath, dateOfBirth: b.born, ...dates,
    prices: b.cashPrices,
  });
  return {
    section: legacy.section,
    periods: valued,
    beforeFactor: benefit.beforeFactor,
    pension: benefit.pension,
    automaticLumpSum: benefit.automaticLumpSum,
    factor: benefit.factor,
    ledgers: null,
    provenance: {
      accrual: ACCRUALS.finalSalary,
      denominator: rules.denominator,
      payMeasure: rules.payMeasure,
      membership: benefit.membership,
      finalPay: benefit.finalPay,
    },
  };
}

/** A career average award over one window, walked in both rulers. */
function careerAward(
  b: Built, section: SectionId, window: ServicePeriod,
  seedFor: (prices: Prices) => LedgerSeed, dates: Drawing,
): {award: Award; cash: CareerAverageRun; todays: CareerAverageRun} {
  const cash = walk(b, window, seedFor(b.cashPrices), dates, b.cashPrices);
  const todays = walk(
    b, window, seedFor(b.todaysPrices), dates, b.todaysPrices,
  );
  return {
    award: {
      section,
      periods: [window],
      beforeFactor: moneyAt(
        {nominal: cash.revalued, real: todays.revalued}, dates.drawing,
      ),
      pension: moneyAt(
        {nominal: cash.drawn, real: todays.drawn}, dates.drawing,
      ),
      automaticLumpSum: moneyAt({nominal: 0, real: 0}, dates.drawing),
      factor: cash.factor,
      ledgers: {cash: cash.ledger, todaysMoney: todays.ledger},
      provenance: {accrual: ACCRUALS.careerAverage},
    },
    cash,
    todays,
  };
}

/** The 2015 Section's balance, with its estimated run-up before a
 *  statement, as the ledgers, history and curve a `Position` carries. */
function section2015(
  b: Built, own: {cash: CareerAverageRun; todays: CareerAverageRun},
  {leaving, drawing}: Drawing,
): Pick<Position, 'ledger' | 'todaysMoneyLedger' | 'estimatedHistory'
  | 'curve'> {
  const historyIn = (r: CareerAverageRun, prices: Prices) =>
    b.member.statement === null
      ? null
      : estimateHistory({
        joinDate: on(b.ordinary2015.from),
        statedBalance: r.seed.opening,
        statementSchemeYearEnd: r.seed.atSchemeYearEnd,
        prices,
      });
  const cashHistory = historyIn(own.cash, b.cashPrices);
  const todaysHistory = historyIn(own.todays, b.todaysPrices);
  const run = (r: CareerAverageRun, history: EstimatedHistory | null) => ({
    today: b.today, dateOfBirth: b.born, exitDate: leaving,
    retirementDate: drawing, npa: normalPensionAge(b.born),
    ledger: r.ledger, history,
    curveFrom: earliest(
      b.today, leaving,
      schemeYearEndDate(history === null
        ? r.seed.atSchemeYearEnd
        : history.from - 1),
    ),
  });
  return {
    ledger: own.cash.ledger,
    todaysMoneyLedger: own.todays.ledger,
    estimatedHistory: todaysHistory,
    curve: buildCurve(
      run(own.cash, cashHistory), run(own.todays, todaysHistory),
    ),
  };
}

/** Every section's award at one set of choices, summed, with cash taken
 *  across the total. */
function position(
  b: Built, remedy: boolean, choices: RetirementChoices,
): Position {
  const dates = checked(b, remedy, choices);
  const onThe2015Basis = choices.remedy.kind === REMEDY_BASES.section2015;

  const awards: Award[] = [];
  const {legacy} = b;
  if (legacy !== null) {
    // On the legacy basis every legacy period is final salary; on the
    // 2015 basis the remedy window leaves it for a career average walk.
    const window = legacy.periods.find(
      (p) => p.kind === PERIOD_KINDS.remedyWindow,
    );
    const valued = onThe2015Basis
      ? legacy.periods.filter((p) => p.kind === PERIOD_KINDS.ordinary)
      : legacy.periods;
    awards.push(legacyAward(b, legacy, valued, dates));
    if (onThe2015Basis) {
      // `checked` refused an election for a member with no window.
      invariant(window !== undefined, 'a 2015 basis with no remedy window');
      awards.push(careerAward(
        b, legacy.section, window,
        () => seedFromJoinDate(on(window.from)), dates,
      ).award);
    }
  }
  const own = careerAward(
    b, SECTIONS.s2015, b.ordinary2015,
    (prices) => seed2015(b, dates, prices), dates,
  );
  awards.push(own.award);

  const pension = sumMoney(awards.map((a) => a.pension), dates.drawing);
  const automaticLumpSum = sumMoney(
    awards.map((a) => a.automaticLumpSum), dates.drawing,
  );
  return {
    choices,
    awards,
    crystallised: {pension, automaticLumpSum},
    cash: cashAt(
      pension, automaticLumpSum, choices.cash,
      nhsCommutationLimits(b.cashPrices),
    ),
    prices: b.cashPrices,
    ...section2015(b, own, dates),
  };
}

/**
 * Build a member's benefits. Throws `PayPathUnavailable` where there
 * is no current pay to build pay from, `BenefitNotModelled` for service
 * the library does not model, and RangeError for a declaration that
 * cannot be true.
 *
 * `today` is required because it decides which answer comes back: it
 * is the date the figures are as at, so a figure reproduces as at it.
 */
export function memberBenefits(
  member: Member,
  assumptions: Assumptions,
  today: Date,
): MemberBenefits {
  const {periods, legacy} = servicePeriods(member.service);
  const remedy = periods.some((p) => p.kind === PERIOD_KINDS.remedyWindow);
  // Deferred until the split of a pre-rollback balance is read:
  // https://github.com/casomoltd/nhs-pay/issues/20
  if (remedy && member.statement !== null
    && on(member.statement.asAt) < on(ROLLBACK)) {
    throw new BenefitNotModelled(
      NOT_MODELLED.statementBeforeRollback,
      'a statement from before rollback on 1 October 2023, which '
        + 'counts the remedy years in the 2015 Section',
    );
  }
  const ordinary2015 = periods.at(-1);
  invariant(
    ordinary2015?.section === SECTIONS.s2015,
    'the last period is the 2015 Section\'s',
  );
  const born = on(member.dateOfBirth);
  const built: Built = {
    member,
    today,
    born,
    npaOn: npaDate(born, normalPensionAge(born)),
    payPath: buildPayPath(member.dateOfBirth, member.pay),
    legacy,
    ordinary2015,
    cashPrices: createPrices(assumptions.assumedCpi, today),
    todaysPrices: createPrices(0, today),
  };
  return {
    periods,
    remedy,
    legacy: legacy === null ? null : legacyOf(legacy.section),
    payPath: built.payPath,
    now: () => holdings(built),
    at: (choices) => position(built, remedy, choices),
  };
}
