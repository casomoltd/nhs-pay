/**
 * The round status, swept across every nation the award table holds.
 *
 * The property under test is the one the model exists for: an expected
 * month passing must NOT move a round to `inPayment`. Nothing in this
 * library observes a payslip, so the only thing that closes that gap is
 * `confirmedInPay`, and a test that let the clock close it would be
 * asserting the defect.
 */

import {describe, it, expect} from 'vitest';
import type {
  Nation, PayAward, PayYear, RoundStatus,
} from '../src/index.js';
import {
  AWARD_FAMILIES,
  DENTAL_GRADES,
  MEDICAL_GRADES,
  NATION_KEYS,
  awardFamilyFor,
  isoDate,
  payRound,
} from '../src/index.js';
import {settledStatus} from '../src/pay-round.js';

const YEAR: PayYear = '2026-27';

/** 15 September 2026: inside the month Scotland's announcement named,
 *  so its money is expected but not yet due. */
const DURING_SEPTEMBER = new Date(2026, 8, 15);
/** The last day that month, which does not complete it. */
const END_OF_SEPTEMBER = new Date(2026, 8, 30);
/** The first moment September is over. */
const OCTOBER = new Date(2026, 9, 1);

describe('Scotland 2026-27, the round this model was built for', () => {
  it('is pending while the expected month is still running', () => {
    const round = payRound(
      NATION_KEYS.scotland, AWARD_FAMILIES.medical, YEAR,
      DURING_SEPTEMBER,
    );
    expect(round.status).toBe('pending');
    expect(round.award?.pct).toBe(3.5);
    expect(round.award?.effectiveFrom).toBe('2026-04-01');
    expect(round.announcement?.issued).toBe('2026-08-12');
  });

  it('carries the announcement\'s own words for the timing', () => {
    const round = payRound(
      NATION_KEYS.scotland, AWARD_FAMILIES.medical, YEAR,
      DURING_SEPTEMBER,
    );
    // Quoted on the page, so it has to be the source's phrasing and
    // not a sentence assembled from the month field.
    expect(round.award?.expectedInPayWords).toBe(
      'begin appearing in salaries at the end of September',
    );
  });

  it('is still pending on the last day of the month', () => {
    // A month completes when the next one starts, not when its last
    // day begins — an off-by-one here would retire the notice a day
    // early, on the day the money is most likely to actually land.
    expect(
      payRound(
        NATION_KEYS.scotland, AWARD_FAMILIES.medical, YEAR,
        END_OF_SEPTEMBER,
      ).status,
    ).toBe('pending');
  });

  it('expires to unconfirmed, never to inPayment', () => {
    // The single most important assertion in this file. Nothing
    // observes whether the money arrived, so the calendar must not be
    // allowed to say it did.
    expect(
      payRound(
        NATION_KEYS.scotland, AWARD_FAMILIES.medical, YEAR, OCTOBER,
      ).status,
    ).toBe('unconfirmed');
  });

  it('gives salaried dentists their own, higher figure', () => {
    // Two groups take two percentages from one announcement, and the
    // 3.75% one is the case most likely to ship wrong.
    const round = payRound(
      NATION_KEYS.scotland, AWARD_FAMILIES.salariedDental, YEAR,
      DURING_SEPTEMBER,
    );
    expect(round.status).toBe('pending');
    expect(round.award?.pct).toBe(3.75);
  });

  it('settles its training grades on their own circular and figure', () => {
    // 3.75%, where the senior grades took 3.5%, and dated the day it
    // applies from rather than promising a future month. So it is
    // never `pending`: there is no arrears window to describe.
    const round = payRound(
      NATION_KEYS.scotland, AWARD_FAMILIES.resident, YEAR,
      DURING_SEPTEMBER,
    );
    expect(round.award?.pct).toBe(3.75);
    expect(round.award?.expectedInPay).toBeUndefined();
    expect(round.status).toBe('unconfirmed');
  });
});

describe('the other nations, as at the same moment', () => {
  it('reads England as unconfirmed, its expected month long gone', () => {
    const round = payRound(
      NATION_KEYS.england, AWARD_FAMILIES.medical, YEAR,
      DURING_SEPTEMBER,
    );
    expect(round.status).toBe('unconfirmed');
    expect(round.award?.expectedInPay).toBe('2026-06');
  });

  it('never reads Wales as pending, at any date in the round', () => {
    // Wales published no expected month. `pending` is a positive claim
    // that money has not arrived, and there is no evidence for one
    // here — inventing it would put an arrears notice on a page whose
    // money landed months ago.
    const round = payRound(
      NATION_KEYS.wales, AWARD_FAMILIES.medical, YEAR,
      DURING_SEPTEMBER,
    );
    expect(round.award?.expectedInPay).toBeUndefined();
    expect(round.status).toBe('unconfirmed');
    for (const month of [3, 6, 8, 11]) {
      expect(
        payRound(
          NATION_KEYS.wales, AWARD_FAMILIES.medical, YEAR,
          new Date(2026, month, 15),
        ).status,
      ).not.toBe('pending');
    }
  });

  it('reads Northern Ireland as overdue, with nothing to cite', () => {
    const round = payRound(
      NATION_KEYS.northernIreland, AWARD_FAMILIES.medical, YEAR,
      DURING_SEPTEMBER,
    );
    expect(round.status).toBe('overdue');
    expect(round.award).toBeUndefined();
    expect(round.announcement).toBeUndefined();
    expect(round.circular).toBeUndefined();
  });
});

