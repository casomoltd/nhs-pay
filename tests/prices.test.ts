/**
 * The CPI series and the two rules applied to it.
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
  inflationFactor,
} from '../src/pension/prices.js';
import {
  activeRatePct,
  deferredRatePct,
} from '../src/pension/uplift.js';
import {IN_SERVICE_REVALUATION} from '../src/revaluation.js';
import {RevaluationRateUnavailable} from '../src/errors.js';

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

describe('the CPI table carries its own provenance', () => {
  it('cites the Order for a published year', () => {
    const entry = prices.cpiFor(2022);
    expect(entry.cpi).toBeCloseTo(3.1, 9);
    expect(entry.si).toBe('SI 2022/215');
    expect(prices.isPublished(2022)).toBe(true);
  });

  it('returns the assumption, unsourced, beyond the table', () => {
    const entry = prices.cpiFor(prices.publishedTo + 1);
    expect(entry.si).toBeNull();
    expect(entry.cpi).toBeCloseTo(2, 9);
    expect(prices.isPublished(prices.publishedTo + 1))
      .toBe(false);
  });

  it('throws rather than zeroing a year it does not hold', () => {
    // Before the scheme's first uplift. A silent zero would
    // understate in a direction no test would notice.
    expect(() => prices.cpiFor(2015))
      .toThrow(RevaluationRateUnavailable);
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
    // It used to reach for the published Orders behind the run
    // date, on the reasoning that a past window's inflation had
    // already happened. That mattered when today's money was
    // this projection divided by inflation; it does not now,
    // because today's money is a separate run at a zero
    // assumption and this conversion serves only the cash one.
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
