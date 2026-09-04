/**
 * NHS pension contributions: member tier types, the
 * `PensionTiers` lookup value object, the per-scheme member
 * tier tables (NHSBSA for England & Wales, SPPA for Scotland,
 * HSC for Northern Ireland), and the per-nation employer
 * contribution rates.
 *
 * Member-tier sources are cited per table below and pinned in
 * tests/fixtures/pension-tiers.csv; employer rates carry their
 * own `EmployerPensionRate.source` per nation.
 */

import type {Nation, TaxYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, TAX_YEARS} from '@casomoltd/paye-calc';
import type {SalaryRange} from './values.js';
import {PensionTiersUnavailable} from './errors.js';

export interface PensionTier extends SalaryRange {
  tier: number;
  rate: number;
}

/**
 * Employer pension contribution for one of the UK's three NHS
 * pension schemes, as fractions of pensionable pay.
 *
 * Unlike the member tiers, employer rates are set by periodic
 * scheme valuation rather than each tax year. All three current
 * rates took effect on 1 April 2024 (from the 2020 valuations)
 * and hold for 2025/26 and 2026/27; the 2024 valuations
 * determine the rates from 2027/28.
 */
export interface EmployerPensionRate {
  /** Employer contribution rate as a fraction of pensionable pay. */
  rate: number;
  /**
   * Separate administration levy charged on top of `rate`, as a
   * fraction of pensionable pay (0 where the scheme charges none).
   */
  adminLevy: number;
  /** Tax year (April start) the current rate took effect. */
  effectiveFrom: TaxYear;
  /** Scheme administrator. */
  administrator: string;
  /** Authoritative source URL for the figures. */
  source: string;
}

// England and Wales share the NHSBSA-administered scheme, so they
// share one rate; Scotland (SPPA) and NI (HSC) run their own.
// Each source must STATE the rate it backs, on a live page.
// NHSBSA's own year-stamped rates pages only describe the 14.38%
// collection split (the rest is paid centrally) and the 2024/25
// page now 403s; NHS Employers' article states the 23.7% rate
// and the 0.08% levy explicitly, so it carries the citation.
const NHSBSA_EMPLOYER_RATE: EmployerPensionRate = {
  rate: 0.237,
  adminLevy: 0.0008,
  effectiveFrom: TAX_YEARS.Y2024_25,
  administrator: 'NHSBSA',
  source:
    'https://www.nhsemployers.org/articles/nhs-pension-scheme-employer-contributions',
};

const EMPLOYER_PENSION_RATES: Record<
  Nation,
  EmployerPensionRate
> = {
  england: NHSBSA_EMPLOYER_RATE,
  wales: NHSBSA_EMPLOYER_RATE,
  scotland: {
    rate: 0.225,
    adminLevy: 0,
    effectiveFrom: TAX_YEARS.Y2024_25,
    administrator: 'SPPA',
    source:
      'https://pensions.gov.scot/nhs/employers/employer-contributions',
  },
  'northern-ireland': {
    rate: 0.232,
    adminLevy: 0,
    effectiveFrom: TAX_YEARS.Y2024_25,
    administrator: 'HSC Pension Service',
    // The page that states the 23.2% figure ("Your employer
    // contributes an amount equal to 23.2% of your pensionable
    // pay"), not the consultation that preceded the rate.
    source:
      'https://hscpensions.hscni.net/hsc-pension-scheme/hsc-pension-members-section/membership-contributions-pay/',
  },
};

/** Employer pension contribution for a nation's NHS scheme. */
export function getEmployerPensionRate(
  nation: Nation,
): EmployerPensionRate {
  return EMPLOYER_PENSION_RATES[nation];
}

/**
 * A member's pension contribution tier table, owning the
 * salary → tier / rate lookup. Wrap a tax year's tiers
 * (see {@link getPensionTiersVO}) and query it directly,
 * rather than re-scanning the array at each call site.
 */
export class PensionTiers {
  constructor(
    private readonly tiers: readonly PensionTier[],
  ) {}

