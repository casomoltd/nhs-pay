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
    // resident: all 14 named stages, not a collapsed 10
    expect(pointsOf(eng, 'resident')).toHaveLength(14);
    expect(salaryAt(eng, 'resident', 'FY1')).toBe(41226);
    expect(salaryAt(eng, 'resident', 'ST8 / SpR8')).toBe(77348);
    // each stage carries its 2016-contract nodal point, as the circular
    // LABELS it: R2 subdivided the five points into ten ('3a', '4b'…),
    // so these are identifiers and not an ordinal 1-5.
    expect(pointsOf(eng, 'resident')[0].nodalPoint).toBe('1');
    expect(
      pointsOf(eng, 'resident').find((p) => p.label === 'ST8 / SpR8')
        ?.nodalPoint,
    ).toBe('5c');
    // Two points can pay the same and still be distinct: CT1 and CT2
    // are nodal 3a and 3b on an identical salary, which is why a
    // salary cannot stand in for the point's identity. Exact labels,
    // not merely "different" — any two wrong strings differ too.
    const ct1 = pointsOf(eng, 'resident').find((p) => p.label === 'CT1');
    const ct2 = pointsOf(eng, 'resident').find((p) => p.label === 'CT2');
    expect(ct1?.salary).toBe(55355);
    expect(ct2?.salary).toBe(55355);
    expect(ct1?.nodalPoint).toBe('3a');
    expect(ct2?.nodalPoint).toBe('3b');
    // a scale with no nodal axis omits it, never fabricates one
    expect(pointsOf(eng, 'specialty-doctor')[0].nodalPoint).toBeUndefined();
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
    // Wales publishes the same 2021 SAS scale by code, and the year axis
    // is carried there too: a devolved SAS band reads like England's.
    const wal = getMedicalScales('2025-26', 'wales');
    const walSas = pointsOf(wal, 'specialty-doctor');
    expect(walSas[0].yearsExperience).toBe(0);
    expect(walSas.at(-1)?.yearsExperience).toBe(walSas.length - 1);
    expect(pointsOf(wal, 'specialist')[0].yearsExperience).toBe(0);
    // pin one figure to the source (M&D(W) 01/2025 Annex A §2b p6) so this
    // verifies the transcribed value, not just the 0..N axis shape
    expect(
      pointsOf(wal, 'specialist').find((p) => p.yearsExperience === 6)?.salary,
    ).toBe(111442);
    // Self-labelling scales (GP educators, training stages) have no year.
    expect(pointsOf(eng, 'gp-educator')[0].yearsExperience).toBeUndefined();
    expect(pointsOf(eng, 'resident')[0].yearsExperience).toBeUndefined();
  });

  // Scotland's 2026/27 round is split across two circulars: training
  // grades in PCS(DD)2026/01 and everything else in PCS(DD)2026/02.
  // Assert BOTH halves are wired — a regression that dropped either
  // would otherwise look like a complete year.
  it('Scotland wires both halves of its 2026/27 round', () => {
    const sco = getMedicalScales('2026-27', 'scotland');
    expect(gradesOf(sco)).toEqual([
      'consultant', 'specialty-doctor', 'specialist',
      'salaried-gp', 'gp-educator',
      'fho1', 'fho2', 'sho', 'spr', 'str',
      'specialty-registrar-core', 'specialty-registrar-fixed',
      'gp-registrar-sho', 'gp-registrar-spr', 'gp-registrar-str',
      'staff-grade', 'associate-specialist',
      'specialty-doctor-2008', 'associate-specialist-2008',
    ]);
    // Training half (2026/01) and non-training half (2026/02).
    expect(salaryAt(sco, 'fho1', 'Minimum')).toBe(37316);
    expect(salaryAt(sco, 'consultant', 'Threshold 1')).toBe(115331);
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

// ── New pay rounds pinned to their published source ──
// These pin the figures a bad re-transcription would slip through (a whole
// table on the wrong uplift stays internally consistent), citing the source
// annex, so the values are checked code-vs-PDF not just code-vs-code.

describe('Scotland 2025/26 — complete round pinned to source', () => {
  // PCS(DD)2025/01 (main: non-training) + its Residents Addendum.
  const sco = getMedicalScales('2025-26', 'scotland');
  const dsco = getDentalScales('2025-26', 'scotland');

  it('consultant (Annex A): 20 points, £111,430 → £148,064', () => {
    expect(pointsOf(sco, 'consultant')).toHaveLength(20);
    expect(salaryAt(sco, 'consultant', 'Threshold 1')).toBe(111430);
    expect(salaryAt(sco, 'consultant', 'Threshold 8')).toBe(148064);
  });

  it('2022 SAS (Annex E1): SD min £64,158, specialist top £111,441', () => {
    expect(pointsOf(sco, 'specialty-doctor')).toHaveLength(18);
    expect(salaryAt(sco, 'specialty-doctor', 'Minimum')).toBe(64158);
    expect(pointsOf(sco, 'specialty-doctor')[0].yearsExperience).toBe(0);
    expect(salaryAt(sco, 'specialist', 'Point 6')).toBe(111441);
  });

  it('salaried GP range (Annex D): £77,160 → £115,167', () => {
    expect(salaryAt(sco, 'salaried-gp', 'Range minimum')).toBe(77160);
    expect(salaryAt(sco, 'salaried-gp', 'Range maximum')).toBe(115167);
  });

  it('training grades (Addendum Annex C): FHO1 min £35,967', () => {
    expect(salaryAt(sco, 'fho1', 'Minimum')).toBe(35967);
    expect(salaryAt(sco, 'str', 'Minimum')).toBe(47438);
  });

  it('Public Dental Service spine (Annex G): £54,117 → £114,496', () => {
    expect(pointsOf(dsco, 'salaried-dental')).toHaveLength(18);
    expect(salaryAt(dsco, 'salaried-dental', 'Band A Point 1')).toBe(54117);
    expect(salaryAt(dsco, 'salaried-dental', 'Band C Point 18')).toBe(114496);
  });
});

describe('Wales 2026/27 — 3.5% uplift pinned to source', () => {
  // M&D(W) 01/2026.
  const wal = getMedicalScales('2026-27', 'wales');
  const dwal = getDentalScales('2026-27', 'wales');

  it('consultant (Annex A §1a): min £114,099, top £166,585', () => {
    expect(salaryAt(wal, 'consultant', 'Threshold Min')).toBe(114099);
    expect(salaryAt(wal, 'consultant', 'Threshold 7')).toBe(166585);
  });

  it('salaried GP KP22 (Annex A §5): £81,893 → £123,573', () => {
    expect(salaryAt(wal, 'salaried-gp', 'Minimum')).toBe(81893);
    expect(salaryAt(wal, 'salaried-gp', 'Point 9')).toBe(123573);
  });

  it('Associate Specialist MC01 removed this round — grade absent', () => {
    expect(gradesOf(wal)).not.toContain('associate-specialist');
  });

  it('salaried dental spine (Annex A §11): £54,802 → £117,211', () => {
    expect(salaryAt(dwal, 'salaried-dental', 'Band A Point 1')).toBe(54802);
    expect(salaryAt(dwal, 'salaried-dental', 'Band C Point 18')).toBe(117211);
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
  // Scotland's consultant scale IS published for 2026-27 — the
  // circular that carries it, PCS(DD)2026/02, landed on 12 Aug 2026,
  // after PCS(DD)2026/01 had deferred every non-training grade to it.
  // What still fails loud is a point that scale does not contain.
  it('an unknown Scottish consultant point throws', () => {
    expect(() =>
      medicalResolver.fromScalePoint(
        'consultant', 'No Such Point', 'scotland', '2026-27',
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
    // Wales now publishes 2026/27 (M&D(W) 01/2026), so its grades resolve
    // to the newer year, not the 2025 circular.
    expect(
      medicalResolver.latestYearFor('str', 'wales'),
    ).toBe('2026-27');
    // Scotland's 2026/27 round is complete across TWO circulars —
    // PCS(DD)2026/01 for training grades and PCS(DD)2026/02 for the
    // rest — so consultant resolves to the current year, not 2025/26.
    expect(
      medicalResolver.latestYearFor('consultant', 'scotland'),
    ).toBe('2026-27');
    expect(
      medicalResolver.latestYearFor('str', 'scotland'),
    ).toBe('2026-27');
  });

  it('latestYearFor is null for a grade a nation never publishes', () => {
    // Locally employed doctors are an England-only grade.
    expect(
      medicalResolver.latestYearFor('locally-employed-doctor', 'scotland'),
    ).toBeNull();
  });
});
