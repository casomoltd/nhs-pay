/**
 * A scheme year end: branded apart from paye-calc's tax year end, which
 * shares its numbers, and minted only from a whole year.
 */
import {taxYearEnd} from '@casomoltd/paye-calc';
import {describe, expect, it} from 'vitest';
import {schemeYearEnd, schemeYearEndDate} from '../src/pension/seed.js';

describe('a scheme year end', () => {
  it('is not a tax year end, nor a bare number', () => {
    // A tax year ending 5 April 2026 and the scheme year ending 31 March
    // 2026 share the number 2026; each brand refuses the other.
    // @ts-expect-error a TaxYearEnd is not a SchemeYearEnd
    expect(schemeYearEndDate(taxYearEnd(2026))).toBeInstanceOf(Date);
    // @ts-expect-error a bare number is minted first
    expect(schemeYearEndDate(2026)).toBeInstanceOf(Date);
    expect(schemeYearEndDate(schemeYearEnd(2026)))
      .toEqual(new Date(2026, 2, 31));
  });

  it('mints only a whole four-digit year', () => {
    expect(() => schemeYearEnd(2026.5)).toThrow(RangeError);
    expect(() => schemeYearEnd(26)).toThrow(RangeError);
  });
});