  /** Contribution rate (%) for a salary; 0 if unbanded. */
  rateFor(salary: number): number {
    const match = this.tierFor(salary);
    return match ? match.band.rate * 100 : 0;
  }

  /**
   * Matching tier (1-based) and band for a salary, or
   * null when no band contains it.
   */
  tierFor(
    salary: number,
  ): {tier: number; band: PensionTier} | null {
    for (const band of this.tiers) {
      if (salary <= band.max) {
        return {tier: band.tier, band};
      }
    }
    return null;
  }
}

/**
 * Pension contribution rate (%) for a salary.
 */
export function pensionTierRate(
  salary: number,
  tiers: PensionTier[],
): number {
  return new PensionTiers(tiers).rateFor(salary);
}

/**
 * Look up the matching pension tier for a salary.
 * Returns tier number (1-based) and the tier band,
 * or null if no tiers are provided.
 */
export function lookupPensionTier(
  salary: number,
  tiers: PensionTier[],
): {tier: number; band: PensionTier} | null {
  return new PensionTiers(tiers).tierFor(salary);
}

// ── Member contribution tiers by scheme + year ──
//
// Three schemes, not one table per nation: England & Wales share
// NHSBSA; Scotland is SPPA; Northern Ireland is HSC. They share the
// tiered-contribution idea but publish their own thresholds AND
// rates, so the same salary can land in a different tier — and a
// different rate — by nation. Each rate is a source-cited transcription
// pinned in tests/fixtures/pension-tiers.csv.

/** The three NHS pension schemes across the UK. */
const PENSION_SCHEMES = {
  nhsbsa: 'nhsbsa', // England & Wales
  sppa: 'sppa', // Scotland
  hsc: 'hsc', // Northern Ireland
} as const;
type PensionScheme =
  (typeof PENSION_SCHEMES)[keyof typeof PENSION_SCHEMES];

const NATION_TO_SCHEME: Record<Nation, PensionScheme> = {
  [NATION_KEYS.england]: PENSION_SCHEMES.nhsbsa,
  [NATION_KEYS.wales]: PENSION_SCHEMES.nhsbsa,
  [NATION_KEYS.scotland]: PENSION_SCHEMES.sppa,
  [NATION_KEYS.northernIreland]: PENSION_SCHEMES.hsc,
};

// NHSBSA (England & Wales). Sources (member contribution rates),
// named as in docs/source-archive.md:
//   2025/26 "NHSBSA — contribution rates 2025/26"
//   2026/27 "NHSBSA — cost of being in the Scheme"
// Six tiers; rates unchanged year-on-year. Thresholds are re-based
// to CPI, NOT to the AfC award — NHSBSA states this explicitly for
// 2026/27, where the England award came in below CPI. (SPPA is the
// scheme that re-bases on its nation's award; see below.)
// Pinned in tests/fixtures/pension-tiers.csv.
const NHSBSA_2025_26: PensionTier[] = [
  {tier: 1, min: 0, max: 13259, rate: 0.052},
  {tier: 2, min: 13260, max: 27797, rate: 0.065},
  {tier: 3, min: 27798, max: 33868, rate: 0.083},
  {tier: 4, min: 33869, max: 50845, rate: 0.098},
  {tier: 5, min: 50846, max: 65190, rate: 0.107},
  {tier: 6, min: 65191, max: Infinity, rate: 0.125},
];

const NHSBSA_2026_27: PensionTier[] = [
  {tier: 1, min: 0, max: 13259, rate: 0.052},
  {tier: 2, min: 13260, max: 28854, rate: 0.065},
  {tier: 3, min: 28855, max: 35155, rate: 0.083},
  {tier: 4, min: 35156, max: 52778, rate: 0.098},
  {tier: 5, min: 52779, max: 67668, rate: 0.107},
  {tier: 6, min: 67669, max: Infinity, rate: 0.125},
];

