/**
 * Per-nation AfC scale tables: that each nation resolves to its own
 * transcribed ladder, and that the four do not silently share one.
 */

import {describe, it, expect} from 'vitest';
import type {
  DocumentSource, Nation, YearLabel,
} from '../src/index.js';
import {NATIONS} from '@casomoltd/paye-calc';
import {
  isAwaitingPayAward,
  payYearLag,
  assertPayYearLagIsSane,
  NLW_HOURLY,
  getAfcScales,
  WALES_LIVING_WAGE,
  afcScaleSource,
  AFC_ENGLAND_SCALES_2025,
  AFC_ENGLAND_SCALES_2026,
  AFC_NI_2025,
  AFC_SCOTLAND,
  AFC_W_02_2025,
  AFC_W_02_2026,
  afcPayYears,
  ScaleUnavailable,
  afcAward,

  afcResolver,
} from '../src/index.js';
import {parseCsv} from './helpers.js';

describe('getAfcScales nation param', () => {
  // Per-nation salary values are pinned to the cited
  // pay-scales.csv fixture below; these cases cover
  // structure and cross-nation relationships only.
  it('Scotland B8a has 2 points', () => {
    const {bands} =
      getAfcScales('2026-27', 'scotland');
    const b8a = bands.find(
      (b) => b.band === '8a',
    );
    expect(b8a?.points).toHaveLength(2);
  });

  it('Scotland differs from England', () => {
    const sco =
      getAfcScales('2025-26', 'scotland');
    const eng = getAfcScales('2025-26', 'england');
    const scoB5 = sco.bands.find(
      (b) => b.band === '5',
    );
    const engB5 = eng.bands.find(
      (b) => b.band === '5',
    );
    expect(scoB5?.salary.min).not.toBe(
      engB5?.salary.min,
    );
  });

  // Both figures the pay letter publishes, re-typed from it rather
  // than read off each other: AfC(W) 01/2026 (#sa-14) states £13.45
  // an hour in its Action paragraph and £26,300 as the FTE base in
  // its spine-point table. Deriving either from the other lands on a
  // number the letter does not print.
  it('carries both published living-wage figures', () => {
    const wage = WALES_LIVING_WAGE['2026-27'];
    expect(wage?.hourly).toBe(13.45);
    expect(wage?.annual).toBe(26300);
  });

  // Exact, not `>=`: a floor comparison passes for any figure above it,
  // including a wrong one. Both of Band 2's points sit ON the floor the
  // AfC(W) 01/2026 pay letter states.
  it('Wales B2 is exactly the living-wage floor in 2026-27', () => {
    const {bands} =
      getAfcScales('2026-27', 'wales');
    const b2 = bands.find((b) => b.band === '2');
    expect(b2?.points.map((p) => p.salary))
      .toEqual([26300, 26300]);
  });
});

describe('Wales publishes its own ladder', () => {
  const YEAR = '2026-27';

  // Wales's ladder is its own, ~1.5% above England at every band
  // from 4 up. Exact figures, not a `>` comparison: the latter
  // passes for any Welsh number above England's, including one
  // that is wrong by thousands. Source: AfC(W) 02/2026 Annex 1.
  it.each([
    ['4', 31626, 31157],
    ['5', 39631, 39043],
    ['6', 48841, 48117],
    ['7', 57365, 56515],
    ['8a', 65723, 64750],
    ['9', 131732, 129783],
  ])('Band %s tops at Wales £%i vs England £%i',
    (id, wales, england) => {
      const top = (n: Nation) =>
        getAfcScales(YEAR, n).bands
          .find((b) => b.band === id)?.points.at(-1)?.salary;
      expect(top('wales')).toBe(wales);
      expect(top('england')).toBe(england);
    });

  // A floor lifts the bottom of a ladder and cannot raise its
  // top, so Band 9 is the clinching case: £131,732 against
  // England's £129,783, both years' figures read from each
  // nation's own circular.
  it('is higher at Band 9 top, which no floor could explain', () => {
    const top = (n: 'wales' | 'england') =>
      getAfcScales(YEAR, n).bands
        .find((b) => b.band === '9')?.points.at(-1)?.salary;
    expect(top('wales')).toBe(131732);
    expect(top('england')).toBe(129783);
  });

  // Band 2's SHAPE is the same in both nations and only its cash
  // differs. Both publishers print an entry point, a two-year
  // progression interval and a top point, and in both nations the wage
  // floor has compressed the two to one figure — so a difference in
  // point COUNT here would be our modelling, not the publishers'.
  it('publishes Band 2 as two points in both nations', () => {
    const band2 = (n: 'wales' | 'england') =>
      getAfcScales(YEAR, n).bands.find((b) => b.band === '2')?.points ?? [];
    for (const n of ['wales', 'england'] as const) {
      const points = band2(n);
      expect(points).toHaveLength(2);
      expect(points[0].salary).toBe(points[1].salary);
      expect(points.map((p) => p.label)).toEqual(['Year 1', 'Year 3+']);
    }
    expect(band2('wales')[0].salary).not.toBe(band2('england')[0].salary);
  });
});

