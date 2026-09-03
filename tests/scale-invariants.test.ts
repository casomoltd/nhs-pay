/**
 * Structural invariants swept across every published medical & dental
 * scale — the guards a per-figure pin can't give. Every (year, nation)
 * pairing the data publishes resolves; every scale has points with
 * positive integer salaries; and salaries never fall as a scale
 * progresses. Educator/adviser grades are exempt from monotonicity:
 * they are lists of distinct posts, not incremental scales.
 */

import {describe, it, expect} from 'vitest';
import type {Nation, ScalePoint, TaxYear} from '../src/index.js';
import {
  afcTaxYears,
  DENTAL_TAX_YEARS,
  getAfcScales,
  getDentalScales,
  getMedicalScales,
  MEDICAL_TAX_YEARS,
  ScaleUnavailable,
  WALES_LIVING_WAGE,
} from '../src/index.js';
import {
  NODAL_POINT_ORDER,
} from '../src/circulars/england-md-1-2026-r2.js';

const ALL_NATIONS: readonly Nation[] = [
  'england',
  'scotland',
  'wales',
  'northern-ireland',
];

/**
 * Grades exempt from the monotonic-salary check: the educator grades
 * list distinct posts rather than an incremental scale, and England's
 * unified resident scale interleaves the core (CT) and specialty (ST)
 * ladders as printed, so salary legitimately dips at the CT4→ST1
 * boundary (nodal 4 back to nodal 3).
 */
const NON_MONOTONIC = new Set([
  'gp-educator',
  'dental-educator',
  'resident',
]);

interface Meta {
  grade: string;
  points: readonly ScalePoint[];
  salary: {min: number; max: number};
}

interface Combo {
  family: string;
  year: TaxYear;
  nation: Nation;
  metas: Meta[];
}

/** Every (year, nation) combination that actually publishes scales. */
const publishedCombos = (
  family: string,
  years: readonly TaxYear[],
  resolve: (year: TaxYear, nation: Nation) => Meta[],
): Combo[] => {
  const combos: Combo[] = [];
  for (const year of years) {
    for (const nation of ALL_NATIONS) {
      try {
        combos.push({family, year, nation, metas: resolve(year, nation)});
      } catch (error) {
        // An unpublished nation/year is legitimate; anything else is not.
        if (!(error instanceof ScaleUnavailable)) {
          throw error;
        }
      }
    }
  }
  return combos;
};

const COMBOS = [
  ...publishedCombos('medical', MEDICAL_TAX_YEARS, getMedicalScales),
  ...publishedCombos('dental', DENTAL_TAX_YEARS, getDentalScales),
];

describe('advertised tax years', () => {
  it('medical years are non-empty, newest first', () => {
    expect(MEDICAL_TAX_YEARS.length).toBeGreaterThan(0);
    expect([...MEDICAL_TAX_YEARS].sort().reverse())
      .toEqual([...MEDICAL_TAX_YEARS]);
  });

  it('dental years are non-empty, newest first', () => {
    expect(DENTAL_TAX_YEARS.length).toBeGreaterThan(0);
    expect([...DENTAL_TAX_YEARS].sort().reverse())
      .toEqual([...DENTAL_TAX_YEARS]);
  });

  it('every advertised year resolves for at least one nation', () => {
    for (const year of MEDICAL_TAX_YEARS) {
      expect(
        COMBOS.some((c) => c.family === 'medical' && c.year === year),
      ).toBe(true);
    }
    for (const year of DENTAL_TAX_YEARS) {
      expect(
        COMBOS.some((c) => c.family === 'dental' && c.year === year),
      ).toBe(true);
    }
  });
});

describe('every published scale is structurally sound', () => {
  it.each(COMBOS)('$family $nation $year', ({metas}) => {
    expect(metas.length).toBeGreaterThan(0);
    for (const meta of metas) {
      const at = (i: number) => `${meta.grade}[${i}]`;
      expect(meta.points.length, meta.grade).toBeGreaterThan(0);
      for (const [i, point] of meta.points.entries()) {
        expect(Number.isInteger(point.salary), at(i)).toBe(true);
        expect(point.salary, at(i)).toBeGreaterThan(0);
        expect(point.label, at(i)).toBeTruthy();
      }
      expect(meta.salary.min, meta.grade).toBeLessThanOrEqual(
        meta.salary.max,
      );
      if (NON_MONOTONIC.has(meta.grade)) {
        continue;
      }
      for (let i = 1; i < meta.points.length; i++) {
        expect(
          meta.points[i].salary,
          `${at(i)} "${meta.points[i].label}" falls below ${at(i - 1)}`,
        ).toBeGreaterThanOrEqual(meta.points[i - 1].salary);
      }
    }
  });
});

