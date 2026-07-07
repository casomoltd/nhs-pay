/**
 * Post — an immutable salaried NHS post: a person on a
 * salary, in a nation and tax year, contributing to the
 * NHS pension. Take-home, pension rate and contribution
 * are all *derived* from it.
 *
 * A façade: every derived value delegates to the existing
 * NHS modules ({@link nhsTakeHome}, {@link PensionTiers});
 * nothing is absorbed here. A Post never mutates — change
 * a value by building a new one (see {@link Post.withSalary}).
 */

import {nationToTaxRegion} from '@casomoltd/paye-calc';
import type {
  Nation,
  TaxYear,
  TakeHomePay,
} from '@casomoltd/paye-calc';
import {getPensionTiersVO} from './pension.js';
import {nhsTakeHome} from './take-home.js';
import type {Role} from './role.js';

/** The tax/NI/pension context that fixes a Post. */
export interface PostIdentity {
  readonly nation: Nation;
  readonly taxYear: TaxYear;
}

export class Post {
  private constructor(
    readonly identity: PostIdentity,
    readonly salary: number,
    readonly role: Role,
  ) {}

  /**
   * Build a Post from a gross salary — whatever the member
   * is actually paid, already adjusted for HCAS / floors
   * by the resolver. `salary` is the fundamental input;
   * everything else is derived.
   *
   * A bare salary is a `vsm` role (an off-scale post); a
   * scale-point resolver passes the scale identity instead.
   */
  static fromSalary(
    salary: number,
    nation: Nation,
    year: TaxYear,
    role: Role = {kind: 'vsm'},
  ): Post {
    return new Post({nation, taxYear: year}, salary, role);
  }

  /** Member contribution rate (%) for this salary. */
  get pensionRate(): number {
    return getPensionTiersVO(
      this.identity.taxYear,
      this.identity.nation,
    ).rateFor(this.salary);
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
      this.salary,
      this.pensionRate / 100,
      this.identity.taxYear,
      nationToTaxRegion(this.identity.nation),
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
    return new Post(this.identity, salary, this.role);
  }
}
