/**
 * The shape of GAD's 2015 Scheme additional pension purchase tables.
 *
 * Every factor is a cost per £250 of additional pension a year, the unit a
 * member buys in, valued at the date the election is made. Two kinds:
 *
 * - **Lump sum** (Table S): one premium, by age at election.
 * - **Instalments** (Tables P65–P68, D65–D68): a monthly contribution, by
 *   age at election and a payment period of whole years, one table per
 *   Normal Pension Age. A row stops where age plus period would pass the
 *   pension age, because instalments must finish before it.
 *
 * Each comes with and without dependants' cover, in separate columns (the
 * lump sum) or separate tables (instalments).
 */

import type {IsoDate} from '../iso-date.js';
import type {GadTableProvenance} from './factor-table.js';

/** What a purchase buys cover for. */
export const ADDITIONAL_PENSION_COVERS = {
  /** The member's own pension. */
  personal: 'personal',
  /** The member's pension, and benefits for a partner and children. */
  withDependants: 'personal-and-dependants',
} as const;

export type AdditionalPensionCover =
  (typeof ADDITIONAL_PENSION_COVERS)[keyof typeof ADDITIONAL_PENSION_COVERS];

/** Where one purchase table came from: GAD's citation (its
 *  `guidanceRef` is NHSBSA's name, e.g. 'Table P67', and its
 *  `sourceUrl` GAD's download of the workbook), and the day the scheme
 *  put it into use. */
export interface AdditionalPensionProvenance extends GadTableProvenance {
  /** The date the scheme put the factors into use. */
  readonly implemented: IsoDate;
}

/** Table S: a single premium per £250, by age at election. */
export interface LumpSumTableData {
  readonly provenance: AdditionalPensionProvenance;
  readonly firstAge: number;
  /** One row per age from `firstAge`, a premium for each cover. */
  readonly rows: readonly Readonly<Record<AdditionalPensionCover, number>>[];
}

/** A monthly contribution per £250, by age at election and payment
 *  period, for one Normal Pension Age and one cover. */
export interface InstalmentTableData {
  readonly provenance: AdditionalPensionProvenance;
  readonly npa: number;
  readonly cover: AdditionalPensionCover;
  readonly firstAge: number;
  /** One row per age from `firstAge`; column `n - 1` is a payment period
   *  of `n` years. */
  readonly rows: readonly (readonly number[])[];
}