// SPPA (Scotland). Nine tiers; rates differ from NHSBSA and are
// unchanged year-on-year, thresholds re-based to the AfC award (Table 2
// — bands in the current scheme year's terms, applied to a member's
// current-year annualised pensionable pay). Pinned in
// tests/fixtures/pension-tiers.csv.
//   2025/26: "SPPA, NHS Circular 2025/07" (3 Jul 2025), Table 2
//   2026/27: "SPPA, NHS Circular 2026/03" (9 Mar 2026), Table 2
//   Both in docs/source-archive.md.
//
// "Re-based to the AfC award" is SPPA's own stated mechanism, and it is
// NOT CPI — the odd one out against NHSBSA and HSC above. Its 2023
// consultation response committed to uprating the tiers "in line with
// the average Agenda for Change (AfC) pay award", restated in both
// circulars. That is why five of the nine floors sit exactly on AfC pay
// points: the points and the thresholds move by the same percentage, so
// a threshold anchored to a point stays on it.
//
// THREE THINGS A READER OF THIS TABLE SHOULD KNOW.
//
// 1. The 2025-26 bands were NOT superseded when the AfC award for that
//    year was revised from 4.25% to 4.4%, and this table is right.
//    Circular 2025/07 was never reissued or withdrawn; its PDF is unchanged
//    since publication and SSI 2015/94 reg 30(3C) — inserted by
//    SSI 2025/259, in force 31 Oct 2025 — still carries this exact
//    4.25%-based series, with no outstanding effects recorded against
//    it. The revised 2025/26 values exist, but as Table 1 of the
//    FOLLOWING year's circular (2026/03), effective 1 April 2026.
//    The tell is that Table 1 of year N+1 normally equals Table 2 of
//    year N and here it does not; that divergence IS the revision.
//
// 2. Both tables here are Table 2. SPPA publishes two per circular —
//    Table 1 assesses on the PREVIOUS year's earnings and covers most
//    members, Table 2 on the current year's and covers new starters
//    and job changers. We model Table 2 only, which is the choice the
//    rest of this file makes for every scheme. For 2025/26 the two
//    genuinely disagree (~£41 at the tier-3 floor) because of the
//    revision above — the only year the identity breaks. No rendered
//    figure is affected: all 25 revised Scottish pay points were
//    checked and none lands in a different tier.
//
// 3. WHY two tables exist at all, and what it implies for every figure
//    in this file. An AfC award takes effect on 1 April but reaches
//    payroll months later, so a member's actual earnings in an award
//    year are not the annual scale figure: old-rate months, then a
//    lump of arrears. Backdating makes the annual GROSS whole and
//    still leaves the monthly pattern nothing like scale ÷ 12. That
//    gap is precisely why SPPA needs one table assessed on the
//    PREVIOUS year's earnings beside one assessed on the current
//    year's — the scale and what a member was actually paid are
//    different quantities, and the scheme has to say which it means.
//
//    This library models the SCALE. A tier here answers "what would
//    this salary contribute", never "what did this member pay in a
//    year when the uplift landed in September". A consumer stating an
//    annual figure is stating the scale, and should not imply it is
//    what reached a bank account.
const SPPA_2025_26: PensionTier[] = [
  {tier: 1, min: 0, max: 13330, rate: 0.057},
  {tier: 2, min: 13331, max: 27899, rate: 0.064},
  {tier: 3, min: 27900, max: 33015, rate: 0.07},
  {tier: 4, min: 33016, max: 41423, rate: 0.087},
  {tier: 5, min: 41424, max: 43440, rate: 0.098},
  {tier: 6, min: 43441, max: 52803, rate: 0.105},
  {tier: 7, min: 52804, max: 57140, rate: 0.112},
  {tier: 8, min: 57141, max: 79910, rate: 0.116},
  {tier: 9, min: 79911, max: Infinity, rate: 0.127},
];

