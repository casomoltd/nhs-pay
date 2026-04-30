/**
 * GBP and percentage formatting helpers for NHS
 * pay data. Consolidates formatters previously split
 * across afc-format.ts and calculator format.ts.
 */

import type {TaxYear} from '@casomoltd/paye-calc';

// ── Intl formatters (reused across calls) ───────

const gbpFormat = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const gbpPreciseFormat = new Intl.NumberFormat(
  'en-GB',
  {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
);

const pctFormat = new Intl.NumberFormat('en-GB', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// ── Currency ────────────────────────────────────

/** Exact salary with £ sign — £31,049 */
export function fmtSalary(n: number): string {
  return (
    '\u00A3'
    + n.toLocaleString('en-GB')
  );
}

/** Format as £35,000 (no decimals, Intl). */
export function formatGBP(n: number): string {
  return gbpFormat.format(n);
}

/** Format as £35,000.00 (with pence). */
export function formatGBPPrecise(
  n: number,
): string {
  return gbpPreciseFormat.format(n);
}

/** Rounded money — £31,049 */
export function fmtMoney(n: number): string {
  return (
    '\u00A3'
    + Math.round(n).toLocaleString('en-GB')
  );
}

// ── Percentages ─────────────────────────────────

/** Percentage from a number — 5.8% */
export function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

/** Format as 8.3% (Intl, input is whole %). */
export function formatPct(n: number): string {
  return pctFormat.format(n / 100);
}

// ── Tax year labels ─────────────────────────────

/** '2025-26' → '2025/26' */
export function yearLabel(year: TaxYear): string {
  return year.replace('-', '/');
}
