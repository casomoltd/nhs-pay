/**
 * Post — an immutable salaried NHS post: a person on a
 * salary, in a nation and tax year, contributing to the
 * NHS pension. Take-home, pension rate and contribution
 * are all *derived* from it.
 *
 * A façade: every derived value delegates to the existing
 * NHS modules ({@link nhsTakeHome}, {@link PensionTiers});
 * nothing is absorbed here. A Post never mutates — change
 * a value by building a new one (see {@link Post.withSalary},
 * {@link Post.withAdjustments}).
 */

import {nationToTaxRegion} from '@casomoltd/paye-calc';
import type {
  Nation,
  PayYear,
  TaxYear,
  TakeHomePay,
  StudentLoanPlan,
  TaxCode,
} from '@casomoltd/paye-calc';
import {getPensionTiersVO} from './pension.js';
import {nhsTakeHome} from './take-home.js';
import type {Role} from './role.js';
import {awardsFor} from './award.js';
import type {DocumentSource} from './document-source.js';
import {afcScaleSource} from './scales.js';
import {ScaleUnavailable} from './errors.js';
import {getMedicalScales} from './medical-scales.js';
import {getDentalScales} from './dental-scales.js';
import type {PayAward, PayScaleId} from './award.js';

/** A grade's source from a published family table, failing loud where
 *  the table exists but the grade is not in it — the same contract the
 *  AfC branch gets from `afcScaleSource`. */
function gradeSource<G extends string>(
  metas: readonly {grade: G; source: DocumentSource}[],
  grade: G,
  identity: {nation: Nation; payYear: PayYear},
): DocumentSource {
  const meta = metas.find((m) => m.grade === grade);
  if (!meta) {
    throw new ScaleUnavailable(
      identity.nation, identity.payYear, grade,
    );
  }
  return meta.source;
}

/** The scale id a role names, or `undefined` for an off-scale post. */
function scaleOf(role: Role): PayScaleId | undefined {
  switch (role.kind) {
    case 'afc':
      return role.band;
    case 'medical':
    case 'dental':
      return role.grade;
    case 'vsm':
      return undefined;
  }
}

/** The tax/NI/pension context that fixes a Post. */
export interface PostIdentity {
  readonly nation: Nation;
  /**
   * The year whose tax, NI and pension-tier thresholds apply.
   *
   * The year the money is PAID IN, which is not always the year the
   * salary was published in — see {@link PostIdentity.payYear}.
   */
  readonly taxYear: TaxYear;
  /**
   * The year the SALARY was published in, where that differs from
   * {@link PostIdentity.taxYear}. Defaults to `taxYear`.
   *
   * The two are the same whenever a nation's pay round lands inside
   * its own year, which is why one field carried both for so long.
   * They separate the moment a round runs late: Northern Ireland's
   * staff are paid 2025-26 salaries during the 2026-27 tax year, and
   * they contribute at the 2026-27 tier because contribution tiers
   * are set by the SCHEME year, not by which round their salary came
   * from. Collapsing the two overstated the deduction on four of
   * Northern Ireland's pay points, the largest by 1.8 points of
   * salary.
   *
   * REQUIRED. It was optional, falling back to `taxYear`, which
   * meant `post.payYear` could quietly answer with the tax year and
   * the two bases met again inside the accessor that exists to keep
   * them apart. Every construction path already knows both, so the
   * option bought nothing but a place for them to recombine.
   */
  readonly payYear: PayYear;
}

/**
 * Personal circumstances layered on a scale post that a bare
 * salary doesn't carry — part-time hours, salary sacrifice,
 * student loans, a tax-code override, and pension opt-out.
 * Every field defaults to "none" ({@link NO_ADJUSTMENTS}), so
 * an unadjusted Post behaves exactly as a plain scale salary.
 *
 * `studentLoans` and `taxCode` are paye-calc's own concerns —
 * a Post carries them so it can build a complete take-home, but
 * forwards them to the engine rather than re-implementing them.
 * `fte` and `salarySacrifice` shape {@link Post.pensionablePay}.
 */