const SPPA_2026_27: PensionTier[] = [
  {tier: 1, min: 0, max: 13330, rate: 0.057},
  {tier: 2, min: 13331, max: 28987, rate: 0.064},
  {tier: 3, min: 28988, max: 34302, rate: 0.07},
  {tier: 4, min: 34303, max: 43038, rate: 0.087},
  {tier: 5, min: 43039, max: 45134, rate: 0.098},
  {tier: 6, min: 45135, max: 54862, rate: 0.105},
  {tier: 7, min: 54863, max: 59369, rate: 0.112},
  {tier: 8, min: 59370, max: 83026, rate: 0.116},
  {tier: 9, min: 83027, max: Infinity, rate: 0.127},
];

// HSC (Northern Ireland). Source: "HSC Pensions NI — member
// contributions" — see docs/source-archive.md.
// Six tiers; rates higher than NHSBSA in tiers 2-6. HSC sets its own
// thresholds AND rates — the 2025/26 bands differ from NHSBSA
// 2025/26 — and re-bases them to CPI, as NHSBSA does.
const HSC_2025_26: PensionTier[] = [
  {tier: 1, min: 0, max: 13259, rate: 0.052},
  {tier: 2, min: 13260, max: 27288, rate: 0.067},
  {tier: 3, min: 27289, max: 33247, rate: 0.085},
  {tier: 4, min: 33248, max: 49913, rate: 0.1},
  {tier: 5, min: 49914, max: 63994, rate: 0.109},
  {tier: 6, min: 63995, max: Infinity, rate: 0.127},
];

const HSC_2026_27: PensionTier[] = [
  {tier: 1, min: 0, max: 13259, rate: 0.052},
  {tier: 2, min: 13260, max: 28854, rate: 0.067},
  {tier: 3, min: 28855, max: 35155, rate: 0.085},
  {tier: 4, min: 35156, max: 52778, rate: 0.1},
  {tier: 5, min: 52779, max: 67668, rate: 0.109},
  {tier: 6, min: 67669, max: Infinity, rate: 0.127},
];

const PENSION_TIERS_BY_SCHEME: Record<
  PensionScheme,
  Partial<Record<TaxYear, PensionTier[]>>
> = {
  [PENSION_SCHEMES.nhsbsa]: {
    [TAX_YEARS.Y2025_26]: NHSBSA_2025_26,
    [TAX_YEARS.Y2026_27]: NHSBSA_2026_27,
  },
  [PENSION_SCHEMES.sppa]: {
    [TAX_YEARS.Y2025_26]: SPPA_2025_26,
    [TAX_YEARS.Y2026_27]: SPPA_2026_27,
  },
  [PENSION_SCHEMES.hsc]: {
    [TAX_YEARS.Y2025_26]: HSC_2025_26,
    [TAX_YEARS.Y2026_27]: HSC_2026_27,
  },
};

/**
 * The NHS pension scheme a nation's staff belong to, and the
 * document that publishes its member contribution tiers.
 *
 * Named separately from {@link EmployerPensionRate} because the two
 * answer different questions and cite different documents: that one
 * carries what the employer pays, this one identifies the scheme a
 * reader is actually in and cites the tiers {@link getPensionTiers}
 * returns.
 */
export interface NhsPensionScheme {
  /** Scheme name as its own administrator publishes it. */
  name: string;
  /** Body that administers the scheme. */
  administrator: string;
  /**
   * The document stating the member contribution rates for this
   * year. Year-aware because the tiers are: SPPA republishes a
   * circular per year, so citing a single page would date.
   */
  source: string;
}

const NHSBSA_MEMBER_RATES =
  'https://www.nhsbsa.nhs.uk/member-hub/cost-being-scheme';

// HSC keeps only the CURRENT year's table on its standing page
// and moves the prior year to a sub-page, so the two years cite
// different URLs — a single link would stop stating the figure
// it is cited for the moment the year rolls.
const HSC_MEMBER_RATES_2026_27 =
  'https://hscpensions.hscni.net/hsc-pension-scheme'
  + '/hsc-pension-members-section/membership-contributions-pay/';

