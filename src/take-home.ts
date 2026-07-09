/**
 * Pre-configured TakeHomePay for NHS staff.
 *
 * The NHS Pension Scheme uses a NET PAY ARRANGEMENT: the member
 * contribution is deducted from pay BEFORE income tax is calculated
 * (so tax relief is automatic at the member's marginal rate), but is
 * NOT deducted before National Insurance — NI is assessed on the full
 * gross, including the pension contribution. Getting this wrong (also
 * reducing NI by the pension) overstates take-home; the invariant in
 * {@link nhsTakeHome} guards against it.
 *
 * Sources:
 * - Net pay arrangement — HMRC PTM044230:
 *   https://www.gov.uk/hmrc-internal-manuals/pensions-tax-manual/ptm044230
 * - Deducted before tax, not before NI — LITRG:
 *   https://www.litrg.org.uk/pensions/paying-pensions/tax-relief-pension-contributions/how-tax-relief-given-pension-contributions
 */

import {
  TakeHomePay,
  GrossAnnual,
  PensionBasis,
  PensionPercent,
} from '@casomoltd/paye-calc';
import type {
  TaxYear,
  TaxRegion,
  StudentLoanPlan,
  TaxCode,
} from '@casomoltd/paye-calc';
import {yearlyAccrual} from './pension-projection.js';
import {invariant} from './errors.js';

/**
 * Generic PAYE deductions layered on the NHS salary — the paye-calc
 * inputs a bare scale salary doesn't carry. Each is optional and
 * defaults to "none". These are paye-calc's own concerns (nhs-pay
 * forwards them, never re-implements the maths).
 */
export interface NhsTakeHomeOptions {
  /** Student-loan plans being repaid (default: none). */
  readonly studentLoans?: ReadonlySet<StudentLoanPlan>;
  /** Tax-code override, or null/absent to derive from salary. */
  readonly taxCode?: TaxCode | null;
}

/**
 * @param salary      Gross annual pay assessed for tax/NI (already
 *                    FTE-adjusted and net of any salary sacrifice)
 * @param pensionRate Decimal fraction (e.g. 0.098); 0 = opted out
 * @param taxYear     Which pay/tax year — required, no silent default
 * @param taxRegion   Which tax region — required; omitting it would
 *                    silently tax a Scottish member at rUK rates
 * @param options     Student loans / tax-code override
 */
export function nhsTakeHome(
  salary: number,
  pensionRate: number,
  taxYear: TaxYear,
  taxRegion: TaxRegion,
  options: NhsTakeHomeOptions = {},
): TakeHomePay {
  const thp = new TakeHomePay(
    taxYear, taxRegion,
  );
  thp.setSalary(GrossAnnual(salary));
  // A positive rate is scheme membership (NET arrangement); zero is an
  // opted-out member, so there's no pension basis at all — never a 0%
  // Employer contribution.
  if (pensionRate > 0) {
    thp.setPensionBasis(PensionBasis.Employer);
    thp.setPension(
      PensionPercent(pensionRate * 100),
    );
    // The tapered annual allowance is driven by the DB pension INPUT
    // amount (growth in CARE benefits ≈ 16 × annual accrual), not the
    // contribution paid; without it, adjusted income omits the scheme
    // accrual and the taper never bites for high earners.
    // Source: HMRC PTM044230 (pension input amount for DB schemes).
    thp.setDbAnnualAccrual(yearlyAccrual(salary));
  } else {
    thp.setPensionBasis(PensionBasis.None);
  }
  // setStudentLoanPlans wants a mutable Set; the VO holds a
  // ReadonlySet, so copy it at the boundary.
  if (options.studentLoans && options.studentLoans.size > 0) {
    thp.setStudentLoanPlans(
      new Set(options.studentLoans),
    );
  }
  if (options.taxCode) {
    thp.setTaxCode(options.taxCode);
  }

  // Net-pay invariant: the member contribution reduces the tax base
  // but MUST NOT reduce NI-able pay (NI is on the full gross). If NI
  // ever changes when the pension is applied, the pension basis is
  // wrong or paye-calc's model changed — fail loud here (this runs in
  // every test and page) rather than silently overstating take-home.
  if (pensionRate > 0) {
    const niNoPension = new TakeHomePay(taxYear, taxRegion);
    niNoPension.setSalary(GrossAnnual(salary));
    invariant(
      thp.nationalInsurance === niNoPension.nationalInsurance,
      'NHS pension is a net-pay arrangement: it must reduce income '
        + 'tax but not National Insurance (NI is assessed on full '
        + 'gross). NI changed when the pension was applied. '
        + 'See HMRC PTM044230.',
    );
  }
  return thp;
}
