/**
 * Contribution & award data pinned to source-cited fixtures.
 *
 * These tables are transcribed from external primary sources (NHSBSA,
 * SPPA, HSC, NHS Employers / NHS Scotland circulars). A code-vs-code
 * assertion would only prove internal consistency; each figure is
 * instead asserted against a fixture that mirrors the published table
 * with its provenance per row, so a bad transcription fails here.
 *
 * The coverage fixture is authored from the review bodies' own
 * recommendations, never generated from the map it checks — a fixture
 * derived from the implementation agrees with whatever the
 * implementation becomes.
 */

import {describe, it, expect} from 'vitest';
import type {
  AwardFamily,
  Nation,
  PayScaleId,
  SessionAllowanceId,
  TaxYear,
} from '../src/index.js';
import {
  AFC_BAND_IDS,
  AWARD_FAMILIES,
  DENTAL_GRADE_IDS,
  MEDICAL_GRADE_IDS,
  afcAward,
  sessionAllowance,
  sourceCurrency,
  afcSessionAllowances,
  SESSION_ALLOWANCES,
  awardsFor,
  changesFor,
  getEmployerPensionRate,
  getPensionTiers,
} from '../src/index.js';
import {parseCsv} from './helpers.js';

/** One representative scale per award family, for exercising the
 *  grade-keyed lookup from a family-keyed fixture row. */
const SCALE_IN_FAMILY: Record<AwardFamily, PayScaleId> = {
  [AWARD_FAMILIES.afc]: '5',
  [AWARD_FAMILIES.medical]: 'consultant',
  [AWARD_FAMILIES.resident]: 'resident',
  [AWARD_FAMILIES.salariedDental]: 'salaried-dental',
};

// ─── Member pension tiers vs cited source ────────

describe('member pension tiers (vs cited fixture)', () => {
  const rows = parseCsv('pension-tiers.csv');

  it.each(rows)(
    '$nation $year tier $tier === source',
    (row) => {
      const tiers = getPensionTiers(
        row.year as TaxYear,
        row.nation as Nation,
      );
      const tier = tiers.find(
        (t) => t.tier === Number(row.tier),
      );
      const expectedMax =
        row.max === '' ? Infinity : Number(row.max);
      expect(tier).toBeDefined();
      expect(tier?.min).toBe(Number(row.min));
      expect(tier?.max).toBe(expectedMax);
      expect(tier?.rate).toBe(Number(row.rate));
    },
  );

  it('Wales shares the NHSBSA (England) table', () => {
    for (const year of ['2025-26', '2026-27'] as TaxYear[]) {
      expect(getPensionTiers(year, 'wales')).toEqual(
        getPensionTiers(year, 'england'),
      );
    }
  });

  it('Scotland 2025-26 tiers resolve from SPPA circular 2025/07', () => {
    // SPPA published its 2025/26 tier bandings (circular 2025/07, Table 2),
    // so the complete Scotland 2025/26 pay round resolves against them —
    // nine SPPA tiers, distinct from NHSBSA's six.
    const tiers = getPensionTiers('2025-26', 'scotland');
    expect(tiers).toHaveLength(9);
    expect(tiers[0].rate).toBe(0.057);
    expect(tiers.at(-1)?.rate).toBe(0.127);
  });
});

// ─── AfC pay awards vs cited source ──────────────

describe('AfC pay awards (vs cited fixture)', () => {
  const rows = parseCsv('afc-awards.csv');

  it.each(rows)('$nation $year award === source', (row) => {
    const award = afcAward(row.year as TaxYear, row.nation as Nation);
    expect(award.pct).toBe(Number(row.pct));
    expect(award.effectiveFrom).toBe(row.effective_from);
    // Provenance is asserted, not merely carried.
    expect(award.source.issuer).toBe(row.issuer);
    expect(award.source.reference).toBe(row.reference);
    expect(award.source.url).toBe(row.url);
    expect(award.source.issued).toBe(row.issued);
  });
});

// ─── AfC allowances vs cited source ──────────────