// Written out, not derived from the line above: repointing the
// standing page at a later year would otherwise silently drag this
// one with it. The slug reads "23-24" because HSC files each
// superseded table under the year the sub-page was first created,
// not the year the rates apply to.
const HSC_MEMBER_RATES_2025_26 =
  'https://hscpensions.hscni.net/hsc-pension-scheme'
  + '/hsc-pension-members-section/membership-contributions-pay'
  + '/23-24-contribution-rates/';

// Per-year member-rate citations, matching the tier tables above.
// NHSBSA and HSC state every year's tiers on one standing page;
// SPPA issues a circular per year (see docs/source-archive.md
// SA-17 / SA-18), so Scotland's citation moves with the year.
const SCHEME_SOURCES: Record<
  PensionScheme, Partial<Record<TaxYear, string>>
> = {
  [PENSION_SCHEMES.nhsbsa]: {
    [TAX_YEARS.Y2025_26]: NHSBSA_MEMBER_RATES,
    [TAX_YEARS.Y2026_27]: NHSBSA_MEMBER_RATES,
  },
  [PENSION_SCHEMES.sppa]: {
    [TAX_YEARS.Y2025_26]:
      'https://pensions.gov.scot/sites/default/files/2025-07'
      + '/NHS_Circular_2025-07_Employee_contribution_tiers'
      + '_2025-26.pdf',
    [TAX_YEARS.Y2026_27]:
      'https://pensions.gov.scot/sites/default/files/2026-03'
      + '/2026_03_-_NHS_Employee_contribution_tier_bandings'
      + '_from_1_April_2026.pdf',
  },
  [PENSION_SCHEMES.hsc]: {
    [TAX_YEARS.Y2025_26]: HSC_MEMBER_RATES_2025_26,
    [TAX_YEARS.Y2026_27]: HSC_MEMBER_RATES_2026_27,
  },
};

const SCHEME_NAMES: Record<
  PensionScheme, {name: string; administrator: string}
> = {
  [PENSION_SCHEMES.nhsbsa]: {
    name: 'NHS Pension Scheme',
    administrator: 'NHSBSA',
  },
  [PENSION_SCHEMES.sppa]: {
    name: 'NHS Superannuation Scheme (Scotland)',
    administrator: 'Scottish Public Pensions Agency',
  },
  [PENSION_SCHEMES.hsc]: {
    name: 'HSC Pension Scheme',
    administrator: 'HSC Pension Service',
  },
};

/**
 * The scheme a nation's NHS staff contribute to for a tax year,
 * with the citation for that year's member tiers. Throws
 * {@link PensionTiersUnavailable} for a year the scheme has not
 * published, so a caller can never render a rate beside a
 * citation that does not cover it.
 */
export function getPensionScheme(
  year: TaxYear,
  nation: Nation,
): NhsPensionScheme {
  const scheme = NATION_TO_SCHEME[nation];
  const source = SCHEME_SOURCES[scheme][year];
  if (!source) {
    throw new PensionTiersUnavailable(year, nation);
  }
  return {...SCHEME_NAMES[scheme], source};
}

/**
 * Member pension contribution tiers for a nation and tax year.
 *
 * The three schemes (NHSBSA for England & Wales, SPPA for Scotland,
 * HSC for Northern Ireland) publish independent tier tables — their
 * thresholds AND rates differ — so the nation is required; there is
 * no UK-wide default. Throws {@link PensionTiersUnavailable} for an
 * unpublished combination rather than substituting another scheme's
 * or year's figures.
 */
export function getPensionTiers(
  year: TaxYear,
  nation: Nation,
): PensionTier[] {
  const tiers =
    PENSION_TIERS_BY_SCHEME[NATION_TO_SCHEME[nation]][year];
  if (!tiers) {
    throw new PensionTiersUnavailable(year, nation);
  }
  return tiers;
}

/**
 * {@link PensionTiers} value object for a nation and tax year —
 * the same data as {@link getPensionTiers}, ready to query.
 */
export function getPensionTiersVO(
  year: TaxYear,
  nation: Nation,
): PensionTiers {
  return new PensionTiers(getPensionTiers(year, nation));
}
