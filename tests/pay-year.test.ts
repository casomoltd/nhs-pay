/**
 * A pay year on the scheme calendar, and the AfC pay year the library
 * holds for a scheme year. The pinned years are written out by hand, never
 * derived from the label the way the code reads it, so a mistake in that
 * reading cannot agree with itself; the per-nation sweep is a round trip
 * over every published year, not an oracle. The premise the module rests
 * on, that every round opens on 1 April, is held against the award table.
 */
import {describe, it, expect} from 'vitest';
import {
  AFC_BAND_IDS,
  DENTAL_GRADES,
  MEDICAL_GRADES,
  NATION_KEYS,
  afcPayYearFor,
  afcPayYears,
  awardsFor,
  isoDateOf,
  latestAfcYear,
  schemeYearEnd,
  schemeYearStartDate,
} from '../src/index.js';
import {schemeYearOfPayYear} from '../src/pay-year.js';

describe('schemeYearOfPayYear', () => {
  it('is the scheme year ending on the 31 March the round closes on', () => {
    expect(schemeYearOfPayYear('2025-26')).toBe(2026);
    expect(schemeYearOfPayYear('2026-27')).toBe(2027);
  });
});

describe('afcPayYearFor', () => {
  it('names the pay year whose round runs over the scheme year', () => {
    expect(afcPayYearFor(schemeYearEnd(2026), NATION_KEYS.england))
      .toBe('2025-26');
    expect(afcPayYearFor(schemeYearEnd(2027), NATION_KEYS.england))
      .toBe('2026-27');
  });

  it('is null for a year before the earliest scale the library holds', () => {
    expect(afcPayYearFor(schemeYearEnd(2016), NATION_KEYS.england))
      .toBeNull();
  });

  // Nations publish on their own timetables, so each is asked for its own
  // years.
  it.each(Object.values(NATION_KEYS))(
    'finds every year %s publishes, and null after its latest',
    (nation) => {
      for (const year of afcPayYears(nation)) {
        expect(afcPayYearFor(schemeYearOfPayYear(year), nation)).toBe(year);
      }
      const after = schemeYearOfPayYear(latestAfcYear(nation)) + 1;
      expect(afcPayYearFor(schemeYearEnd(after), nation)).toBeNull();
    },
  );
});

describe('the premise: every pay round opens its scheme year', () => {
  const scales = [...AFC_BAND_IDS, ...Object.values(MEDICAL_GRADES),
    ...Object.values(DENTAL_GRADES)];
  it.each(Object.values(NATION_KEYS))(
    'every award %s has takes effect on 1 April of its scheme year',
    (nation) => {
      const awards = scales.flatMap((scale) => awardsFor(nation, scale));
      expect(awards.length).toBeGreaterThan(0);
      for (const award of awards) {
        expect(award.effectiveFrom, `${award.year} ${award.family}`).toBe(
          isoDateOf(schemeYearStartDate(schemeYearOfPayYear(award.year))));
      }
    },
  );
});
