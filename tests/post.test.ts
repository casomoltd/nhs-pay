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
import type {
  AfcBandId,
  AfcRegionId,
  TaxYear,
} from '../src/index.js';
import {
  Post,
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
      gross, scales.pensionTiers,
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
      getAfcScales(UNPUBLISHED_YEAR),
    ).toThrow(ScaleUnavailable);
  });

  it('throws for unpublished pension tiers', () => {
    expect(() =>
      getPensionTiers(UNPUBLISHED_YEAR),
    ).toThrow(PensionTiersUnavailable);
  });
});

// ─── PensionTiers value object ───────────────────

describe('PensionTiers', () => {
  const tiers = getPensionTiers('2026-27');
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
      getPensionTiersVO('2026-27').rateFor(40000),
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
      40000, getPensionTiers('2026-27'),
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

  it('withSalary returns a new post, same identity', () => {
    const post = Post.fromSalary(
      40000, 'england', '2026-27',
    );
    const raised = post.withSalary(50000);
    expect(raised.salary).toBe(50000);
    expect(post.salary).toBe(40000);
    expect(raised.identity).toEqual(post.identity);
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
