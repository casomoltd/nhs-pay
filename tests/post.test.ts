/**
 * Post / afcResolver equivalence + behaviour.
 *
 * The core guarantee for the Phase-1 remodel: a Post built
 * by afcResolver reproduces the legacy
 *   grossSalary -> pensionTierRate -> nhsTakeHome
 * triad byte-for-byte, so migrating hub-site call sites onto
 * it changes no rendered figure.
 */

import {describe, it, expect} from 'vitest';
import {StudentLoanPlan, TaxCode} from '@casomoltd/paye-calc';
import type {
  AfcBandId,
  AfcRegionId,
  TaxYear,
} from '../src/index.js';
import {
  Post,
  NO_ADJUSTMENTS,
  afcResolver,
  ScaleUnavailable,
  PensionTiersUnavailable,
  PensionTiers,
  getPensionTiers,
  getPensionTiersVO,
  pensionTierRate,
  lookupPensionTier,
  nhsTakeHome,
  getAfcScales,
  grossSalary,
  afcRegionToNation,
  nationToTaxRegion,
  AFC_REGIONS,
} from '../src/index.js';

// A valid TaxYear that AfC does not publish scales for.
const UNPUBLISHED_YEAR = '2024-25';

// ─── Legacy triad ↔ Post equivalence ─────────────

interface ScaleCase {
  label: string;
  band: AfcBandId;
  point: string;
  region: AfcRegionId;
  year: TaxYear;
}

const scaleCases: ScaleCase[] = [
  {
    label: 'England Band 5 (Year 1)',
    band: '5', point: 'Year 1',
    region: AFC_REGIONS.ENG, year: '2026-27',
  },
  {
    label: 'England Inner London HCAS Band 5',
    band: '5', point: 'Year 1',
    region: AFC_REGIONS.ENG_IL, year: '2026-27',
  },
  {
    label: 'Wales Band 2 (floored)',
    band: '2', point: 'Entry',
    region: AFC_REGIONS.WAL, year: '2026-27',
  },
  {
    label: 'Scotland Band 5 (Year 1)',
    band: '5', point: 'Year 1',
    region: AFC_REGIONS.SCO, year: '2026-27',
  },
  {
    label: 'England Band 8d (taper region)',
    band: '8d', point: 'Year 5+',
    region: AFC_REGIONS.ENG, year: '2026-27',
  },
];

describe('afcResolver.fromScalePoint == legacy triad', () => {
  it.each(scaleCases)('$label', (tc) => {
    const nation = afcRegionToNation(tc.region);
    const scales = getAfcScales(tc.year, nation);
    const meta = scales.bands.find(
      (b) => b.band === tc.band,
    );
    const pt = meta?.points.find(
      (p) => p.label === tc.point,
    );
    if (!pt) {
      throw new Error(`${tc.label}: point missing`);
    }

    const gross = grossSalary(
      pt.salary, tc.region, scales.hcas, tc.year,
    );
    const rate = pensionTierRate(
      gross, getPensionTiers(tc.year, nation),
    );
    const legacy = nhsTakeHome(
      gross, rate / 100, tc.year,
      nationToTaxRegion(nation),
    );

    const post = afcResolver.fromScalePoint(
      tc.band, tc.point, tc.region, tc.year,
    );

    expect(post.salary).toBe(gross);
    expect(post.pensionRate).toBe(rate);
    expect(post.takeHome.net).toBe(legacy.net);
    expect(post.takeHome.incomeTax).toBe(
      legacy.incomeTax,
    );
    expect(post.takeHome.nationalInsurance).toBe(
      legacy.nationalInsurance,
    );
    expect(post.takeHome.pensionDeduction).toBe(
      legacy.pensionDeduction,
    );

    // Identity round-trips: the Post knows its scale position.
    expect(post.role).toEqual({
      kind: 'afc',
      band: tc.band,
      point: pt,
      region: tc.region,
    });
  });
});

// ─── Fail loud on absent data ────────────────────

describe('fail loud', () => {
  it('throws for an unknown scale point', () => {
    expect(() =>
      afcResolver.fromScalePoint(
        '5', 'No Such Point',
        AFC_REGIONS.ENG, '2026-27',
      ),
    ).toThrow(ScaleUnavailable);
  });

  it('throws for an unpublished scale year', () => {
    expect(() =>
      getAfcScales(UNPUBLISHED_YEAR, 'england'),
    ).toThrow(ScaleUnavailable);
  });

  it('throws for unpublished pension tiers', () => {
    expect(() =>
      getPensionTiers(UNPUBLISHED_YEAR, 'england'),
    ).toThrow(PensionTiersUnavailable);
  });
});

// ─── PensionTiers value object ───────────────────

describe('PensionTiers', () => {
  const tiers = getPensionTiers('2026-27', 'england');
  const vo = new PensionTiers(tiers);

  it('rateFor matches pensionTierRate at boundaries', () => {
    const salaries = [
      0, 13259, 13260, 28854, 28855, 35155,
      52778, 67668, 67669, 250000,
    ];
    for (const salary of salaries) {
      expect(vo.rateFor(salary)).toBe(
        pensionTierRate(salary, tiers),
      );
    }
  });

  it('tierFor matches lookupPensionTier', () => {
    expect(vo.tierFor(40000)).toEqual(
      lookupPensionTier(40000, tiers),
    );
  });

  it('empty tiers → rate 0, tier null', () => {
    const empty = new PensionTiers([]);
    expect(empty.rateFor(40000)).toBe(0);
    expect(empty.tierFor(40000)).toBeNull();
  });

  it('getPensionTiersVO wraps the year tiers', () => {
    expect(
      getPensionTiersVO('2026-27', 'england').rateFor(40000),
    ).toBe(pensionTierRate(40000, tiers));
  });
});

