/**
 * A member's benefits across sections, held to an invented member
 * worked by hand.
 *
 * `fixtures/invented-member.json` comes from an independent
 * implementation that does not import this library: its own pay path,
 * ledger and factors, read from the text of the NHSBSA extract. The
 * member holds the 1995 Section and the 2015 Section with a remedy
 * window, and draws on four dates — two on a 31 March and two mid-year,
 * one before the 1995 Section's pension age and one after it — under
 * both elections. The member is invented: no figure belongs to anybody.
 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {describe, expect, it} from 'vitest';
import {NOT_MODELLED} from '../src/errors.js';
import {publishedLadder} from './helpers.js';
import type {OracleLadder} from './helpers.js';
import {isoDate} from '../src/iso-date.js';
import {
  memberBenefits, PAST_YEARS, SECTIONS,
} from '../src/member-benefits.js';
import {revaluationFor} from '../src/revaluation.js';
import type {
  Member,
  Position,
  RemedyElection,
  SectionId,
} from '../src/member-benefits.js';

interface Invented {
  member: {
    dateOfBirth: string;
    currentPay: number;
    currentAsAt: string;
    ladder: OracleLadder;
    service: {section: SectionId; joined: string; left: string | null}[];
  };
  payPath: {schemeYearEnd: number; pay: number}[];
  positions: {
    drawn: string;
    election: 'legacy-basis' | 'section-2015-basis';
    service1995: number;
    finalPay: number;
    factors: {'1995Pension': number; '2015': number};
    awards: {
      section: string; basis: string; pension: number; lump: number;
    }[];
    pension: number;
    automaticLumpSum: number;
    maximumCash: number;
    residualAtMaximum: number;
  }[];
}

const invented = JSON.parse(fs.readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'fixtures', 'invented-member.json',
  ),
  'utf-8',
)) as Invented;

const TODAY = new Date(2026, 8, 23);

const member: Member = {
  dateOfBirth: isoDate(invented.member.dateOfBirth),
  // Read from the fixture, not retyped: two copies of one service
  // history is how the test and the oracle come to price different
  // members.
  service: invented.member.service.map((p) => ({
    section: p.section,
    joined: isoDate(p.joined),
    left: p.left === null ? null : isoDate(p.left),
  })),
  pay: {
    declared: [],
    current: {
      todaysMoney: invented.member.currentPay,
      asAt: isoDate(invented.member.currentAsAt),
    },
    ladder: publishedLadder(invented.member.ladder, '2026-27', 'england'),
  },
  statement: null,
};

const benefits = memberBenefits(member, {assumedCpi: 0.02, pastYears: 'assumed'}, TODAY);

/** Pennies: the hand working carries Decimal throughout and this
 *  library carries floats. */
const PENNY = 2;

describe('the invented member, worked by hand', () => {
  it('holds the remedy window in the 1995 Section', () => {
    expect(benefits.periods).toEqual([
      {section: 'section-1995', from: '2004-04-01',
        to: '2015-03-31', kind: 'ordinary'},
      {section: 'section-1995', from: '2015-04-01',
        to: '2022-03-31', kind: 'remedy-window'},
      {section: 'section-2015', from: '2022-04-01',
        to: null, kind: 'ordinary'},
    ]);
  });

  it.each(invented.positions.map((p) => [p.drawn, p.election, p] as const))(
    'drawn %s, %s', (drawn, election, expected) => {
      const position = benefits.at({
        leaving: isoDate(drawn),
        drawing: isoDate(drawn),
        remedy: {kind: election},
        cash: {kind: 'maximum'},
      });
      expect(position.awards.map((a) => a.pension.real))
        .toHaveLength(expected.awards.length);
      position.awards.forEach((award, i) => {
        expect(award.section).toBe(expected.awards[i].section);
        expect(award.provenance.accrual).toBe(expected.awards[i].basis);
        expect(award.pension.real, `award ${i} pension`)
          .toBeCloseTo(expected.awards[i].pension, PENNY);
        expect(award.automaticLumpSum.real, `award ${i} lump sum`)
          .toBeCloseTo(expected.awards[i].lump, PENNY);
        expect(award.pension.real, `award ${i} factor`)
          .toBeCloseTo(award.beforeFactor.real * award.factor.factor, 9);
      });
      const [legacy] = position.awards;
      expect(legacy.provenance).toMatchObject({
        accrual: 'final-salary',
        membership: expected.service1995,
      });
      expect(position.crystallised.pension.real)
        .toBeCloseTo(expected.pension, PENNY);
      expect(position.crystallised.automaticLumpSum.real)
        .toBeCloseTo(expected.automaticLumpSum, PENNY);
      expect(position.cash.lumpSum.real)
        .toBeCloseTo(expected.maximumCash, PENNY);
      expect(position.cash.residualPension.real)
        .toBeCloseTo(expected.residualAtMaximum, PENNY);
      expect(legacy.factor.factor, '1995 factor')
        .toBe(expected.factors['1995Pension']);
      expect(position.awards.at(-1)?.factor.factor, '2015 factor')
        .toBe(expected.factors['2015']);
      if (legacy.provenance.accrual !== 'final-salary') {
        throw new Error('the legacy award is not final salary');
      }
      expect(legacy.provenance.finalPay, 'final pay')
        .toBeCloseTo(expected.finalPay, PENNY);
    },
  );
});

