/**
 * A pay or tax year's label as the library names it: '2025/26' for
 * '2025-26'. The library's own identifier, printed the one way its sources
 * print it, so a consumer naming a year reads it from here rather than
 * re-spelling it. Money and percentage spellings are the consumer's: a pay
 * library computes figures and leaves how a page prints them to the page.
 */

import type {YearLabel} from '@casomoltd/paye-calc';

/** '2025-26' → '2025/26' */
export function yearLabel(year: YearLabel): string {
  return year.replace('-', '/');
}
