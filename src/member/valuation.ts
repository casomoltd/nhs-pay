/**
 * Each section's award for a member, valued at one set of dates: the
 * legacy section on final salary, the 2015 Section and a remedy window
 * on its basis as career average walks. Beside them, what the member
 * holds before any drawing: today's holdings, and the final-salary value
 * and undrawn walk a tax year's pension input reads on a date. `Built`
 * is everything about the member, derived once, that all of it reads.
 * The owner in `benefits.ts` decides which awards a drawing has and sums
 * them.
 */
import type {
  Award, Holdings, Member, MemberBenefits, Position, ServicePeriod,
} from './types.js';
import {ACCRUALS, REMEDY_BASES, SECTIONS} from './types.js';
import type {
  Accrual, LegacySectionId, RemedyBasis, SectionId,
} from './types.js';
import {legacyPeriodsOf, until} from './service.js';
import {isoToDate} from '../iso-date.js';
import type {LegacyHolding} from './service.js';
import {normalPensionAge} from '../pension/ages.js';
import type {JoiningHistory} from '../pension/ages.js';
import type {PayPath} from '../pay-path.js';
import {earliest} from '../dates.js';
import {buildCurve, walkThrough} from '../pension/curve.js';
import {buildLedger} from '../pension/ledger.js';
import type {MemberLedger, PayIn} from '../pension/ledger.js';
import {estimateHistory} from '../pension/history.js';
import type {EstimatedHistory} from '../pension/history.js';
import {moneyAt, sumMoney} from '../pension/money.js';
import type {Prices} from '../pension/prices.js';
import {
  schemeYearBefore,
  schemeYearEndDate,
  schemeYearEndFor,
  seedFromJoinDate,
  seedFromStatement,
} from '../pension/seed.js';
import type {LedgerSeed, SchemeYearEnd} from '../pension/seed.js';
import {
  finalSalaryBenefit,
  unreducedPension,
} from '../sections/final-salary.js';
import type {
  FinalSalaryRules, Membership, UnreducedPension,
} from '../sections/final-salary.js';
import {RULES_1995} from '../sections/section-1995.js';
import {RULES_2008} from '../sections/section-2008.js';
import {careerAverage} from '../sections/section-2015.js';

/** Everything about the member, derived once, that every question
 *  asked of them reads. */
export interface Built {
  readonly member: Member;
  /** The dates the member's minimum pension age turns on. */
  readonly history: JoiningHistory;
  readonly today: Date;
  readonly born: Date;
  readonly npaOn: Date;
  readonly payPath: PayPath;
  readonly legacy: LegacyHolding | null;
  /** Whether the member has a remedy window, and so must elect a basis
   *  for it, as every refusal of an election reads it. */
  readonly remedy: boolean;
  readonly ordinary2015: ServicePeriod;
  readonly cashPrices: Prices;
  readonly todaysPrices: Prices;
}

/** The dates one set of choices is valued at. */
export interface Drawing {
  readonly leaving: Date;
  readonly drawing: Date;
}

/** A career average run: one window walked in one price series. */
type CareerAverageRun = ReturnType<typeof careerAverage>;

/** A career average award and the two runs it was read from. */
interface CareerAward {
  readonly award: Award;
  readonly cash: CareerAverageRun;
  readonly todays: CareerAverageRun;
}

/** What a career average award values: a window of one section, and the
 *  seed its walk starts from, the same in both price series. */
interface CareerWindow {
  readonly section: SectionId;
  readonly window: ServicePeriod;
  readonly seed: LedgerSeed;
}

/** One walk: a window, its seed, and the price series it walks in. */
interface Walk {
  readonly window: ServicePeriod;
  readonly seed: LedgerSeed;
  readonly prices: Prices;
}

/** The legacy periods valued on final salary, which the election decides,
 *  and the section whose rules value them. */
interface FinalSalaryValued {
  readonly section: LegacySectionId;
  readonly valued: readonly ServicePeriod[];
}

/** A final-salary pension and automatic lump sum, unreduced, in today's
 *  money. */
type FinalSalaryHeld = Pick<UnreducedPension, 'pension' | 'automaticLumpSum'>;

/** Each legacy section's statute. */
export const RULES: Record<LegacySectionId, FinalSalaryRules> = {
  [SECTIONS.s1995]: RULES_1995,
  [SECTIONS.s2008]: RULES_2008,
};

/** How each election values the remedy window: on final salary, as more
 *  legacy service, or as a career average walk paid from the legacy
 *  section. No election means no window, so nothing walks. Total over
 *  `RemedyBasis`, so a new basis fails the build until it says which. */
