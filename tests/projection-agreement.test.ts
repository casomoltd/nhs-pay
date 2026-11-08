/**
 * The two public routes to a 2015 Section pension, held to each other.
 *
 * `projectPension` reads its pension after the factor off the ledger's
 * closing balance; `memberBenefits` builds it with `factored`, from the
 * revalued balance and the factor. The same member, on flat pay at an
 * assumed CPI of nought, must get the same pension both ways, before the
 * factor and after it.
 *
 * The member is the redacted Annual Benefit Statement's, as in
 * `golden-abs.test.ts`. Each fact about them is written once below and
 * both inputs are built from it. Flat pay is declared for every year
 * ahead so the pay path matches `projectPension`'s, and the drawing is
 * early so a factor below one stands between the two figures.
 */
import {describe, expect, it} from 'vitest';
import {projectPension} from '../src/pension-projection.js';
import {memberBenefits, PAST_YEARS, SECTIONS} from '../src/member/index.js';
import {CASH_CHOICES} from '../src/commutation.js';
import {REMEDY_BASES} from '../src/member/types.js';
import {isoDate, isoToDate} from '../src/iso-date.js';
import {
  schemeYearAfter, schemeYearEnd, schemeYearEndDate, schemeYearEndFor,
} from '../src/pension/scheme-year.js';
import type {SchemeYearEnd} from '../src/pension/scheme-year.js';

/** Read off the statement. */
const STATED_PENSION = 3417.21;
const STATEMENT_YEAR = schemeYearEnd(2025);
const PENSIONABLE_PAY = 50_901.19;
const BORN = isoDate('1983-01-01');
const JOINED = isoDate('2021-04-01');
/** The member's Normal Pension Age, from their date of birth. */
const NPA = 68;
/** Early against that age. */
const DRAWN = isoDate('2045-01-01');
const TODAY = isoDate('2026-08-19');

/** The scheme year `pay.current` covers, so it is not also declared. */
const CURRENT_YEAR = schemeYearEndFor(isoToDate(TODAY));

/** Every scheme year from the statement's next to the drawing's. */
function yearsAhead(): SchemeYearEnd[] {
  const last = schemeYearEndFor(isoToDate(DRAWN));
  const years: SchemeYearEnd[] = [];
  for (let y = schemeYearAfter(STATEMENT_YEAR); y <= last;
    y = schemeYearAfter(y)) {
    years.push(y);
  }
  return years;
}

const projected = projectPension({
  kind: 'statement',
  accruedPension: STATED_PENSION,
  statementDate: schemeYearEndDate(STATEMENT_YEAR),
  currentSalary: PENSIONABLE_PAY,
  dateOfBirth: isoToDate(BORN),
  exitDate: isoToDate(DRAWN),
  retirementDate: isoToDate(DRAWN),
  npa: NPA,
  joinDate: isoToDate(JOINED),
  assumedCpi: 0,
}, isoToDate(TODAY));

const benefits = memberBenefits({
  dateOfBirth: BORN,
  service: [{section: SECTIONS.s2015, joined: JOINED, left: null}],
  pay: {
    declared: yearsAhead()
      .filter((y) => y !== CURRENT_YEAR)
      .map((y) => ({schemeYearEnd: y, todaysMoney: PENSIONABLE_PAY})),
    current: {todaysMoney: PENSIONABLE_PAY, asAt: TODAY},
    ladder: null,
    partTime: false,
  },
  statement: {accruedPension: STATED_PENSION, yearEnd: STATEMENT_YEAR},
}, {assumedCpi: 0, pastYears: PAST_YEARS.assumed}, isoToDate(TODAY));

const award = benefits.at({
  leaving: DRAWN,
  drawing: DRAWN,
  remedy: {kind: REMEDY_BASES.none},
  cash: {kind: CASH_CHOICES.automaticOnly},
}).awards.find((a) => a.section === SECTIONS.s2015);
if (!award) throw new Error('no 2015 Section award');
const {pension} = award;

describe('projectPension and memberBenefits agree', () => {
  it('draws early, so a factor stands between the figures', () => {
    expect(projected.factor).toBeLessThan(1);
    expect(pension.factor.factor).toBe(projected.factor);
  });

  it('on the pension before the factor', () => {
    expect(pension.beforeFactor.real)
      .toBeCloseTo(projected.revaluedAtRetirement.real, 6);
    expect(pension.beforeFactor.nominal)
      .toBeCloseTo(projected.revaluedAtRetirement.nominal, 6);
  });

  it('on the pension after it', () => {
    expect(pension.after.real)
      .toBeCloseTo(projected.annualPension.real, 6);
    expect(pension.after.nominal)
      .toBeCloseTo(projected.annualPension.nominal, 6);
  });
});
