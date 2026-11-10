/**
 * A dummy ESR payslip, transcribed as printed: "Mrs Test Employee", tax
 * period 2, May 2022, a frame of a public video explaining an NHS payslip
 * (#sa-92 in docs/source-archive.md).
 *
 * Illustrative, not an authority. Its lines are internally consistent
 * (hours worked times the multiplier gives hours paid; hours paid times the
 * rate gives the amount, cut to the penny), but it was assembled from parts
 * that do not agree: basic pay is not its hours times its rate, the pay
 * lines do not sum to "Total payments", and net is not total payments less
 * total deductions. So a test may read its line arithmetic and its basic
 * monthly hours, never its totals.
 */

/** One line of "Pay and allowances": worked and paid hours, the hourly
 *  rate and the amount, as printed. */
interface PayslipLine {
  readonly description: string;
  readonly worked?: number;
  readonly paid?: number;
  readonly rate?: number;
  readonly amount: number;
}

export const SA92 = {
  standardHours: 37.5,
  salary: 31_534,
  taxCode: '1283L CUMUL',
  niLetter: 'A',
  lines: [
    {description: 'Basic Pay', worked: 162.95, paid: 162.95,
      rate: 14.9231, amount: 2431.67},
    {description: 'Night Duty EN', worked: 2, paid: 0.6,
      rate: 14.9231, amount: 8.95},
    {description: 'Saturday OT', worked: 3, paid: 4.5,
      rate: 14.9231, amount: 67.15},
    {description: 'Unsocial EN', worked: 2, paid: 0.6,
      rate: 14.9231, amount: 8.95},
    {description: 'Weekday OT', worked: 2, paid: 3,
      rate: 14.9231, amount: 44.76},
    {description: 'Outer London', amount: 394.18},
    {description: 'On Call - Weekday', worked: 3, paid: 3,
      rate: 11.92, amount: 35.76},
    {description: 'AfC Absence', amount: 6.27},
    {description: 'AfC Absence NP', amount: 29.34},
    {description: 'WTD Pay', amount: 44.65},
  ] satisfies readonly PayslipLine[],
  deductions: {paye: 359, ni: 319.42, pension: 286.76},
  pensionLabel: 'NHS Pension 9.8%',
  summary: {
    pensionablePay: 3083.4,
    taxablePay: 2946.93,
    totalPayments: 3233.69,
    totalDeductions: 965.18,
    netPay: 2457.7,
  },
} as const;