const WINDOW_ACCRUAL: Record<RemedyBasis, Accrual> = {
  [REMEDY_BASES.none]: ACCRUALS.finalSalary,
  [REMEDY_BASES.legacy]: ACCRUALS.finalSalary,
  [REMEDY_BASES.section2015]: ACCRUALS.careerAverage,
};

/** Whether an election walks the remedy window as career average. */
export function walksWindow(basis: RemedyBasis): boolean {
  return WINDOW_ACCRUAL[basis] === ACCRUALS.careerAverage;
}

/** The legacy periods final salary values under an election: every one on
 *  the legacy basis; on the 2015 basis the section's own service alone,
 *  the remedy window leaving it for a career average walk. */
export function finalSalaryValued(
  legacy: LegacyHolding, basis: RemedyBasis,
): FinalSalaryValued {
  return {
    section: legacy.section,
    valued: walksWindow(basis) ? [legacy.own] : legacyPeriodsOf(legacy),
  };
}

/** A remedy window's seed on the 2015 basis: it walks from its first day,
 *  since no statement counts the remedy years in the 2015 Section. */
export function windowSeed(window: ServicePeriod): LedgerSeed {
  return seedFromJoinDate(isoToDate(window.from));
}

/** The 2015 Section's own seed: its statement, at the 31 March closing
 *  the year it runs to, or its first day. */
export function seed2015(b: Built): LedgerSeed {
  const {statement} = b.member;
  return statement === null
    ? seedFromJoinDate(isoToDate(b.ordinary2015.from))
    : seedFromStatement(statement.accruedPension, statement.yearEnd);
}

/** What the member holds today, with the remedy window on the legacy
 *  basis: unreduced, since nothing is drawn. A member who has left holds
 *  their deferred benefits, final pay measured at leaving. */
export function holdings(b: Built): Holdings {
  const {today} = b;
  const left = declaredLeaving(b);
  const bySection: Holdings['bySection'][number][] = [];
  const flat = (x: number) => moneyAt({nominal: x, real: x}, today);
  if (b.legacy !== null) {
    const {pension, automaticLumpSum} = finalSalaryHeldOn(
      b, finalSalaryValued(b.legacy, REMEDY_BASES.legacy), today, left,
    );
    bySection.push({
      section: b.legacy.section,
      pension: flat(pension),
      automaticLumpSum: flat(automaticLumpSum),
    });
  }
  // Any leaving and drawing after today give the same balance today;
  // these are only where the walk has to stop.
  const dates = walkDates(b, left ?? b.npaOn);
  const accrued = walk(b, {
    window: b.ordinary2015,
    seed: seed2015(b),
    prices: b.todaysPrices,
  }, dates).ledger.accruedAt(today);
  bySection.push({
    section: SECTIONS.s2015,
    pension: flat(accrued),
    automaticLumpSum: flat(0),
  });
  return {
    bySection, total: sumMoney(bySection.map((x) => x.pension), today),
  };
}

/** The legacy section's final-salary award over the periods valued on
 *  final salary, which the election decides. */
