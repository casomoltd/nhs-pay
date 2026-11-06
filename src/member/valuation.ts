/**
 * Each section's award for a member, valued at one set of dates: the
 * legacy section on final salary, the 2015 Section and a remedy window
 * on its basis as career average walks, and today's holdings. The
 * owner in `benefits.ts` decides which awards a drawing has and
 * sums them.
 */
import type {Award, Holdings, Member, Position, ServicePeriod} from './types.js';
import {ACCRUALS, SECTIONS} from './types.js';
import type {LegacySectionId, SectionId} from './types.js';
import {legacyPeriodsOf, until} from './service.js';
import {isoToDate} from '../iso-date.js';
import type {LegacyHolding} from './service.js';
import {normalPensionAge} from '../pension/ages.js';
import type {JoiningHistory} from '../pension/ages.js';
import type {PayPath} from '../pay-path.js';
import {earliest} from '../dates.js';
import {buildCurve, walkThrough} from '../pension/curve.js';
import {seedFromBalanceAt} from '../pension/uplift.js';
import {estimateHistory} from '../pension/history.js';
import type {EstimatedHistory} from '../pension/history.js';
import {moneyAt, sumMoney} from '../pension/money.js';
import type {Prices} from '../pension/prices.js';
import {
  schemeYearEndDate,
  schemeYearEndFor,
  seedFromJoinDate,
} from '../pension/seed.js';
import type {LedgerSeed} from '../pension/seed.js';
import {
  finalSalaryBenefit,
  unreducedPension,
} from '../sections/final-salary.js';
import type {FinalSalaryRules} from '../sections/final-salary.js';
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
 *  seed its walk starts from in each price series. */
interface CareerWindow {
  readonly section: SectionId;
  readonly window: ServicePeriod;
  readonly seedFor: (prices: Prices) => LedgerSeed;
}

/** One walk: a window, its seed, and the price series it walks in. */
interface Walk {
  readonly window: ServicePeriod;
  readonly seed: LedgerSeed;
  readonly prices: Prices;
}

/** Each legacy section's statute. */
export const RULES: Record<LegacySectionId, FinalSalaryRules> = {
  [SECTIONS.s1995]: RULES_1995,
  [SECTIONS.s2008]: RULES_2008,
};

/** The 2015 Section's own seed: its statement, or its first day. */
export function seed2015(
  b: Built, {leaving, drawing}: Drawing, prices: Prices,
): LedgerSeed {
  const {statement} = b.member;
  return statement === null
    ? seedFromJoinDate(isoToDate(b.ordinary2015.from))
    : seedFromBalanceAt(
        statement.accruedPension, isoToDate(statement.asAt),
        leaving, drawing, prices,
      );
}

/** What the member holds today, with the remedy window on the legacy
 *  basis: unreduced, since nothing is drawn. */
export function holdings(b: Built): Holdings {
  const {today} = b;
  const bySection: Holdings['bySection'][number][] = [];
  const flat = (x: number) => moneyAt({nominal: x, real: x}, today);
  if (b.legacy !== null) {
    const {pension, automaticLumpSum} = unreducedPension(
      RULES[b.legacy.section], membershipOf(legacyPeriodsOf(b.legacy), today),
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
    : isoToDate(b.ordinary2015.to);
  const dates = {leaving, drawing: leaving < b.npaOn ? b.npaOn : leaving};
  const accrued = walk(b, {
    window: b.ordinary2015,
    seed: seed2015(b, dates, b.todaysPrices),
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
    automaticLumpSumBeforeFactor: benefit.automaticLumpSumBeforeFactor,
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
export function careerAward(
  b: Built, {section, window, seedFor}: CareerWindow, dates: Drawing,
): CareerAward {
  const walkIn = (prices: Prices) =>
    walk(b, {window, seed: seedFor(prices), prices}, dates);
  const cash = walkIn(b.cashPrices);
  const todays = walkIn(b.todaysPrices);
  // A career average award pays no automatic lump sum, before or after a
  // factor.
  const noLumpSum = moneyAt({nominal: 0, real: 0}, dates.drawing);
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
      automaticLumpSum: noLumpSum,
      automaticLumpSumBeforeFactor: noLumpSum,
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

/** A career average walk over `window`, accruing only inside it. */
function walk(
  b: Built, {window, seed, prices}: Walk, {leaving, drawing}: Drawing,
): CareerAverageRun {
  const first = schemeYearEndFor(isoToDate(window.from));
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

/** The legacy windows as final-salary membership, to `leaving`. */
function membershipOf(valued: readonly ServicePeriod[], leaving: Date) {
  return valued
    .filter((p) => isoToDate(p.from) <= leaving)
    .map((p) => ({from: isoToDate(p.from), to: until(p, leaving)}));
}