// ── Pin every figure to its published source ────────
//
// The pay tables are transcribed from their published
// sources (England: NHS Employers; Scotland: circular
// PCS(AFC)2026/1). This asserts getAfcScales matches
// that fixture row-for-row — code-vs-source, not
// code-vs-code — so a bad re-transcription (a whole table
// on a wrong uplift factor stays internally consistent and
// passes every code-vs-code check) fails HERE instead of
// shipping. The fixture cites each row's source.
const scaleRows = parseCsv('pay-scales.csv');

/**
 * The fixture's `source` column as a human writes it, mapped to the
 * record the library should carry. A lookup rather than a string
 * match, so the CSV keeps naming documents the way the publishers do
 * and the test still asserts IDENTITY.
 */
const AFC_FIXTURE_SOURCES: Record<string, DocumentSource> = {
  'Pay scales for 2025/26': AFC_ENGLAND_SCALES_2025,
  'Pay scales for 2026/27': AFC_ENGLAND_SCALES_2026,
  'HSC (AfC) 06/2025': AFC_NI_2025,
  'PCS(AFC)2026/1': AFC_SCOTLAND,
  'AfC(W) 02/2025': AFC_W_02_2025,
  'AfC(W) 02/2026': AFC_W_02_2026,
};

describe('code matches the cited pay-scales fixture', () => {
  it.each(scaleRows)(
    '$nation $taxYear band $band $point',
    (row) => {
      const {bands} = getAfcScales(
        row.taxYear as YearLabel, row.nation as Nation,
      );
      const band = bands.find((b) => b.band === row.band);
      const point = band?.points.find(
        (p) => p.label === row.point,
      );
      expect(point?.salary).toBe(Number(row.salary));
      // Provenance is asserted, not merely carried. Northern Ireland
      // is the row this exists for: its salaries are England's and its
      // citation must not be, so a table that quietly cited England's
      // page under an NI heading would pass on salary alone.
      expect(band?.source).toBe(AFC_FIXTURE_SOURCES[row.source]);
    },
  );
});

// The statutory floor the AfC chart draws its reference line
// from. Re-typed from the publisher rather than read back from
// the constant, and pinned per year because the rate changes
// every April: an entry that silently keeps last April's figure
// is the failure this guards, and it renders as a wage line a
// reader compares their band against.
// Source: "GOV.UK — national minimum wage rates" (#sa-30).
describe('National Living Wage', () => {
  it.each([
    ['2025-26', 12.21],
    ['2026-27', 12.71],
  ] as const)('%s is £%s an hour', (year, hourly) => {
    expect(NLW_HOURLY[year]).toBe(hourly);
  });
});

