/**
 * Which table each section reads, pinned per section.
 *
 * The factor key is the pension age, not the section, so the type
 * would let a section name another's table; what stops it is that each
 * derivation is private to its section. These tests are that guard: a
 * section reading the wrong table fails here by name, not only by value.
 *
 * Values are held to the invented member worked by hand in
 * `fixtures/invented-member.json`, whose factors were read from the text
 * of the NHSBSA extract rather than from these transcriptions.
 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {describe, expect, it} from 'vitest';
import {BenefitNotModelled} from '../src/errors.js';
import type {FactorOutcome} from '../src/factor-basis.js';
import {isoDate, isoToDate} from '../src/iso-date.js';
import {factor1995} from '../src/sections/section-1995.js';
import {factor2008} from '../src/sections/section-2008.js';
import {factor2015} from '../src/sections/section-2015.js';
import {retirementFactor} from '../src/pension-projection.js';
import {npaDate} from '../src/dates.js';
import {normalPensionAge} from '../src/npa.js';
import {RULES_1995} from '../src/sections/section-1995.js';
import {RULES_2008} from '../src/sections/section-2008.js';

interface Invented {
  member: {dateOfBirth: string};
  positions: {
    drawn: string;
    factors: {'1995Pension': number; '1995LumpSum': number; '2015': number};
  }[];
}

const invented = JSON.parse(fs.readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'fixtures', 'invented-member.json',
  ),
  'utf-8',
)) as Invented;

const born = isoToDate(isoDate(invented.member.dateOfBirth));
const on = (iso: string) => isoToDate(isoDate(iso));

/** The table an outcome was read from, or the reason it was not. */
const source = (outcome: FactorOutcome) =>
  outcome.source === 'table'
    ? outcome.provenance.tableRef
    : outcome.source;

describe('the invented member\'s factors, as worked by hand', () => {
  it.each(invented.positions.map((p) => [p.drawn, p.factors] as const))(
    'drawn %s', (drawn, factors) => {
      const date = on(drawn);
      expect(factor1995(born, date, date, 'pension').factor)
        .toBe(factors['1995Pension']);
      expect(factor1995(born, date, date, 'lump-sum').factor)
        .toBe(factors['1995LumpSum']);
      expect(factor2015(born, date).factor).toBe(factors['2015']);
    },
  );
});

describe('1995 Section', () => {
  const early = on('2037-03-31');
  const late = on('2041-06-30');

  it('reads 1-401 for its pension and 1-407 for its lump sum', () => {
    expect(source(factor1995(born, early, early, 'pension')))
      .toBe('1-401');
    expect(source(factor1995(born, early, early, 'lump-sum')))
      .toBe('1-407');
  });

  it('pays no late uplift, and says so rather than printing 1.000',
    () => {
      expect(factor1995(born, late, late, 'pension')).toEqual(
        {source: 'section-awards-no-late-uplift', factor: 1},
      );
    });

  it('distinguishes exactly 60 from after 60', () => {
    const sixty = on('2039-01-01');
    expect(factor1995(born, sixty, sixty, 'pension')).toEqual(
      {source: 'at-normal-pension-age', factor: 1},
    );
  });

  it('refuses an early drawing from preserved benefits', () => {
    expect(() => factor1995(born, on('2030-03-31'), early, 'pension'))
      .toThrow(BenefitNotModelled);
  });
});

describe('each legacy section\'s pension age', () => {
  it('is the age its factors are measured from', () => {
    const at1995 = npaDate(born, RULES_1995.pensionAge);
    const at2008 = npaDate(born, RULES_2008.pensionAge);
    expect(source(factor1995(born, at1995, at1995, 'pension')))
      .toBe('at-normal-pension-age');
    expect(source(factor2008(born, at2008, at2008)))
      .toBe('at-normal-pension-age');
  });
});

describe('2008 Section', () => {
  it('reads 1-402 before 65 and 2-416 after', () => {
    const early = on('2040-03-31');
    const late = on('2046-03-31');
    expect(source(factor2008(born, early, early))).toBe('1-402');
    expect(source(factor2008(born, late, late))).toBe('2-416');
  });

  it('refuses an early drawing from preserved benefits', () => {
    expect(() => factor2008(born, on('2030-03-31'), on('2040-03-31')))
      .toThrow(BenefitNotModelled);
  });

  it('still reads a late factor for a member who left first', () => {
    const late = on('2046-03-31');
    expect(source(factor2008(born, on('2040-03-31'), late)))
      .toBe('2-416');
  });
});

describe('2015 Section', () => {
  it('reads 0-420 early and 0-421 late, against the member\'s own NPA',
    () => {
      expect(source(factor2015(born, on('2040-03-31')))).toBe('0-420');
      expect(source(factor2015(born, on('2048-03-31')))).toBe('0-421');
    });
});

describe('one door for the 2015 factor', () => {
  it('projectPension\'s factor is the 2015 Section\'s, early, at NPA '
    + 'and late', () => {
    const npa = npaDate(born, normalPensionAge(born));
    for (const drawn of [
      on('2040-03-31'), on('2045-11-17'), npa, on('2049-06-30'),
    ]) {
      expect(retirementFactor(drawn, npa).factor)
        .toBe(factor2015(born, drawn).factor);
    }
  });
});