describe('the legacy section', () => {
  it('is reported with the rules a caller has to state', () => {
    // The 1995 Section's statute, SI 1995/300: pension age 60, 1/80 of
    // final pay, three times the pension as an automatic lump sum. No late
    // uplift is this library's reading, which section-factors.test.ts
    // holds to the factor itself.
    expect(benefits.legacy).toEqual({
      section: SECTIONS.s1995, pensionAge: 60, denominator: 80,
      automaticLumpSum: 3, lateUplift: false,
    });
  });
});

describe('the two rulers', () => {
  const drawn = (cpi: number): Position => memberBenefits(
    member, {assumedCpi: cpi, pastYears: 'assumed'}, TODAY,
  ).at({
    leaving: isoDate('2037-03-31'),
    drawing: isoDate('2037-03-31'),
    remedy: {kind: 'legacy-basis'},
    cash: {kind: 'maximum'},
  });
  const money = (p: Position) => [
    ...p.awards.flatMap((a) => [a.pension, a.automaticLumpSum]),
    p.crystallised.pension, p.crystallised.automaticLumpSum,
    p.cash.lumpSum, p.cash.residualPension,
  ];

  it('agree when there is no inflation', () => {
    for (const m of money(drawn(0))) {
      expect(m.nominal).toBeCloseTo(m.real, 9);
    }
  });

  it('differ by one price level wherever nothing revalues', () => {
    // A final-salary award and its lump sum are the same real amount
    // carried to the drawing by the same inflation, so they share one
    // ratio, above one at positive CPI. So do the cash taken and the
    // pension left. A figure converted on another date, or left in the
    // wrong ruler, breaks the pair.
    const p = drawn(0.02);
    const [legacy] = p.awards;
    const ratio = (m: {nominal: number; real: number}) => m.nominal / m.real;
    // 2% a year over the ten scheme years from 2026-27, the year the
    // run is priced in, to 2036-37, the one this drawing closes.
    expect(ratio(legacy.pension)).toBeCloseTo(1.02 ** 10, 9);
    expect(ratio(legacy.automaticLumpSum))
      .toBeCloseTo(ratio(legacy.pension), 9);
    expect(ratio(p.cash.residualPension))
      .toBeCloseTo(ratio(p.cash.lumpSum), 9);
  });

  it('carry a 2015 pot below the price level', () => {
    // Today's money is the projection run at zero CPI, so revaluation
    // is 1.5% there and CPI + 1.5 in cash, and (1.035 / 1.015) is
    // below 1.02 (src/pension/prices.ts). A 2015 award's ratio equal
    // to the price level would mean it was deflated instead.
    const p = drawn(0.02);
    const [legacy] = p.awards;
    const own = p.awards.at(-1);
    if (own === undefined) throw new Error('no 2015 Section award');
    expect(own.pension.nominal / own.pension.real)
      .toBeLessThan(legacy.pension.nominal / legacy.pension.real);
  });
});

