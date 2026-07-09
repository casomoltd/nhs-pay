/**
 * Medical & dental translation layer — grade coverage, resolver
 * equivalence, fail-loud.
 *
 * Salary figures are transcribed in the verbatim circular files
 * (src/circulars/*), reviewed against the PDFs. These tests verify the
 * translation + resolution logic on top: that each nation exposes the
 * expected inclusive grade set, that a Post reproduces the direct
 * salary -> tier -> take-home chain, and that absent data fails loud.
 */

import {describe, it, expect} from 'vitest';
import type {
  Nation,
  TaxYear,
  MedicalGradeId,
  DentalGradeId,
  ScalePoint,
} from '../src/index.js';
import {
  getMedicalScales,
  getDentalScales,
  medicalResolver,
  dentalResolver,
  ScaleUnavailable,
  getPensionTiers,
  pensionTierRate,
  nhsTakeHome,
  nationToTaxRegion,
} from '../src/index.js';

const gradesOf = (metas: {grade: string}[]) => metas.map((m) => m.grade);
const pointsOf = (
  metas: {grade: string; points: readonly ScalePoint[]}[],
  grade: string,
) => metas.find((m) => m.grade === grade)?.points ?? [];
const salaryAt = (
  metas: {grade: string; points: readonly ScalePoint[]}[],
  grade: string,
  label: string,
) => pointsOf(metas, grade).find((p) => p.label === label)?.salary;

// ── Inclusive grade coverage ─────────────────────

describe('medical grade coverage (inclusive)', () => {
  it('England wires resident stages, consultant years + closed grades', () => {
    const eng = getMedicalScales('2026-27', 'england');
    expect(gradesOf(eng)).toEqual([
      'resident', 'consultant', 'specialty-doctor', 'specialist',
      'salaried-gp', 'gp-educator', 'locally-employed-doctor',
      'staff-grade', 'associate-specialist', 'specialty-doctor-2008',
      'associate-specialist-2008',
    ]);
    // resident: all 14 named stages, not a collapsed 5
    expect(pointsOf(eng, 'resident')).toHaveLength(14);
    expect(salaryAt(eng, 'resident', 'FY1')).toBe(40190);
    expect(salaryAt(eng, 'resident', 'ST8 / SpR8')).toBe(76582);
    // consultant: all 20 year rows
    expect(pointsOf(eng, 'consultant')).toHaveLength(20);
    expect(salaryAt(eng, 'consultant', 'Threshold 4')).toBe(150569);
  });

  it('year-based scales carry yearsExperience; self-labelled ones omit it', () => {
    const eng = getMedicalScales('2026-27', 'england');
    // SAS: opaque MC codes → the year is the reader-facing axis.
    const sas = pointsOf(eng, 'specialty-doctor');
    expect(sas[0].yearsExperience).toBe(0);
    expect(sas.at(-1)?.yearsExperience).toBe(sas.length - 1);
    // Consultant is listed by year of completed service too — the SAME
    // axis, carried on the field (not baked into the label), uniformly.
    const cons = pointsOf(eng, 'consultant');
    expect(cons[0].label).toBe('Threshold 1');
    expect(cons[0].yearsExperience).toBe(0);
    expect(cons.at(-1)?.yearsExperience).toBe(19);
    // Self-labelling scales (GP educators, training stages) have no year.
    expect(pointsOf(eng, 'gp-educator')[0].yearsExperience).toBeUndefined();
    expect(pointsOf(eng, 'resident')[0].yearsExperience).toBeUndefined();
  });

  it('Scotland wires all training grades incl. GP registrars', () => {
    const sco = getMedicalScales('2026-27', 'scotland');
    expect(gradesOf(sco)).toEqual([
      'fho1', 'fho2', 'sho', 'spr', 'str',
      'specialty-registrar-core', 'specialty-registrar-fixed',
      'gp-registrar-sho', 'gp-registrar-spr', 'gp-registrar-str',
    ]);
    expect(salaryAt(sco, 'fho1', 'Minimum')).toBe(37316);
  });

  it('NI wires consultant + closed grades', () => {
    const ni = getMedicalScales('2025-26', 'northern-ireland');
    expect(gradesOf(ni)).toContain('associate-specialist');
    expect(gradesOf(ni)).toContain('staff-grade');
    expect(salaryAt(ni, 'salaried-gp', 'Range minimum')).toBe(77140);
  });
});

describe('dental grade coverage (inclusive)', () => {
  it('England: spine + core + specialty training + educators', () => {
    const eng = getDentalScales('2026-27', 'england');
    expect(gradesOf(eng)).toEqual([
      'salaried-dental', 'dental-core-training',
      'dental-specialty-training', 'dental-educator',
    ]);
    expect(pointsOf(eng, 'salaried-dental')).toHaveLength(18);
    expect(salaryAt(eng, 'salaried-dental', 'Band A Point 1')).toBe(54502);
  });

  it('NI: four salaried-dentist bands + Community Dental Service', () => {
    const ni = getDentalScales('2025-26', 'northern-ireland');
    expect(gradesOf(ni)).toEqual([
      'dental-core-training', 'salaried-dentist',
      'senior-salaried-dentist', 'assistant-clinical-director-dentist',
      'clinical-director-dentist', 'community-dental-officer',
      'senior-community-dental-officer',
      'assistant-community-dental-clinical-director',
      'specialist-community-dentist', 'community-dental-clinical-director',
    ]);
    expect(salaryAt(ni, 'salaried-dentist', 'Point 1')).toBe(48218);
    expect(
      salaryAt(ni, 'community-dental-clinical-director', 'Point 5'),
    ).toBe(109444);
  });
});