// ─── Post behaviour ──────────────────────────────

describe('Post', () => {
  it('derives pension / tax / NI from salary', () => {
    const post = Post.fromSalary(
      40000, 'england', '2026-27',
    );
    const rate = pensionTierRate(
      40000, getPensionTiers('2026-27', 'england'),
    );
    expect(post.pensionRate).toBe(rate);
    expect(post.pensionContribution).toBe(
      post.takeHome.pensionDeduction,
    );
    expect(post.tax).toBe(post.takeHome.incomeTax);
    expect(post.nationalInsurance).toBe(
      post.takeHome.nationalInsurance,
    );
  });

  it('a bare salary is a vsm role', () => {
    expect(
      Post.fromSalary(40000, 'england', '2026-27').role,
    ).toEqual({kind: 'vsm'});
    expect(
      afcResolver.fromSalary(40000, 'england', '2026-27')
        .role,
    ).toEqual({kind: 'vsm'});
  });

  it('withSalary returns a new post, same identity', () => {
    const post = Post.fromSalary(
      40000, 'england', '2026-27',
    );
    const raised = post.withSalary(50000);
    expect(raised.salary).toBe(50000);
    expect(post.salary).toBe(40000);
    expect(raised.identity).toEqual(post.identity);
    expect(raised.role).toEqual(post.role);
  });
});

// ─── Post adjustments ────────────────────────────

describe('Post adjustments', () => {
  const region = nationToTaxRegion('england');
  const tiers = getPensionTiers('2026-27', 'england');
  const base = Post.fromSalary(60000, 'england', '2026-27');

  const takeHomeAt = (
    gross: number,
    rate: number,
    opts = {},
  ) => nhsTakeHome(gross, rate / 100, '2026-27', region, opts);

  it('a plain post carries NO_ADJUSTMENTS, unchanged', () => {
    expect(base.adjustments).toEqual(NO_ADJUSTMENTS);
    const explicit = base.withAdjustments(NO_ADJUSTMENTS);
    expect(explicit.pensionablePay).toBe(base.pensionablePay);
    expect(explicit.takeHome.net).toBe(base.takeHome.net);
  });

  it('fte pro-rates the assessed gross and take-home', () => {
    const pt = base.withAdjustments({fte: 0.5});
    const gross = Math.round(60000 * 0.5);
    expect(pt.pensionablePay).toBe(gross);
    const rate = pensionTierRate(gross, tiers);
    expect(pt.pensionRate).toBe(rate);
    expect(pt.takeHome.net).toBe(takeHomeAt(gross, rate).net);
  });

  it('salary sacrifice reduces the assessed gross', () => {
    const s = base.withAdjustments({salarySacrifice: 10000});
    expect(s.pensionablePay).toBe(50000);
    const rate = pensionTierRate(50000, tiers);
    expect(s.pensionRate).toBe(rate);
    expect(s.takeHome.net).toBe(takeHomeAt(50000, rate).net);
  });

  it('opting out zeroes the pension and lifts net', () => {
    const out = base.withAdjustments({pensionOptedOut: true});
    expect(out.pensionRate).toBe(0);
    expect(out.pensionContribution).toBe(0);
    expect(out.takeHome.pensionDeduction).toBe(0);
    expect(out.takeHome.net).toBeGreaterThan(base.takeHome.net);
  });

  it('net-pay: the pension reduces tax but not NI', () => {
    // Same gross, in-scheme vs opted-out. Under the NET pay
    // arrangement the member contribution comes off taxable pay only,
    // so NI is identical while income tax (and net) differ. This is
    // the invariant nhsTakeHome asserts on every call.
    const out = base.withAdjustments({pensionOptedOut: true});
    expect(base.takeHome.nationalInsurance).toBe(
      out.takeHome.nationalInsurance,
    );
    expect(base.takeHome.incomeTax).toBeLessThan(
      out.takeHome.incomeTax,
    );
  });

  it('student loans add a repayment', () => {
    const loans = base.withAdjustments({
      studentLoans: new Set([StudentLoanPlan.Plan2]),
    });
    expect(loans.takeHome.studentLoanDeduction).toBeGreaterThan(0);
    expect(loans.takeHome.studentLoanDeduction).toBe(
      takeHomeAt(60000, base.pensionRate, {
        studentLoans: new Set([StudentLoanPlan.Plan2]),
      }).studentLoanDeduction,
    );
  });

  it('a tax-code override changes income tax', () => {
    const br = TaxCode.parse('BR');
    const coded = base.withAdjustments({taxCode: br});
    expect(coded.takeHome.incomeTax).not.toBe(
      base.takeHome.incomeTax,
    );
    expect(coded.takeHome.incomeTax).toBe(
      takeHomeAt(60000, base.pensionRate, {taxCode: br}).incomeTax,
    );
  });

  it('withAdjustments merges and leaves the original untouched', () => {
    const a = base.withAdjustments({fte: 0.8});
    const b = a.withAdjustments({salarySacrifice: 5000});
    expect(b.adjustments.fte).toBe(0.8);
    expect(b.adjustments.salarySacrifice).toBe(5000);
    expect(a.adjustments.salarySacrifice).toBe(0);
    expect(base.adjustments).toEqual(NO_ADJUSTMENTS);
  });
});

// ─── Resolver queries ────────────────────────────

describe('afcResolver queries', () => {
  it('availableGrades lists all 11 bands', () => {
    const grades = afcResolver.availableGrades(
      'england', '2026-27',
    );
    expect(grades).toHaveLength(11);
    expect(grades).toContain('8a');
  });

  it('latestYearFor returns the newest published year', () => {
    expect(
      afcResolver.latestYearFor('5', 'england'),
    ).toBe('2026-27');
  });
});