export function legacyAward(
  b: Built, {section, valued}: FinalSalaryValued, dates: Drawing,
): Award {
  const rules = RULES[section];
  const benefit = finalSalaryBenefit(rules, {
    windows: membershipOf(valued, dates.leaving),
    payPath: b.payPath, dateOfBirth: b.born, ...dates,
    prices: b.cashPrices,
  });
  return {
    section,
    periods: valued,
    pensionBeforeFactor: benefit.pensionBeforeFactor,
    pension: benefit.pension,
    automaticLumpSum: benefit.automaticLumpSum,
    automaticLumpSumBeforeFactor: benefit.automaticLumpSumBeforeFactor,
    pensionFactor: benefit.pensionFactor,
    automaticLumpSumFactor: benefit.automaticLumpSumFactor,
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
export function careerAward(
  b: Built, {section, window, seed}: CareerWindow, dates: Drawing,
): CareerAward {
  const walkIn = (prices: Prices) =>
    walk(b, {window, seed, prices}, dates);
  const cash = walkIn(b.cashPrices);
  const todays = walkIn(b.todaysPrices);
  // A career average award pays no automatic lump sum, before or after a
  // factor.
  const noLumpSum = moneyAt({nominal: 0, real: 0}, dates.drawing);
  return {
    award: {
      section,
      periods: [window],
      pensionBeforeFactor: moneyAt(
        {nominal: cash.revalued, real: todays.revalued}, dates.drawing,
      ),
      pension: moneyAt(
        {nominal: cash.drawn, real: todays.drawn}, dates.drawing,
      ),
      automaticLumpSum: noLumpSum,
      automaticLumpSumBeforeFactor: noLumpSum,
      pensionFactor: cash.factor,
      automaticLumpSumFactor: null,
      ledgers: {cash: cash.ledger, todaysMoney: todays.ledger},
      provenance: {accrual: ACCRUALS.careerAverage},
    },
    cash,
    todays,
  };
}

/** The 2015 Section's balance, with its estimated run-up before a
 *  statement, as the ledgers, history and curve a `Position` carries. */
export function section2015(
  b: Built, own: CareerAward,
  {leaving, drawing}: Drawing,
): Pick<Position, 'ledger' | 'todaysMoneyLedger' | 'estimatedHistory'
  | 'curve'> {
  const historyIn = (r: CareerAverageRun, prices: Prices) =>
    b.member.statement === null
      ? null
      : estimateHistory({
        joinDate: isoToDate(b.ordinary2015.from),
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
        : schemeYearBefore(history.from)),
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

/**
 * The same walk as the ledger alone, with no drawing on it, through the
 * scheme year ending in `through`: what the window holds on any date to
 * then, before any early or late factor. A valuation that never draws has
 * no factor to read, and a factor read for a drawing far past the pension
 * age is one GAD's tables may not price.
 */
export function accruedLedger(
  b: Built, {window, seed, prices}: Walk, {leaving, drawing}: Drawing,
  through: SchemeYearEnd,
): MemberLedger {
  return buildLedger({
    seed,
    payIn: payInside(b, window, leaving),
    exitDate: leaving,
    retirementDate: drawing,
    prices,
    through,
    drawingFor: () => null,
  });
}

/** Refuse a leaving after the one the member declared, naming `asked`,
 *  the call a caller was answering: service that has ended cannot run on. */
export function refuseLeavingAfterDeclared(
  asked: keyof MemberBenefits, b: Built, leaving: Date,
): void {
  const left = declaredLeaving(b);
  if (left !== null && left < leaving) {
    throw new RangeError(
      `${asked}: leaving after the member already left, on `
        + `${b.ordinary2015.to}`,
    );
  }
}

/**
 * The legacy section's final-salary pension and automatic lump sum held on
 * `on`, unreduced, in today's money: membership to that day, on final pay
 * measured back from it, as a leaving on it is measured. Where the member
 * `left` before `on`, both are measured at leaving. `left` is the caller's:
 * today's holdings read the declared leaving, and a tax year's input the
 * leaving it was asked about.
 */
export function finalSalaryHeldOn(
  b: Built, {section, valued}: FinalSalaryValued, on: Date, left: Date | null,
): FinalSalaryHeld {
  const asAt = left === null ? on : earliest(left, on);
  const {pension, automaticLumpSum} = unreducedPension(
    RULES[section], membershipOf(valued, asAt), b.payPath, asAt,
  );
  return {pension, automaticLumpSum};
}

/** The dates a walk that never draws runs to: leaving, and a drawing at
 *  the pension age or at leaving where that is later. It reads no factor,
 *  so the drawing decides only which years after leaving are deferred. */
export function walkDates(b: Built, leaving: Date): Drawing {
  return {leaving, drawing: leaving < b.npaOn ? b.npaOn : leaving};
}

/** The member's last day of service, as they declared it; null while they
 *  serve. The 2015 Section is the one every member serves in last. */
function declaredLeaving(b: Built): Date | null {
  return b.ordinary2015.to === null ? null : isoToDate(b.ordinary2015.to);
}

/** A career average walk over `window`, accruing only inside it. */
function walk(
  b: Built, {window, seed, prices}: Walk, {leaving, drawing}: Drawing,
): CareerAverageRun {
  return careerAverage({
    seed,
    payIn: payInside(b, window, leaving),
    dateOfBirth: b.born,
    leaving,
    drawing,
    prices,
    through: walkThrough(drawing, b.npaOn),
  });
}

/** Pay for the scheme years `window` accrues in, to `leaving`; none
 *  outside it. */
function payInside(b: Built, window: ServicePeriod, leaving: Date): PayIn {
  const first = schemeYearEndFor(isoToDate(window.from));
  const last = schemeYearEndFor(until(window, leaving));
  return (year) => (year >= first && year <= last
    ? b.payPath.payFor(year)
    : null);
}

/** The legacy windows as final-salary membership, to `leaving`. */
function membershipOf(
  valued: readonly ServicePeriod[], leaving: Date,
): Membership[] {
  return valued
    .filter((p) => isoToDate(p.from) <= leaving)
    .map((p) => ({from: isoToDate(p.from), to: until(p, leaving)}));
}