/**
 * England's nodal points reach the canonical layer intact.
 *
 * A COVERAGE check, not a correctness one: each point's label and salary
 * are pinned against the transcribed fixture in `scale-fixture.test.ts`,
 * which is the cited oracle. What this adds is the "and no others"
 * direction across grades the fixture does not carry rows for —
 * `gp-educator`, `staff-grade`, `associate-specialist` and the two 2008
 * closed grades — so a nodal label appearing where no nodal axis belongs
 * fails here and nowhere else.
 *
 * Source of the ten: NHS Employers PC(M&D) 1/2026 R2, Annex A section 1
 * (p6-p7).
 */
describe('England nodal points survive translation', () => {
  const YEAR: TaxYear = '2026-27';
  const NODAL_SCALES = [
    'resident',
    'locally-employed-doctor',
  ] as const;

  it('uses only the ten the circular prints, and no others', () => {
    // Union across both families, which is the medical scale's ten:
    // dental training starts at 3a and never reaches 1 or 2. This
    // direction catches an INVENTED label; it cannot catch a dropped
    // row, because another grade on the same point keeps the set
    // whole — `scale-fixture.test.ts` pins per row and owns that.
    const seen = new Set<string>();
    const collect = (
      metas: {points: readonly ScalePoint[]}[],
    ): void => {
      for (const meta of metas) {
        for (const point of meta.points) {
          if (point.nodalPoint !== undefined) {
            seen.add(point.nodalPoint);
          }
        }
      }
    };
    collect(getMedicalScales(YEAR, 'england'));
    collect(getDentalScales(YEAR, 'england'));
    expect([...seen].sort()).toEqual([...NODAL_POINT_ORDER].sort());
  });

  it.each(NODAL_SCALES)(
    '%s carries a nodal point on every step',
    (grade) => {
      const meta = getMedicalScales(YEAR, 'england')
        .find((m) => m.grade === grade);
      expect(meta, `${grade} not published`).toBeDefined();
      for (const point of meta!.points) {
        expect(
          NODAL_POINT_ORDER,
          `${grade} "${point.label}" has no valid nodal point`,
        ).toContain(point.nodalPoint);
      }
    },
  );

  it('gives each nodal point exactly one salary', () => {
    const salaries = new Map<string, Set<number>>();
    const families = [
      ...getMedicalScales(YEAR, 'england'),
      ...getDentalScales(YEAR, 'england'),
    ];
    // Both families, deliberately: England's dental training grades sit
    // on the same nodal points at the same salaries, and the medical and
    // dental translators are separate code paths — so a disagreement
    // BETWEEN them is the likeliest drift and would be invisible to a
    // medical-only sweep.
    for (const meta of families) {
      for (const point of meta.points) {
        if (point.nodalPoint === undefined) {
          continue;
        }
        const bucket = salaries.get(point.nodalPoint) ?? new Set();
        bucket.add(point.salary);
        salaries.set(point.nodalPoint, bucket);
      }
    }
    // The property the scale's shape rests on: several stages share a
    // nodal point (CT1 and ST1/SpR1 are both 3a), and a nodal point is
    // what fixes their pay — so two stages on one point must never
    // disagree. Checked across every stage, not a sampled pair.
    for (const [nodal, values] of salaries) {
      expect([...values], `nodal ${nodal} pays more than one salary`)
        .toHaveLength(1);
    }
    expect(salaries.size).toBe(NODAL_POINT_ORDER.length);
  });
});

/**
 * Wales publishes its floor and its ladder as SEPARATE instruments —
 * the AfC(W) 01/2026 pay letter and the AfC(W) 02/2026 spine table —
 * and neither is derived from the other. The fixture pins each point
 * against its own source; what nothing else checks is whether the two
 * instruments agree, which is what this asserts.
 *
 * Driven off the years that HAVE a floor, not off every published year:
 * a year with no floor must produce zero cases, not a case that returns
 * early and reports green.
 */
/**
 * `afcTaxYears` documents "oldest first" and `resolver.ts` reverses it to
 * find the latest published year, so the order is load-bearing rather
 * than incidental. Asserted the way `MEDICAL_TAX_YEARS` already is —
 * a sort that only a comment guarantees is a sort waiting to be dropped.
 */
describe('afcTaxYears is oldest first', () => {
  it.each(['england', 'scotland', 'wales', 'northern-ireland'] as Nation[])(
    '%s',
    (nation) => {
      const years = afcTaxYears(nation);
      expect(years.length).toBeGreaterThan(0);
      expect([...years]).toEqual([...years].sort());
    },
  );
});

describe('no Welsh pay point falls below the living-wage floor', () => {
  const FLOOR_YEARS = Object.keys(WALES_LIVING_WAGE) as TaxYear[];

  it('has floor years to sweep', () => {
    expect(FLOOR_YEARS.length).toBeGreaterThan(0);
  });

  it.each(FLOOR_YEARS)('%s', (year) => {
    const wage = WALES_LIVING_WAGE[year];
    expect(wage, `no floor recorded for ${year}`).toBeDefined();
    for (const band of getAfcScales(year, 'wales').bands) {
      for (const point of band.points) {
        expect(
          point.salary,
          `Band ${band.band} "${point.label}" is below the floor`,
        ).toBeGreaterThanOrEqual(wage!.annual);
      }
    }
  });
});