describe('Northern Ireland', () => {
  // NI publishes ONE year. The Health Minister stated a desire to
  // proceed with 3.3% for 2026/27 on 12 February 2026, subject to his
  // budgetary position; it is unfunded, no implementing circular has
  // been issued and no payment date has been announced. HSC staff are
  // paid on HSC (AfC) 06/2025.
  it('publishes only the year it has actually published', () => {
    expect(afcPayYears('northern-ireland')).toEqual(['2025-26']);
    expect(() => getAfcScales('2026-27', 'northern-ireland'))
      .toThrow(ScaleUnavailable);
  });

  // Serving England's 2026-27 table under NI would show a reader a
  // salary they are not paid — £1,024 out at Band 5 entry. This is the
  // guard against putting it back.
  it('does not serve England\'s unimplemented year', () => {
    const eng = getAfcScales('2026-27', 'england')
      .bands.find((b) => b.band === '5');
    const ni = getAfcScales('2025-26', 'northern-ireland')
      .bands.find((b) => b.band === '5');
    expect(ni?.points[0].salary).toBe(31049);
    expect(eng?.points[0].salary).toBe(32073);
    expect(eng!.points[0].salary - ni!.points[0].salary).toBe(1024);
  });

  it('carries England\'s salaries for the year it does publish', () => {
    const ni = getAfcScales('2025-26', 'northern-ireland');
    const eng = getAfcScales('2025-26', 'england');
    expect(ni.hcas).toEqual(eng.hcas);
    // Compared as SETS of salaries per band, because the shape can
    // legitimately differ where the publishers differ (see Band 2).
    expect(ni.bands.map((b) => ({
      band: b.band,
      salaries: [...new Set(b.points.map((p) => p.salary))],
    }))).toEqual(eng.bands.map((b) => ({
      band: b.band,
      salaries: [...new Set(b.points.map((p) => p.salary))],
    })));
  });

  // HSC (AfC) 06/2025 prints Bands 1 and 2 in its Basic Pay block as
  // single flat figures; its entry / interval / top table starts at
  // Band 3. England's publisher prints Band 2 with two step points.
  it('publishes Band 2 as ONE point, where England publishes two', () => {
    const ni = getAfcScales('2025-26', 'northern-ireland')
      .bands.find((b) => b.band === '2');
    const eng = getAfcScales('2025-26', 'england')
      .bands.find((b) => b.band === '2');
    expect(ni?.points).toHaveLength(1);
    expect(eng?.points).toHaveLength(2);
    expect(ni?.points[0].salary).toBe(eng?.points[0].salary);
  });

  it('cites its own document, never England\'s', () => {
    const ni = afcScaleSource('2025-26', 'northern-ireland');
    expect(ni).not.toEqual(afcScaleSource('2025-26', 'england'));
    expect(ni.issuer).toBe('the Department of Health (NI)');
    expect(ni.reference).toBe('HSC (AfC) 06/2025');
  });

  // `fromPoint` is now the preferred accessor, and it takes a point
  // the caller is holding — so it must check the point is on the scale
  // it was asked to resolve. Without that, the England table a reader
  // was shown a moment ago resolves cleanly under a Northern Ireland
  // heading, which is the substitution the per-nation tables exist to
  // prevent.
  it('refuses a point that belongs to another nation or year', () => {
    const ni = getAfcScales('2025-26', 'northern-ireland')
      .bands.find((b) => b.band === '5')!;
    const englandNextYear = getAfcScales('2026-27', 'england')
      .bands.find((b) => b.band === '5')!;

    expect(
      afcResolver.fromPoint(
        '5', ni.points[0], 'ni', '2025-26', '2025-26',
      ).salary,
    ).toBe(ni.points[0].salary);

    expect(() =>
      afcResolver.fromPoint(
        '5', englandNextYear.points[0], 'ni', '2025-26', '2025-26',
      ),
    ).toThrow(ScaleUnavailable);
  });

  // The AWARD is announced even though no scale is published — the two
  // are different things, and keeping them apart is what lets a page
  // say "3.3% is coming" while showing the rates actually in payment.
  it('records the announced award with no scale to go with it', () => {
    const award = afcAward('2026-27', 'northern-ireland');
    expect(award.pct).toBe(3.3);
    expect(award.effectiveFrom).toBe('2026-04-01');
    // No payment date has been announced, so we state none.
    expect(award.expectedInPay).toBeUndefined();
    expect(award.source.currencyAt(new Date('2026-09-03')))
      .toBe('lapsed');
    expect(award.source.nextExpectedReason)
      .toMatch(/HSC \(AfC\) pay circular/);
  });
});

/**
 * The pay year / tax year relationship, as a rule rather than as four
 * facts that happen to hold today.
 *
 * A salary comes from an AfC round; the deductions applied to it come
 * from the tax year it is paid in. Those normally name the same year,
 * which is why one value was used for both for so long — and why the
 * day they diverged, nothing complained and a Northern Ireland reader
 * was priced against a pension tier table nobody is using.
 */
describe('pay year vs tax year', () => {
  it('every nation is within one year of the tax year in force', () => {
    // The assert itself, run where a transcription gap should surface.
    expect(() => assertPayYearLagIsSane()).not.toThrow();
  });

  it('states the lag for each nation, and it is legitimate', () => {
    for (const nation of Object.keys(NATIONS) as Nation[]) {
      const lag = payYearLag(nation);
      // -1 = a round published before its tax year began.
      //  0 = the award is implemented.
      //  1 = the award for this year is not yet in payment.
      expect(lag).toBeGreaterThanOrEqual(-1);
      expect(lag).toBeLessThanOrEqual(1);
    }
  });

  // Guard the premise. If every nation were level this suite would
  // pass while proving nothing, which is the state it was written to
  // stop being invisible.
  it('at least one nation is actually behind right now', () => {
    const behind = (Object.keys(NATIONS) as Nation[])
      .filter(isAwaitingPayAward);
    expect(behind).toContain('northern-ireland');
    expect(payYearLag('northern-ireland')).toBe(1);
    expect(payYearLag('england')).toBe(0);
  });

  it('isAwaitingPayAward agrees with the lag it derives from', () => {
    for (const nation of Object.keys(NATIONS) as Nation[]) {
      expect(isAwaitingPayAward(nation))
        .toBe(payYearLag(nation) > 0);
    }
  });
});