export interface PostAdjustments {
  /**
   * Fraction of full-time hours worked; 1 = full-time. Since
   * 1 October 2022 the contribution tier and pension are based on
   * ACTUAL (pro-rated) pensionable pay, not whole-time-equivalent —
   * so FTE scales pensionable pay before the tier is chosen.
   * Source: "NHSBSA — employer pay & contributions" — see
   * docs/source-archive.md.
   */
  readonly fte: number;
  /**
   * Annual salary sacrificed (£). This field carries the NHS half
   * of the rule only: in the default NHS model (England/Wales, and
   * Scotland since December 2023) a sacrifice reduces PENSIONABLE
   * pay, dropping the contribution tier and the base it applies to.
   * NOT modelled: the Scotland carve-out where cycle-to-work and
   * childcare vouchers leave pensionable pay untouched. In any case
   * salary sacrifice is unavailable to most staff on standard AfC
   * contracts.
   * Sources: "NHSBSA 2015 Members' Guide V13" (#sa-38) and
   * "NHSBSA — cost of being in the Scheme" (#sa-20) — see
   * docs/source-archive.md.
   *
   * That a sacrifice also lowers the tax- and NI-assessable gross
   * is GENERIC PAYE, not NHS practice, and is paye-calc's rule to
   * state and to cite — it is applied there, by `PensionBasis
   * .SalarySacrifice`. Likewise OpRA (post-2017) valuation of
   * non-exempt benefits, which neither library models. This
   * library subtracts the sacrifice once, from pensionable pay,
   * and hands the reduced figure over; it should not carry a
   * second, borrowed citation for what happens next.
   */
  readonly salarySacrifice: number;
  /** Student-loan plans being repaid — forwarded to paye-calc. */
  readonly studentLoans: ReadonlySet<StudentLoanPlan>;
  /** Tax-code override (forwarded to paye-calc), or null to derive. */
  readonly taxCode: TaxCode | null;
  /** True when the member has opted out of the NHS pension. */
  readonly pensionOptedOut: boolean;
}

/** The identity adjustments: full-time, no sacrifice/loans/override, in-scheme. */
export const NO_ADJUSTMENTS: PostAdjustments = {
  fte: 1,
  salarySacrifice: 0,
  studentLoans: new Set(),
  taxCode: null,
  pensionOptedOut: false,
};

export class Post {
  private constructor(
    readonly identity: PostIdentity,
    readonly salary: number,
    readonly role: Role,
    readonly adjustments: PostAdjustments = NO_ADJUSTMENTS,
  ) {}

  /**
   * Build a Post from a gross salary — whatever the member
   * is actually paid, already adjusted for HCAS / floors
   * by the resolver. `salary` is the fundamental input;
   * everything else is derived.
   *
   * A bare salary is a `vsm` role (an off-scale post); a
   * scale-point resolver passes the scale identity instead.
   * Personal circumstances are added afterwards with
   * {@link Post.withAdjustments}.
   */
  static fromSalary(
    salary: number,
    nation: Nation,
    /** The year whose SCALE this salary was published on. */
    year: PayYear,
    /**
     * The year whose tax, NI and pension tiers apply.
     *
     * REQUIRED, and ahead of `role` for that reason. It defaulted to
     * the pay year once, and that default is the whole defect: a
     * caller who simply did not think about it got the salary's own
     * year, which priced a Northern Irish reader's 2025-26 pay at
     * 2025-26 deductions in the 2026-27 tax year. A default that is
     * right most of the time is worse than no default, because the
     * times it is wrong are exactly the times nobody is looking.
     */
    taxYear: TaxYear,
    role: Role = {kind: 'vsm'},
  ): Post {
    return new Post(
      {nation, taxYear, payYear: year}, salary, role,
    );
  }

  /**
   * Pensionable pay: the pay the NHS pension contribution rate/tier
   * are worked out on. Here = the FTE-pro-rated scale salary less any
   * pensionable-reducing salary sacrifice ({@link PostAdjustments.salarySacrifice}).
   *
   * We treat the whole scale salary (incl. HCAS) as pensionable and do
   * not model non-pensionable elements (overtime above WTE, one-off /
   * non-consolidated awards, expenses). Since 1 October 2022 tiers use
   * ACTUAL (not whole-time-equivalent) pensionable pay. Under this
   * model all salary sacrifice reduces both bases, so pensionable pay
   * also serves as the tax/NI-assessable gross handed to the engine.
   * Sources: "NHSBSA 2015 Members' Guide V13" and "NHSBSA —
   * cost of being in the Scheme" — see docs/source-archive.md.
   */
  get pensionablePay(): number {
    const fteSalary = Math.round(
      this.salary * this.adjustments.fte,
    );
    return Math.max(
      0, fteSalary - this.adjustments.salarySacrifice,
    );
  }

