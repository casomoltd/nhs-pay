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
  TaxYear,
  TakeHomePay,
  StudentLoanPlan,
  TaxCode,
} from '@casomoltd/paye-calc';
import {getPensionTiersVO} from './pension.js';
import {nhsTakeHome} from './take-home.js';
import type {Role} from './role.js';

/** The tax/NI/pension context that fixes a Post. */
export interface PostIdentity {
  readonly nation: Nation;
  readonly taxYear: TaxYear;
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
   * Source: NHSBSA pay & contributions
   * https://www.nhsbsa.nhs.uk/employer-hub/technical-guidance/pay-and-contributions
   */
  readonly fte: number;
  /**
   * Annual salary sacrificed (£). A genuine sacrifice reduces
   * contractual pay, so it lowers the tax- and NI-assessable gross
   * AND — in the default NHS model (England/Wales, and Scotland since
   * December 2023) — pensionable pay too, dropping the pension tier
   * and base. NOT modelled: the Scotland carve-out where cycle-to-work
   * and childcare vouchers leave pensionable pay untouched, and OpRA
   * (post-2017) valuation for non-exempt benefits. In any case salary
   * sacrifice is unavailable to most staff on standard AfC contracts.
   * Sources: BMA salary-sacrifice
   * https://www.bma.org.uk/pay-and-contracts/pensions/pensions-tax/salary-sacrifice-schemes ;
   * NHS Employers https://www.nhsemployers.org/articles/salary-sacrifice-schemes
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
    year: TaxYear,
    role: Role = {kind: 'vsm'},
  ): Post {
    return new Post({nation, taxYear: year}, salary, role);
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
   * Sources: NHSBSA 2015 Members Guide
   * https://www.nhsbsa.nhs.uk/sites/default/files/2024-05/2015%20Members%20Guide%20%28V13%29%2005.2024.pdf ;
   * cost of being in the scheme https://www.nhsbsa.nhs.uk/member-hub/cost-being-scheme
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
   * Member contribution rate (%). The tier's single rate applies to
   * the WHOLE of {@link Post.pensionablePay} (a slab/cliff-edge rate,
   * not a marginal band); 0 when opted out.
   */
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
