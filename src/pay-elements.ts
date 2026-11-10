/**
 * Pay above the scale salary, one variant per kind of payslip line, each
 * priced for a post and each with its pensionability in the post's
 * scheme. Amounts are annual pounds.
 *
 * Pensionability, by element and scheme (see docs/source-archive.md):
 * - Recruitment and retention premium: long-term pensionable, short-term
 *   not, whether a percentage or a fixed sum. "NHS Terms and Conditions of
 *   Service Handbook" (#sa-41) paragraphs 5.10 and 5.11, which apply UK-wide;
 *   Scotland states the same (#sa-72).
 * - On-call availability supplement: pensionable where it pays for a rota
 *   commitment, which is the case it is entered for. England and Wales
 *   "NHSBSA KA-04362" (#sa-69); Scotland (#sa-72); Northern Ireland's
 *   on-call allowance (#sa-73).
 * - Unsocial hours: pensionable, except on hours above whole-time, which a
 *   reader enters as overtime. England and Wales "NHSBSA payroll provider
 *   requirements v6.1" (#sa-70) paragraphs 2.1.9 to 2.1.11; Scotland
 *   (#sa-72); Northern Ireland's special duty payments (#sa-73).
 * - Additional hours, a part-timer's hours up to whole-time at the plain
 *   rate: pensionable. England and Wales SI 2015/94 reg 27 (#sa-74) with
 *   "overtime" as Sch 15 defines it (#sa-75); Scotland, whose overtime is
 *   only hours above whole-time (#sa-72); Northern Ireland, up to whole-time
 *   at the single time rate (#sa-73).
 * - Overtime: never pensionable, even at plain time above whole-time
 *   (#sa-75, #sa-72, #sa-73).
 * - Per-session allowances: Scotland's on-call availability allowance
 *   (#sa-72) and Northern Ireland's sleep-in and on-call allowances
 *   (#sa-73) are pensionable; Wales's on-call allowances are, on the
 *   rota-commitment rule (#sa-69). Wales's sleeping-in allowance is
 *   unsourced and throws {@link RuleUnsourced}.
 */

import {NATION_KEYS} from '@casomoltd/paye-calc';
import type {Nation} from '@casomoltd/paye-calc';
import {SESSION_ALLOWANCES, sessionAllowance} from './allowances.js';
import type {SessionAllowanceId} from './allowances.js';
import {RuleUnsourced} from './errors.js';
import type {Post} from './post.js';

/** One kind of pay above the scale salary. */
export type PayElement =
  | {
    readonly kind: 'rrp';
    readonly amount:
      | {readonly basis: 'percent'; readonly pct: number}
      | {readonly basis: 'annual'; readonly pounds: number};
    /** Only a long-term premium is pensionable. */
    readonly term: 'long' | 'short';
  }
  | {readonly kind: 'on-call-supplement'; readonly pct: number}
  | {
    readonly kind: 'session-allowance';
    readonly id: SessionAllowanceId;
    readonly sessionsPerYear: number;
  }
  /** A payslip's "… EN" lines, a year's worth. */
  | {readonly kind: 'unsocial-hours'; readonly amount: number}
  /** A part-timer's hours up to whole-time, at the plain rate. */
  | {readonly kind: 'additional-hours'; readonly amount: number}
  /** A payslip's "… OT" lines: hours above whole-time. */
  | {readonly kind: 'overtime'; readonly amount: number};

/** The scheme whose rules decide what is pensionable: by nation. */
export const PENSION_SCHEMES = {
  englandWales: 'nhsps-england-wales',
  scotland: 'nhsps-scotland',
  northernIreland: 'hscps-ni',
} as const;

export type PensionScheme =
  (typeof PENSION_SCHEMES)[keyof typeof PENSION_SCHEMES];