describe('the election', () => {
  const at = (remedy: RemedyElection) => benefits.at({
    leaving: isoDate('2039-09-30'),
    drawing: isoDate('2039-09-30'),
    remedy,
    cash: {kind: 'automatic-only'},
  });

  it('moves the value of the window and nothing after it', () => {
    // The 2015 Section's own award is the same under either election:
    // revaluation is linear in each year's accrual, so only the
    // window's own term changes.
    const legacy = at({kind: 'legacy-basis'});
    const reformed = at({kind: 'section-2015-basis'});
    const own = (p: typeof legacy) => {
      const award = p.awards.at(-1);
      if (award === undefined) throw new Error('no 2015 Section award');
      return award.pension.real;
    };
    expect(own(legacy)).toBeCloseTo(own(reformed), 9);
  });

  it('names the 2015 Section award\'s own walk as the position\'s ledger',
    () => {
      const p = at({kind: 'legacy-basis'});
      const own = p.awards.at(-1);
      expect(own?.ledgers?.cash).toBe(p.ledger);
      expect(own?.ledgers?.todaysMoney).toBe(p.todaysMoneyLedger);
    });

  it('walks the window on its own ledger, earning only inside it', () => {
    const reformed = at({kind: 'section-2015-basis'});
    const window = reformed.awards.find((a) =>
      a.periods[0].kind === 'remedy-window');
    if (window?.ledgers === null || window === undefined) {
      throw new Error('the window is a career average award');
    }
    const earning = window.ledgers.todaysMoney.years
      .filter((y) => y.earned > 0).map((y) => y.schemeYearEnd);
    expect(earning[0]).toBe(2016);
    expect(earning.at(-1)).toBe(2022);
    expect(reformed.awards[0].ledgers).toBeNull();
  });

  it('reads the published Orders on the cash ruler when asked', () => {
    const published = memberBenefits(
      member, {assumedCpi: 0.02, pastYears: PAST_YEARS.published}, TODAY,
    ).at({
      leaving: isoDate('2039-09-30'),
      drawing: isoDate('2039-09-30'),
      remedy: {kind: 'section-2015-basis'},
      cash: {kind: 'automatic-only'},
    });
    const window = published.awards.find((a) =>
      a.periods[0].kind === 'remedy-window');
    if (window?.ledgers === null || window === undefined) {
      throw new Error('the window is a career average award');
    }
    const {cash, todaysMoney} = window.ledgers;
    // Every uplift from 2016-17 to 2026-27 is an Order: eleven rows,
    // each labelled by the year before the one it opens.
    const ordered = cash.years.filter((y) => y.uplift !== null
      && y.schemeYearEnd <= 2027);
    expect(ordered).toHaveLength(11);
    for (const year of ordered) {
      expect(year.uplift?.from.si)
        .toBe(revaluationFor(year.schemeYearEnd - 1)?.si);
    }
    // The redacted Annual Benefit Statement to 31/03/2025 (see
    // docs/source-archive.md) prints its Revaluation column as 4.6,
    // 11.6, 8.2 and 3.2 for the years opened in April 2022 to 2025.
    const percents = [2023, 2024, 2025, 2026].map((end) =>
      cash.years.find((y) => y.schemeYearEnd === end)?.uplift?.percent);
    expect(percents).toEqual([4.6, 11.6, 8.2, 3.2].map((p) =>
      expect.closeTo(p, 9)));
    // 2015-16 pay is carried back by the September CPI of each Order
    // landed since, SI 2016/438 to SI 2026/254, retyped here from the
    // Orders rather than read from the table under test.
    const cpis = [-0.1, 1.0, 3.0, 2.4, 1.7, 0.5, 3.1, 10.1, 6.7, 1.7, 3.8];
    const prices = cpis.reduce((f, c) => f * (1 + c / 100), 1);
    const first = (l: typeof cash) =>
      l.years.find((y) => y.schemeYearEnd === 2016)?.pensionableEarnings;
    expect(first(cash))
      .toBeCloseTo((first(todaysMoney) ?? Number.NaN) / prices, 6);
  });

  it('is required of a remedy member, and refused of anyone else',
    () => {
      expect(benefits.remedy).toBe(true);
      expect(() => at({kind: 'none'})).toThrow(RangeError);
      const later = memberBenefits({
        ...member,
        service: [{
          section: SECTIONS.s2015,
          joined: isoDate('2016-04-01'),
          left: null,
        }],
      }, {assumedCpi: 0.02, pastYears: 'assumed'}, TODAY);
      expect(() => later.at({
        leaving: isoDate('2039-09-30'),
        drawing: isoDate('2039-09-30'),
        remedy: {kind: 'legacy-basis'},
        cash: {kind: 'automatic-only'},
      })).toThrow(RangeError);
      expect(later.remedy).toBe(false);
    });
});

describe('what the library refuses rather than prices', () => {
  it('a break in pensionable service', () => {
    expect(() => memberBenefits({
      ...member,
      service: [
        {section: SECTIONS.s1995, joined: isoDate('2004-04-01'),
          left: isoDate('2010-03-31')},
        {section: SECTIONS.s2015, joined: isoDate('2016-04-01'),
          left: null},
      ],
    }, {assumedCpi: 0.02, pastYears: 'assumed'}, TODAY)).toThrow(
      expect.objectContaining({code: NOT_MODELLED.breakInService}),
    );
  });

  it('a statement from before rollback, for a remedy member', () => {
    expect(() => memberBenefits({
      ...member,
      statement: {accruedPension: 5000, asAt: isoDate('2023-03-31')},
    }, {assumedCpi: 0.02, pastYears: 'assumed'}, TODAY)).toThrow(
      expect.objectContaining({code: NOT_MODELLED.statementBeforeRollback}),
    );
  });
});

describe('now', () => {
  it('holds the remedy window on the legacy basis, unreduced', () => {
    const {bySection, total} = benefits.now();
    expect(bySection.map((b) => b.section))
      .toEqual(['section-1995', 'section-2015']);
    // Eighteen years at 1/80 of the best of the last three years' pay,
    // read from the oracle's own pay path rather than the library's.
    const oraclePay = (y: number) => {
      const row = invented.payPath.find((r) => r.schemeYearEnd === y);
      if (row === undefined) throw new Error(`no oracle pay for ${y}`);
      return row.pay;
    };
    const best = Math.max(...[2027, 2026, 2025].map(oraclePay));
    expect(bySection[0].pension.real).toBeCloseTo(18 / 80 * best, 6);
    // Three times the pension: SI 1995/300's automatic lump sum.
    expect(bySection[0].automaticLumpSum.real)
      .toBeCloseTo(3 * bySection[0].pension.real, 9);
    expect(bySection[1].automaticLumpSum.real).toBe(0);
    expect(total.real).toBeCloseTo(
      bySection[0].pension.real + bySection[1].pension.real, 9,
    );
  });
});