describe('only a person moves a round into payment', () => {
  it('reads a confirmed award as inPayment', () => {
    const award = payRound(
      NATION_KEYS.scotland, AWARD_FAMILIES.medical, YEAR,
      DURING_SEPTEMBER,
    ).award as PayAward;
    const confirmed: PayAward = {
      ...award, confirmedInPay: isoDate('2026-09-28'),
    };
    expect(settledStatus(confirmed, DURING_SEPTEMBER))
      .toBe('inPayment');
  });

  it('lets a confirmation beat an expected month still running', () => {
    // The observation outranks the expectation in both directions:
    // money seen early is in payment, whatever the publisher said.
    const award = payRound(
      NATION_KEYS.scotland, AWARD_FAMILIES.medical, YEAR,
      DURING_SEPTEMBER,
    ).award as PayAward;
    expect(
      settledStatus(
        {...award, confirmedInPay: isoDate('2026-09-02')},
        new Date(2026, 8, 3),
      ),
    ).toBe('inPayment');
  });
});

describe('the questions with no honest answer throw', () => {
  it('refuses a round the award table does not reach', () => {
    // No nation has a 2025-26 medical row, so absence says nothing
    // about any one nation — reporting every nation overdue at once
    // would be a fact about our records, not about pay.
    expect(() => payRound(
      NATION_KEYS.england, AWARD_FAMILIES.medical,
      '2025-26' as PayYear, DURING_SEPTEMBER,
    )).toThrow(/does not reach that round/);
  });
});

describe('the circular, where exactly one published the scales', () => {
  it('cites the document that printed the salaries', () => {
    const round = payRound(
      NATION_KEYS.scotland, AWARD_FAMILIES.medical, YEAR,
      DURING_SEPTEMBER,
    );
    // The scale document, NOT the announcement — different issuer,
    // different document, and confusing them is how a ministerial
    // statement ends up cited beneath a table of salaries.
    expect(round.circular?.url).not.toBe(round.announcement?.url);
    expect(round.circular?.reference).toMatch(/PCS\(DD\)2026\/02/);
  });
});

describe('every family the table holds resolves', () => {
  const NATIONS_UNDER_TEST: readonly Nation[] = [
    NATION_KEYS.england,
    NATION_KEYS.scotland,
    NATION_KEYS.wales,
    NATION_KEYS.northernIreland,
  ];
  const FAMILIES = Object.values(AWARD_FAMILIES);
  /** Every member of the union, so a status invented outside it fails
   *  here rather than passing a truthiness check. */
  const ALL_STATUSES: readonly RoundStatus[] = [
    'overdue', 'forthcoming', 'pending', 'unconfirmed', 'inPayment',
  ];

  it('answers for every nation and family without throwing', () => {
    for (const nation of NATIONS_UNDER_TEST) {
      for (const family of FAMILIES) {
        const round = payRound(nation, family, YEAR, DURING_SEPTEMBER);
        expect(
          ALL_STATUSES, `${nation}/${family}`,
        ).toContain(round.status);
        // An award-bearing round always cites what enacted it; a round
        // with no award has nothing to cite. Nothing in between.
        expect(
          round.announcement === undefined,
          `${nation}/${family} announcement`,
        ).toBe(round.award === undefined);
      }
    }
  });
});

describe('awardFamilyFor answers without a nation', () => {
  it('routes each grade to the family that awards it', () => {
    expect(awardFamilyFor(MEDICAL_GRADES.consultant))
      .toBe(AWARD_FAMILIES.medical);
    // A dentist in TRAINING takes the resident award, not the
    // salaried dental one — the split a reader-facing "dental"
    // grouping loses.
    expect(awardFamilyFor(DENTAL_GRADES.dentalCoreTraining))
      .toBe(AWARD_FAMILIES.resident);
    expect(awardFamilyFor(DENTAL_GRADES.salariedDental))
      .toBe(AWARD_FAMILIES.salariedDental);
    // A dental educator is an SAS dentist.
    expect(awardFamilyFor(DENTAL_GRADES.dentalEducator))
      .toBe(AWARD_FAMILIES.medical);
  });

  it('answers for a nation that has settled nothing', () => {
    // The reason it exists: asking through Northern Ireland's awards
    // returns nothing and names no family.
    expect(
      payRound(
        NATION_KEYS.northernIreland,
        awardFamilyFor(MEDICAL_GRADES.consultant),
        YEAR,
        DURING_SEPTEMBER,
      ).status,
    ).toBe('overdue');
  });
});

describe('a round that has not begun', () => {
  it('refuses to call a nation late before its round starts', () => {
    // The other invariant has a test and this one did not. Cheap to
    // reach, and the answer matters: a nation with nothing recorded in
    // January is not overdue, because nothing was due yet.
    expect(() => payRound(
      NATION_KEYS.northernIreland, AWARD_FAMILIES.medical, YEAR,
      new Date(2026, 0, 1),
    )).toThrow(/has not begun/);
  });
});