describe('per-session allowances (vs cited fixture)', () => {
  const rows = parseCsv('allowances.csv');

  // A fixture that stopped being read would leave it.each with no
  // cases and the suite green — assert the rows exist first.
  it('has rows to sweep', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it.each(rows)(
    '$nation $year $allowance === source',
    (row) => {
      const found = sessionAllowance(
        row.allowance as SessionAllowanceId,
        row.year as TaxYear,
      );
      expect(found).toBeDefined();
      expect(found?.nation).toBe(row.nation);
      expect(found?.perSession).toBe(Number(row.per_session));
      expect(found?.effectiveFrom).toBe(row.effective_from);
      expect(found?.source.issuer).toBe(row.issuer);
      expect(found?.source.reference).toBe(row.reference);
      expect(found?.source.url).toBe(row.url);
      expect(found?.source.issued).toBe(row.issued);
    });

  // Both lookups must agree: the nation-keyed one is what pages
  // render from, the id-keyed one is what the sweep above checks.
  it.each(rows)(
    '$nation $year $allowance reachable by nation',
    (row) => {
      const byNation = afcSessionAllowances(
        row.year as TaxYear, row.nation as Nation,
      ).find((a) => a.id === row.allowance);
      expect(byNation).toEqual(
        sessionAllowance(
          row.allowance as SessionAllowanceId,
          row.year as TaxYear,
        ),
      );
    });

  // The published rate, not a computed one: the circular prints
  // 27.51 where the uplift lands on 27.504, so a consumer that
  // derived the new rate from the award would be a penny out. Both
  // numbers are pinned, because the gap between them is the point.
  it('carries the published rate, not the uplift arithmetic', () => {
    const id = SESSION_ALLOWANCES.scotlandOnCallAvailability;
    const next = sessionAllowance(id, '2026-27');
    const prev = sessionAllowance(id, '2025-26');
    expect(prev).toBeDefined();
    // 3.75% as printed in PCS(AFC)2026/1 (#sa-13) Annex B, not read
    // from afcAward: a counterfactual sourced from the record under
    // test would follow that record wherever it goes.
    const derived = prev!.perSession * 1.0375;
    expect(derived).toBeCloseTo(27.504, 3);
    expect(next?.perSession).toBe(27.51);
  });

  // Wales prints the same rounding trap in its own table.
  it('rounds Wales the way its circular does', () => {
    const id = SESSION_ALLOWANCES.walesOnCallWeekday;
    const prev = sessionAllowance(id, '2025-26');
    expect(prev?.perSession).toBe(25.21);
    // AfC(W) 02/2026 uplifts by 3.3%: 25.21 x 1.033 = 26.042,
    // and the circular nonetheless prints £26.05.
    expect(prev!.perSession * 1.033).toBeCloseTo(26.042, 3);
    expect(sessionAllowance(id, '2026-27')?.perSession).toBe(26.05);
  });

  // Undefined means untranscribed, not unpayable — England's
  // medical & dental circular sets an on-call availability
  // allowance of its own, on a different footing, and no AfC
  // instrument for England or NI is transcribed here.
  it('is empty where no AfC instrument is transcribed', () => {
    for (const nation of ['england', 'northern-ireland'] as const) {
      expect(
        afcSessionAllowances('2026-27', nation),
      ).toHaveLength(0);
    }
  });

  // Every id resolves for the nation its name claims, so an id and
  // a nation cannot drift apart.
  it('resolves each id to the nation its name states', () => {
    for (const id of Object.values(SESSION_ALLOWANCES)) {
      const found = sessionAllowance(id, '2026-27');
      expect(found).toBeDefined();
      expect(id.startsWith(found!.nation)).toBe(true);
    }
  });
});

// ─── Medical & dental awards vs cited source ─────

describe('medical & dental awards (vs cited fixture)', () => {
  const rows = parseCsv('medical-awards.csv');

  it.each(rows)(
    '$nation $year $family award === source',
    (row) => {
      // Any scale in the family reaches the same award, so the lookup
      // is exercised through a real scale id rather than the family.
      const scale = SCALE_IN_FAMILY[row.family as AwardFamily];
      const award = awardsFor(row.nation as Nation, scale).find(
        (a) => a.year === (row.year as TaxYear),
      );
      expect(award).toBeDefined();
      expect(award?.pct).toBe(Number(row.pct));
      expect(award?.effectiveFrom).toBe(row.effective_from);
      expect(award?.expectedInPay).toBe(
        row.expected_in_pay === '' ? undefined : row.expected_in_pay,
      );
      // Provenance is asserted, not just carried: an award whose
      // instrument drifts from its cited source fails here.
      expect(award?.source.issuer).toBe(row.issuer);
      expect(award?.source.reference).toBe(row.reference);
      expect(award?.source.url).toBe(row.url);
      expect(award?.source.issued).toBe(row.issued);
    },
  );

  // Absence is load-bearing, not an oversight: consumers branch on it
  // to tell "announced, scales pending" from "nothing announced", so a
  // stray row would silently change what four pages assert.
  it('records no resident award for Scotland', () => {
    // Settled separately under the BMA agreement and promulgated via
    // PCS(DD)2026/01, which prints scale points and no percentage.
    expect(awardsFor('scotland', 'resident')).toHaveLength(0);
  });

  it('records no 2026-27 medical award for Northern Ireland', () => {
    for (const scale of ['consultant', 'resident', 'salaried-dental']) {
      expect(
        awardsFor('northern-ireland', scale as PayScaleId),
      ).toHaveLength(0);
    }
  });
});

// ─── Award coverage vs cited source ──────────────

describe('award coverage (vs cited fixture)', () => {
  const rows = parseCsv('award-coverage.csv');

  // The compiler proves the map is TOTAL; it cannot prove any entry is
  // RIGHT. These rows pin the classifications a reader would have to
  // check against the announcements — including the three a
  // reader-facing "dental" grouping gets wrong.
  it.each(rows)('$scale is covered by $family', (row) => {
    const [award] = awardsFor('england', row.scale as PayScaleId);
    expect(award?.family).toBe(row.family);
  });

  it('every AfC band reaches the same award', () => {
    // The eleven identical coverage rows earn their place here: one
    // NHSPRB award covers every band, and this is what checks it.
    const pcts = new Set(
      AFC_BAND_IDS.map(
        (band) => awardsFor('england', band)[0]?.pct,
      ),
    );
    expect(pcts.size).toBe(1);
    expect([...pcts][0]).toBe(afcAward('2026-27', 'england').pct);
  });

  it('a family knows the scales it covers', () => {
    const [consultantAward] = awardsFor('england', 'consultant');
    expect(consultantAward?.covers).toContain('consultant');
    expect(consultantAward?.covers).toContain('specialty-doctor');
    // …and does NOT reach into another family's scales.
    expect(consultantAward?.covers).not.toContain('resident');
  });
});

// ─── Forthcoming changes ─────────────────────────

describe('forthcoming changes', () => {
  // The arm that exists so a page can say "a further change is coming"
  // without inventing a figure. The absence of `pct` is the guarantee,
  // so it is asserted rather than assumed.
  it('England residents have an agreed change with no percentage', () => {
    const forthcoming = changesFor('england', 'resident')
      .filter((c) => c.kind === 'forthcoming');
    expect(forthcoming).toHaveLength(1);
    expect(forthcoming[0]).not.toHaveProperty('pct');
    expect(forthcoming[0].source.url).toContain('gov.uk');
    // A forthcoming row dates itself to the phase still to come:
    // April 2026 is in the scales via PC(M&D) 1/2026 R2, April 2027
    // is not.
    expect(forthcoming[0].effectiveFrom).toBe('2027-04-01');
  });

  it('Wales residents have a contract replacement, unphased', () => {
    const [change] = changesFor('wales', 'resident')
      .filter((c) => c.kind === 'forthcoming');
    expect(change.effectiveFrom).toBe('2026-08-01');
    // Its later cohorts are given as years, not dates — so no invented
    // phase dates.
    // Cited to the circular that introduces the contract, not to
    // commentary about it. Asserted on the reference, which is the
    // document's identity, rather than on the URL's host: a host
    // check would pass for any page on the right domain and fail the
    // moment a link is legitimately re-pointed.
    expect(change.source.reference).toBe('circular M&D(W) 01/2026');
    expect(change.source.url).toContain('md-w-0126-pay-award');
  });

  it('a settled award and a forthcoming change coexist', () => {
    // England residents have BOTH: the 3.5% DDRB award that IS in the
    // scales, and the offer that is not. A caller must narrow.
    const changes = changesFor('england', 'resident');
    expect(changes.filter((c) => c.kind === 'settled')).toHaveLength(1);
    expect(changes.filter((c) => c.kind === 'forthcoming'))
      .toHaveLength(1);
  });

  it('awardsFor never returns a forthcoming change', () => {
    // changesFor holds both arms for this scale, so if awardsFor were
    // filtering wrongly it would show up as a differing length here.
    expect(changesFor('england', 'resident')).toHaveLength(2);
    const awards = awardsFor('england', 'resident');
    expect(awards).toHaveLength(1);
    expect(awards[0].kind).toBe('settled');
    expect(awards[0].pct).toBe(3.5);
  });

  it('a consultant has no forthcoming change', () => {
    expect(
      changesFor('england', 'consultant')
        .filter((c) => c.kind === 'forthcoming'),
    ).toHaveLength(0);
  });
});

// ─── Forthcoming changes vs cited source ─────────

describe('forthcoming changes (vs cited fixture)', () => {
  const rows = parseCsv('forthcoming-changes.csv');

  it.each(rows)('$nation $family change === source', (row) => {
    const scale = SCALE_IN_FAMILY[row.family as AwardFamily];
    const [change] = changesFor(row.nation as Nation, scale)
      .filter((c) => c.kind === 'forthcoming');
    expect(change).toBeDefined();
    expect(change.effectiveFrom).toBe(row.effective_from);
    expect(change.source.issuer).toBe(row.issuer);
    expect(change.source.reference).toBe(row.reference);
    expect(change.source.url).toBe(row.url);
    expect(change.source.issued).toBe(row.issued);
  });
});

// ─── The invariant the coverage design rests on ──

describe('pay-scale id sets', () => {
  // AWARD_COVERAGE is keyed by a union of three id sets using COMPUTED
  // keys, so a future collision would not raise a duplicate-key error:
  // one entry would silently overwrite the other and a scale would be
  // misclassified. Nothing else in the design can drift; this can.
  it('the three id sets are pairwise disjoint', () => {
    const all = [
      ...AFC_BAND_IDS,
      ...MEDICAL_GRADE_IDS,
      ...DENTAL_GRADE_IDS,
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  it('coverage is total over every id, with none invented', () => {
    const rows = parseCsv('award-coverage.csv');
    const expected =
      AFC_BAND_IDS.length
      + MEDICAL_GRADE_IDS.length
      + DENTAL_GRADE_IDS.length;
    // Guards the fixture itself: an earlier version pinned 18 of 46 and
    // silently stopped covering the entries most in need of review.
    expect(rows).toHaveLength(expected);
  });
});

// ─── Employer contribution rates vs cited source ─

describe('employer pension rates (vs cited fixture)', () => {
  const rows = parseCsv('employer-rates.csv');

  it.each(rows)('$nation employer rate === source', (row) => {
    const emp = getEmployerPensionRate(row.nation as Nation);
    expect(emp.rate).toBe(Number(row.rate));
    expect(emp.adminLevy).toBe(Number(row.adminLevy));
    expect(emp.administrator).toBe(row.administrator);
  });
});

// ─── Source currency ─────────────────────────────

describe('sourceCurrency', () => {
  const TODAY = new Date('2026-09-02');

  // Every AfC award a page can render must say when a newer
  // instrument is due. `unknown` is not a neutral state: it renders
  // as "we cannot tell you how fresh this is".
  it.each(['england', 'wales', 'scotland', 'northern-ireland'] as const)(
    '%s AfC 2026-27 records when its successor is due',
    (nation) => {
      const award = awardsFor(nation, '5')
        .find((a) => a.year === '2026-27');
      expect(award?.source.nextExpected).toBeTruthy();
      expect(sourceCurrency(award!.source, TODAY))
        .not.toBe('unknown');
    });

  // NI's is deliberately in the past: a ministerial statement of
  // intent with no implementing circular. Recording the lapse is the
  // point — it locates the delay with the publisher rather than
  // letting the page imply the figure is settled.
  it('reports NI as lapsed, and says what is awaited', () => {
    const ni = awardsFor('northern-ireland', '5')
      .find((a) => a.year === '2026-27');
    expect(sourceCurrency(ni!.source, TODAY)).toBe('lapsed');
    expect(ni!.source.nextExpectedReason)
      .toMatch(/HSC \(AfC\) pay circular/);
  });

  it('the other three are current', () => {
    for (const n of ['england', 'wales', 'scotland'] as const) {
      const a = awardsFor(n, '5').find((x) => x.year === '2026-27');
      expect(sourceCurrency(a!.source, TODAY)).toBe('current');
    }
  });

  // Absence of a date must never read as currency.
  it('an undated source is unknown, never current', () => {
    expect(
      sourceCurrency(
        {issuer: 'x', reference: 'y', url: 'z', issued: '2026-01-01'},
        TODAY,
      ),
    ).toBe('unknown');
  });
});
