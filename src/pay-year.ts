/**
 * A pay year's place on the scheme calendar. Every pay round, for every
 * staff group, runs from 1 April to 31 March, the scheme year's own cycle,
 * so each pay year is exactly one scheme year: '2025-26' is the scheme year
 * ending 31 March 2026. The award table holds to it: every award takes
 * effect on 1 April (`award.ts`), and `tests/pay-year.test.ts` fails the
 * day one does not.
 *
 * It names no staff group, so a staff group's own module builds on it
 * rather than the other way round. It is kept out of
 * `pension/scheme-year.ts`, which imports nothing, because a pay year is
 * paye-calc's type.
 */

import type {PayYear} from '@casomoltd/paye-calc';
import {schemeYearEnd} from './pension/scheme-year.js';
import type {SchemeYearEnd} from './pension/scheme-year.js';

/** The characters of a pay year's label naming the year its round opens
 *  in: "2025" of "2025-26". */
const OPENING_YEAR_DIGITS = 4;

/** The scheme year a pay year's round runs over: 2026 for '2025-26'. */
export function schemeYearOfPayYear(year: PayYear): SchemeYearEnd {
  // Read here rather than through paye-calc's `taxYearEndOf`, which takes a
  // `TaxYear`: minting one from a pay year would relabel its basis.
  return schemeYearEnd(Number(year.slice(0, OPENING_YEAR_DIGITS)) + 1);
}