// ── Resolver equivalence + role round-trip ───────

interface Case {
  label: string;
  grade: MedicalGradeId;
  point: string;
  nation: Nation;
  year: TaxYear;
}

const medicalCases: Case[] = [
  {label: 'England resident ST3/SpR3', grade: 'resident',
    point: 'ST3 / SpR3', nation: 'england', year: '2026-27'},
  {label: 'England consultant top', grade: 'consultant',
    point: 'Threshold 4', nation: 'england', year: '2026-27'},
  {label: 'Scotland spr Point 5', grade: 'spr',
    point: 'Point 5', nation: 'scotland', year: '2026-27'},
  {label: 'Wales staff grade', grade: 'staff-grade',
    point: 'Point 1', nation: 'wales', year: '2025-26'},
  // NI 2025/26 exercises the HSC 2025-26 member tier table.
  {label: 'NI associate-specialist', grade: 'associate-specialist',
    point: 'Point 1', nation: 'northern-ireland', year: '2025-26'},
];

describe('medicalResolver.fromScalePoint == direct chain', () => {
  it.each(medicalCases)('$label', (tc) => {
    const pt = pointsOf(
      getMedicalScales(tc.year, tc.nation), tc.grade,
    ).find((p) => p.label === tc.point);
    if (!pt) {
      throw new Error(`${tc.label}: point missing`);
    }
    const rate = pensionTierRate(
      pt.salary, getPensionTiers(tc.year, tc.nation),
    );
    const direct = nhsTakeHome(
      pt.salary, rate / 100, tc.year, nationToTaxRegion(tc.nation),
    );

    const post = medicalResolver.fromScalePoint(
      tc.grade, tc.point, tc.nation, tc.year,
    );

    expect(post.salary).toBe(pt.salary);
    expect(post.pensionRate).toBe(rate);
    expect(post.takeHome.net).toBe(direct.net);
    expect(post.takeHome.net).toBeGreaterThan(0);
    expect(post.takeHome.net).toBeLessThan(pt.salary);
    expect(post.role).toEqual({
      kind: 'medical', grade: tc.grade, point: pt, nation: tc.nation,
    });
  });
});

interface DentalCase {
  label: string;
  grade: DentalGradeId;
  point: string;
  nation: Nation;
  year: TaxYear;
}

const dentalCases: DentalCase[] = [
  {label: 'England salaried dental top', grade: 'salaried-dental',
    point: 'Band C Point 18', nation: 'england', year: '2026-27'},
  {label: 'NI community dental officer', grade: 'community-dental-officer',
    point: 'Point 1', nation: 'northern-ireland', year: '2025-26'},
];

describe('dentalResolver.fromScalePoint == direct chain', () => {
  it.each(dentalCases)('$label', (tc) => {
    const pt = pointsOf(
      getDentalScales(tc.year, tc.nation), tc.grade,
    ).find((p) => p.label === tc.point);
    if (!pt) {
      throw new Error(`${tc.label}: point missing`);
    }
    const rate = pensionTierRate(
      pt.salary, getPensionTiers(tc.year, tc.nation),
    );
    const direct = nhsTakeHome(
      pt.salary, rate / 100, tc.year, nationToTaxRegion(tc.nation),
    );
    const post = dentalResolver.fromScalePoint(
      tc.grade, tc.point, tc.nation, tc.year,
    );
    expect(post.salary).toBe(pt.salary);
    expect(post.takeHome.net).toBe(direct.net);
    expect(post.role).toEqual({
      kind: 'dental', grade: tc.grade, point: pt, nation: tc.nation,
    });
  });
});

// ── Fail loud ────────────────────────────────────

describe('fail loud', () => {
  it('Scottish consultant 2026-27 is unpublished', () => {
    expect(() =>
      medicalResolver.fromScalePoint(
        'consultant', 'Threshold 1', 'scotland', '2026-27',
      ),
    ).toThrow(ScaleUnavailable);
  });

  it('England medical 2025-26 is unpublished (a year behind)', () => {
    expect(() =>
      getMedicalScales('2025-26', 'england'),
    ).toThrow(ScaleUnavailable);
  });

  it('unknown scale point throws', () => {
    expect(() =>
      medicalResolver.fromScalePoint(
        'resident', 'No Such Point', 'england', '2026-27',
      ),
    ).toThrow(ScaleUnavailable);
    expect(() =>
      dentalResolver.fromScalePoint(
        'salaried-dental', 'No Such Point', 'england', '2026-27',
      ),
    ).toThrow(ScaleUnavailable);
  });
});

// ── Resolver queries ─────────────────────────────

describe('resolver queries', () => {
  it('availableGrades reflect each nation', () => {
    expect(
      medicalResolver.availableGrades('scotland', '2026-27'),
    ).toContain('gp-registrar-str');
    expect(
      dentalResolver.availableGrades('northern-ireland', '2025-26'),
    ).toContain('community-dental-clinical-director');
  });

  it('latestYearFor reports each nation at its cited year', () => {
    expect(
      medicalResolver.latestYearFor('consultant', 'england'),
    ).toBe('2026-27');
    expect(
      medicalResolver.latestYearFor('str', 'wales'),
    ).toBe('2025-26');
  });

  it('latestYearFor is null for an unpublished grade/nation', () => {
    // Scotland's PCS(DD)2026/01 covers training grades only.
    expect(
      medicalResolver.latestYearFor('consultant', 'scotland'),
    ).toBeNull();
  });
});