  /**
   * The award covering this post, or `undefined` where its nation has
   * announced none for the post's year. Takes no argument: a Post
   * already holds the nation and tax year in its identity and the band
   * or grade in its role, which is every coordinate the lookup needs.
   *
   * This is the award for THIS post's year. The full history — every
   * award that ever touched a scale — is `awardsFor`, which a Post
   * cannot answer because it is pinned to one year. A VSM post has no
   * published scale, so it has no award.
   */
  get award(): PayAward | undefined {
    const scale = scaleOf(this.role);
    if (scale === undefined) {
      return undefined;
    }
    return awardsFor(this.identity.nation, scale).find(
      // The award that produced THIS salary, so it follows the pay
      // year: a nation paid last year's rates was moved there by last
      // year's award, whatever tax year it is now.
      (a) => a.year === this.payYear,
    );
  }

  /**
   * The document that PUBLISHES this post's pay scale — the circular a
   * pay table should cite — or `undefined` for an off-scale post.
   *
   * Deliberately not {@link Post.award}'s source. The award instrument
   * and the scale circular are different documents in every nation:
   * England's 2026-27 medical award was enacted by a written
   * ministerial statement while its salaries are printed in PC(M&D)
   * 1/2026 R2, and Northern Ireland has no medical award record at all
   * while still publishing a table that needs a citation.
   *
   * Takes no argument for the same reason `award` does not — the Post
   * already holds every coordinate the lookup needs.
   *
   * `undefined` means ONE thing: an off-scale post, which has no
   * published scale and therefore no publishing circular. An
   * unpublished nation/year, or a grade missing from a table that IS
   * published, throws {@link ScaleUnavailable} like every other
   * accessor here. Two states behind one `undefined` would leave a
   * caller unable to tell "there is no scale" from "we have not
   * transcribed it".
   */
  get scaleSource(): DocumentSource | undefined {
    const role = this.role;
    switch (role.kind) {
      case 'afc':
        return afcScaleSource(this.payYear, this.identity.nation);
      case 'medical':
        return gradeSource(
          getMedicalScales(
            this.payYear, this.identity.nation,
          ),
          role.grade,
          {nation: this.identity.nation, payYear: this.payYear},
        );
      case 'dental':
        return gradeSource(
          getDentalScales(
            this.payYear, this.identity.nation,
          ),
          role.grade,
          {nation: this.identity.nation, payYear: this.payYear},
        );
      // Listed rather than defaulted: an off-scale post genuinely has
      // no publishing circular, and spelling it out means a new role
      // kind fails the build here instead of silently citing nothing.
      case 'vsm':
        return undefined;
    }
  }

  /**
   * Member contribution rate (%). The tier's single rate applies to
   * the WHOLE of {@link Post.pensionablePay} (a slab/cliff-edge rate,
   * not a marginal band); 0 when opted out.
   */
  /**
   * The year this post's SALARY was published in.
   *
   * Falls back to the tax year, which is right for every post whose
   * pay round landed inside its own year.
   */
  get payYear(): PayYear {
    return this.identity.payYear;
  }

  get pensionRate(): number {
    if (this.adjustments.pensionOptedOut) {
      return 0;
    }
    return getPensionTiersVO(
      this.identity.taxYear,
      this.identity.nation,
    ).rateFor(this.pensionablePay);
  }

  /**
   * Annual member pension contribution (£) — read from the
   * take-home breakdown rather than re-derived, so it can
   * never drift from what paye-calc actually deducts.
   */
  get pensionContribution(): number {
    return this.takeHome.pensionDeduction;
  }

  /** Full take-home breakdown (tax, NI, pension, net). */
  get takeHome(): TakeHomePay {
    return nhsTakeHome(
      this.pensionablePay,
      this.pensionRate / 100,
      this.identity.taxYear,
      nationToTaxRegion(this.identity.nation),
      {
        studentLoans: this.adjustments.studentLoans,
        taxCode: this.adjustments.taxCode,
      },
    );
  }

  /** Annual income tax (£). */
  get tax(): number {
    return this.takeHome.incomeTax;
  }

  /** Annual national insurance (£). */
  get nationalInsurance(): number {
    return this.takeHome.nationalInsurance;
  }

  /** The same post at a different salary (e.g. a raise). */
  withSalary(salary: number): Post {
    return new Post(
      this.identity, salary, this.role, this.adjustments,
    );
  }

  /**
   * The same post with some personal circumstances changed —
   * merged over the current adjustments, so a caller sets only
   * the fields it cares about (the rest stay at their defaults).
   */
  withAdjustments(patch: Partial<PostAdjustments>): Post {
    return new Post(this.identity, this.salary, this.role, {
      ...this.adjustments,
      ...patch,
    });
  }
}
