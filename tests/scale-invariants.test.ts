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
  DENTAL_TAX_YEARS,
  getDentalScales,
  getMedicalScales,
  MEDICAL_TAX_YEARS,
  ScaleUnavailable,
} from '../src/index.js';

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