/** The scheme a member in a nation belongs to. */
export function pensionSchemeOf(nation: Nation): PensionScheme {
  switch (nation) {
    case NATION_KEYS.england:
    case NATION_KEYS.wales:
      return PENSION_SCHEMES.englandWales;
    case NATION_KEYS.scotland:
      return PENSION_SCHEMES.scotland;
    case NATION_KEYS.northernIreland:
      return PENSION_SCHEMES.northernIreland;
  }
}

const PER_CENT = 100;

/** The post's scale salary for the hours it works. */
function proRatedSalary(post: Post): number {
  return post.salary * post.adjustments.fte;
}

/** A year of a per-session allowance, at the rate for the post's pay year.
 *  The allowance must be one the post's own nation pays. */
function sessionPay(
  id: SessionAllowanceId,
  sessionsPerYear: number,
  post: Post,
): number {
  const rate = sessionAllowance(id, post.payYear);
  if (!rate) {
    throw new RuleUnsourced(`the ${id} rate for ${post.payYear}`);
  }
  if (rate.nation !== post.identity.nation) {
    throw new RangeError(
      `${id} is paid in ${rate.nation}, not ${post.identity.nation}`,
    );
  }
  return rate.perSession * sessionsPerYear;
}

/** Pounds a year the element adds to the post. A percentage applies to the
 *  pro-rated scale salary; a session allowance prices from the published
 *  rate for the post's pay year. */
export function elementPay(element: PayElement, post: Post): number {
  switch (element.kind) {
    case 'rrp':
      return element.amount.basis === 'percent'
        ? (proRatedSalary(post) * element.amount.pct) / PER_CENT
        : element.amount.pounds;
    case 'on-call-supplement':
      return (proRatedSalary(post) * element.pct) / PER_CENT;
    case 'session-allowance':
      return sessionPay(element.id, element.sessionsPerYear, post);
    case 'unsocial-hours':
    case 'additional-hours':
    case 'overtime':
      return element.amount;
  }
}

/** Whether a per-session allowance counts in its scheme. Only Wales's
 *  sleeping-in allowance is unsourced. */
function sessionPensionable(id: SessionAllowanceId): boolean {
  if (id === SESSION_ALLOWANCES.walesSleepingIn) {
    throw new RuleUnsourced(
      'whether the Welsh sleeping-in allowance is pensionable',
    );
  }
  return true;
}

/** The kinds whose rule is one yes or no per scheme. */
type FlatKind =
  | 'on-call-supplement' | 'unsocial-hours' | 'additional-hours'
  | 'overtime';

/**
 * Each scheme's rule for the flat kinds, one row per scheme so each is a
 * claim read from that scheme's own source (this module's header). They
 * agree today; a scheme that changes its rule changes its row.
 */
const FLAT_RULES: Record<PensionScheme, Record<FlatKind, boolean>> = {
  // #sa-69, #sa-70, #sa-74, #sa-75.
  [PENSION_SCHEMES.englandWales]: {
    'on-call-supplement': true,
    'unsocial-hours': true,
    'additional-hours': true,
    overtime: false,
  },
  // #sa-72.
  [PENSION_SCHEMES.scotland]: {
    'on-call-supplement': true,
    'unsocial-hours': true,
    'additional-hours': true,
    overtime: false,
  },
  // #sa-73.
  [PENSION_SCHEMES.northernIreland]: {
    'on-call-supplement': true,
    'unsocial-hours': true,
    'additional-hours': true,
    overtime: false,
  },
};

/**
 * Whether the element is pensionable in a scheme, from the rules in this
 * module's header. A recruitment and retention premium turns on its term
 * under the UK-wide handbook, and a per-session allowance belongs to one
 * nation's instrument, so neither needs the scheme.
 */
export function isPensionable(
  element: PayElement,
  scheme: PensionScheme,
): boolean {
  switch (element.kind) {
    case 'rrp':
      return element.term === 'long';
    case 'session-allowance':
      return sessionPensionable(element.id);
    case 'on-call-supplement':
    case 'unsocial-hours':
    case 'additional-hours':
    case 'overtime':
      return FLAT_RULES[scheme][element.kind];
  }
}
