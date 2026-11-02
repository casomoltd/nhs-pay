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
 * Sources, named as they appear in docs/source-archive.md,
 * which holds every publisher URL and archived copy:
 * - Net pay arrangement — "HMRC PTM044230 — net pay
 *   arrangements"
 *
 * That a contribution comes off before tax but NOT before NI is
 * generic PAYE rather than NHS practice, so it is paye-calc's
 * rule to state and to cite: casomoltd/paye-calc#29. This
 * library only selects the basis.
 */

import {
  TakeHomePay,
  GrossAnnual,
  NO_PENSION,
  PensionBasis,
  PensionPercent,
  getTaxYearConfig,
  payAt,
} from '@casomoltd/paye-calc';
import type {
  AnnualAllowance,
  TaxYear,
  TaxRegion,
  StudentLoanPlan,
  TaxCode,
} from '@casomoltd/paye-calc';
import {yearlyAccrual} from './pension-projection.js';
import {invariant} from './errors.js';

/** A rate is a fraction here; paye-calc takes a pension per cent. */
const PER_CENT = 100;

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
 * The take-home pay of an NHS post. Its `annualAllowance()` has no
 * scheme pension input; read the allowance through
 * `nhsAnnualAllowance` (or `Post.annualAllowance`).
 *
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
  const thp = new TakeHomePay(taxYear, taxRegion);
  thp.setSalary(GrossAnnual(salary));
  // A positive rate is scheme membership (NET arrangement); zero is an
  // opted-out member, so there's no pension at all — never a 0%
  // Employer contribution.
  const isMember = pensionRate > 0;
  thp.setPension(isMember
    ? {
      basis: PensionBasis.Employer,
      contribution: PensionPercent(pensionRate * PER_CENT),
    }
    : NO_PENSION);
  if (options.studentLoans && options.studentLoans.size > 0) {
    thp.setStudentLoanPlans(options.studentLoans);
  }
  if (options.taxCode) {
    thp.setTaxCode(options.taxCode);
  }

  // Net-pay invariant: the member contribution reduces the tax base
  // but MUST NOT reduce NI-able pay (NI is on the full gross). If NI
  // ever changes when the pension is applied, the pension basis is
  // wrong or paye-calc's model changed — fail loud here (this runs in
  // every test and page) rather than silently overstating take-home.
  if (isMember) {
    // The same inputs but the pension, so the pension alone is what
    // the two sides differ by.
    const inputs = {
      config: getTaxYearConfig(taxYear, taxRegion),
      pension: thp.pension,
      studentLoans: thp.studentLoanPlans,
      taxCode: options.taxCode ?? null,
    };
    invariant(
      payAt(salary, inputs).niBreakdown.total
        === payAt(salary, {...inputs, pension: NO_PENSION}).niBreakdown.total,
      'NHS pension is a net-pay arrangement: it must reduce income '
        + 'tax but not National Insurance (NI is assessed on full '
        + 'gross). NI changed when the pension was applied. '
        + 'See HMRC PTM044230.',
    );
  }
  return thp;
}

/**
 * The pension annual allowance an NHS member's year meets. The scheme
 * is defined benefit, so the pension input is the growth in CARE
 * benefits (paye-calc's DB multiple of the year's accrual), not the
 * contribution paid;
 * without it adjusted income omits the scheme and the taper never
 * bites for high earners. An opted-out member (rate 0) has no input.
 * Source: HMRC PTM053301 (DB pension input amount), the citation
 * paye-calc's `DB_PENSION_INPUT_MULTIPLIER` carries.
 */
export function nhsAnnualAllowance(
  salary: number,
  pensionRate: number,
  taxYear: TaxYear,
  taxRegion: TaxRegion,
): AnnualAllowance {
  const isMember = pensionRate > 0;
  return nhsTakeHome(salary, pensionRate, taxYear, taxRegion).annualAllowance(
    isMember ? {dbAnnualAccrual: yearlyAccrual(salary)} : {},
  );
}
