/**
 * Pre-configured TakeHomePay for NHS AfC staff.
 * Uses NET pay arrangement (pension deducted before
 * tax) which matches the NHS Pension Scheme.
 */

import {
  TakeHomePay,
  GrossAnnual,
  PensionBasis,
  PensionPercent,
  TAX_REGIONS,
} from '@casomoltd/paye-calc';
import type {
  TaxYear,
  TaxRegion,
} from '@casomoltd/paye-calc';
import {AFC_CURRENT_YEAR} from './bands.js';
import {yearlyAccrual} from './pension-projection.js';

/**
 * @param salary      Gross annual salary
 * @param pensionRate Decimal fraction (e.g. 0.098)
 */
export function nhsTakeHome(
  salary: number,
  pensionRate: number,
  taxYear: TaxYear = AFC_CURRENT_YEAR,
  taxRegion: TaxRegion = TAX_REGIONS.rUK,
): TakeHomePay {
  const thp = new TakeHomePay(
    taxYear, taxRegion,
  );
  thp.setSalary(GrossAnnual(salary));
  thp.setPensionBasis(PensionBasis.Employer);
  thp.setPension(
    PensionPercent(pensionRate * 100),
  );
  // DB pension input (16 × accrual) drives the annual-allowance
  // taper; without it adjusted income omits the scheme accrual and
  // the taper never bites for high earners. Skip when opted out.
  if (pensionRate > 0) {
    thp.setDbAnnualAccrual(yearlyAccrual(salary));
  }
  return thp;
}
