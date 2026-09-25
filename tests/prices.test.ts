/**
 * The two rate rules, and the pay conversion beside them.
 *
 * Oracles: the eleven Revaluation Orders carried in
 * `revaluation.ts`, each with its September CPI sourced from the
 * Order's own operative words rather than back-computed from the
 * rate. That direction is what makes the +1.5 assertion below a
 * test rather than a tautology.
 */

import {describe, expect, it} from 'vitest';
import {
  createPrices,
  createPublishedPrices,
  inflationFactor,
} from '../src/pension/prices.js';
import {
  activeRatePct,
  deferredRatePct,
} from '../src/pension/uplift.js';
import {IN_SERVICE_REVALUATION} from '../src/revaluation.js';

const TODAY = new Date(2026, 7, 19);
const prices = createPrices(0.02, TODAY);

describe('the active rule is CPI + 1.5', () => {
  it('reproduces every published rate, 11 of 11', () => {
    for (const year of IN_SERVICE_REVALUATION) {
      expect(activeRatePct(year.septemberCpiPct))
        .toBeCloseTo(year.ratePct, 9);
    }
    expect(IN_SERVICE_REVALUATION).toHaveLength(11);
  });

  it('carries a negative CPI through rather than flooring', () => {
    // September 2015 was -0.1%, and the scheme's first uplift was
    // 1.4% — not the 1.5% a floored reading would give.
    expect(activeRatePct(-0.1)).toBeCloseTo(1.4, 9);
  });
});

describe('the deferred rule is CPI floored at zero', () => {
  it('returns 0.0% through 2016', () => {
    // The gate: prices FELL in the year to September 2015, and a
    // deferred pension holds its cash value rather than being
    // clawed back.
    expect(deferredRatePct(-0.1)).toBe(0);
  });

  it('is CPI itself whenever prices rose', () => {
    expect(deferredRatePct(10.1)).toBeCloseTo(10.1, 9);
    expect(deferredRatePct(0)).toBe(0);
  });
});

describe('the pay conversion, and only it', () => {
  it('is symmetric, so a round trip lands where it started',
    () => {
      const asAt = new Date(2030, 0, 1);
      const there = inflationFactor(asAt, TODAY, 0.02);
      const back = inflationFactor(TODAY, asAt, 0.02);
      expect(there * back).toBeCloseTo(1, 12);
    });

  it('prices a PAST year on the assumption too', () => {
    // Reaching for the published Orders behind the run date is
    // the tempting move — a past window's inflation has already
    // happened — and it belongs to a design where today's money
    // is this projection divided by inflation. It is not: today's
    // money is a separate run at a zero assumption, and this
    // conversion serves only the cash one.
    //
    // One walk, one series, all the way through: the cash
    // projection is what the caller's assumption says, before
    // the run date as well as after it.
    const asAt = new Date(2025, 2, 31);
    const under = (cpi: number) =>
      createPrices(cpi, TODAY).payAt(1000, asAt);
    expect(under(0.05)).toBeLessThan(under(0.01));
    expect(under(0)).toBe(1000);
  });

  it('holds a figure flat between two Aprils', () => {
    // Revaluation is a STEP: no Order falls between June and
    // August 2026, so nothing moved in them.
    const june = new Date(2026, 5, 1);
    expect(inflationFactor(june, TODAY, 0.02)).toBe(1);
  });

  it('grows pay forward and shrinks it back', () => {
    expect(prices.payAt(1000, new Date(2030, 0, 1)))
      .toBeGreaterThan(1000);
    expect(prices.payAt(1000, new Date(2020, 0, 1)))
      .toBeLessThan(1000);
  });
});

describe('the published series', () => {
  const published = createPublishedPrices(0, TODAY);

  it('revalues each year the record covers at its Order', () => {
    for (const order of IN_SERVICE_REVALUATION) {
      const entry = published.cpiFor(order.yearEnd);
      expect(entry.si).toBe(order.si);
      expect(activeRatePct(entry.cpi)).toBeCloseTo(order.ratePct, 9);
    }
  });

  it('is the assumption beyond the record', () => {
    const beyond = IN_SERVICE_REVALUATION.at(-1)!.yearEnd + 1;
    expect(createPublishedPrices(0.02, TODAY).cpiFor(beyond))
      .toEqual({schemeYearEnd: beyond, cpi: 2, si: null});
  });

  it('carries past pay into cash by the Orders landed since', () => {
    // 31 March 2025 to 19 August 2026: two Orders have landed,
    // SI 2025/252 on 6 April 2025 (CPI 1.7) and SI 2026/254 on
    // 6 April 2026 (CPI 3.8).
    const asAt = new Date(2025, 2, 31);
    expect(published.payAt(1000, asAt))
      .toBeCloseTo(1000 / (1.017 * 1.038), 9);
  });

  it('is the assumption for pay beyond the record', () => {
    const later = new Date(2030, 0, 1);
    expect(createPublishedPrices(0.02, TODAY).payAt(1000, later))
      .toBeCloseTo(createPrices(0.02, TODAY).payAt(1000, later), 9);
  });

  it('steps pay by an Order that lands after the run date', () => {
    // Run on 1 March 2026, before SI 2026/254 (CPI 3.8) lands on
    // 6 April: pay and pot must both take it, not the assumption.
    const before = createPublishedPrices(0.02, new Date(2026, 2, 1));
    expect(before.payAt(1000, new Date(2027, 0, 1)))
      .toBeCloseTo(1038, 9);
    expect(before.cpiFor(2026).si).toBe('SI 2026/254');
  });

  it('refuses a year before the scheme\'s first Order', () => {
    expect(() => published.cpiFor(2015)).toThrow(/first is SI 2016\/438/);
  });
});
