/**
 * The pay path against an invented member worked by hand.
 *
 * `fixtures/invented-member.json` was produced by an independent
 * implementation — its own curve, its own ages, its own ladder — kept
 * outside this repository beside the working it belongs to. It does
 * not import this library, so agreement means the rule was reached
 * twice rather than recorded once. The member is invented: no figure
 * in it belongs to anybody.
 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {describe, expect, it} from 'vitest';
import {promotionalIndex} from '../src/index.js';
import {buildPayPath} from '../src/pay-path.js';
import type {MemberPay} from '../src/pay-path.js';
import {PayPathUnavailable} from '../src/errors.js';
import {isoDate} from '../src/iso-date.js';
import {PROMOTIONAL_SCALE_2020} from '../src/gad/promotional-scale-2020.js';
import {parseCsv, publishedLadder} from './helpers.js';
import type {OracleLadder} from './helpers.js';

interface Invented {
  member: {
    dateOfBirth: string;
    currentPay: number;
    currentAsAt: string;
    ladder: OracleLadder;
  };
  promotionalIndex: Record<string, number>;
  payPath: {schemeYearEnd: number; pay: number; basis: string}[];
}

const invented = JSON.parse(fs.readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'fixtures', 'invented-member.json',
  ),
  'utf-8',
)) as Invented;

const {member} = invented;
const dateOfBirth = isoDate(member.dateOfBirth);
const pay: MemberPay = {
  declared: [],
  current: {todaysMoney: member.currentPay, asAt: isoDate(member.currentAsAt)},
  ladder: publishedLadder(member.ladder, '2026-27', 'england'),
};

describe('the promotional scale transcription', () => {
  // The mirror was taken from the text of the published PDF in a
  // separate pass, so agreement checks the transcription, every cell.
  it('matches the printed table, every cell', () => {
    const rows = parseCsv('gad-promotional-scale-2020.csv');
    const {ages, nonManual, manual} = PROMOTIONAL_SCALE_2020;
    expect(rows.map((r) => Number(r.age))).toEqual([...ages]);
    rows.forEach((r, i) => {
      expect([nonManual.male[i], nonManual.female[i],
        manual.male[i], manual.female[i]]).toEqual([
        Number(r.nonManualMale), Number(r.nonManualFemale),
        Number(r.manualMale), Number(r.manualFemale)]);
    });
  });
});

describe('promotionalIndex', () => {
  it('is GAD\'s two non-manual columns averaged, as worked by hand',
    () => {
      for (const [age, expected] of
        Object.entries(invented.promotionalIndex)) {
        expect(promotionalIndex(Number(age)), `age ${age}`)
          .toBeCloseTo(expected, 4);
      }
    });

  it('is 100 at 25, where GAD indexes it', () => {
    expect(promotionalIndex(25)).toBe(100);
  });

  it('interpolates between rows rather than stepping', () => {
    // 42.5 is halfway between the 40 and 45 rows: (173 + 186) / 2.
    expect(promotionalIndex(42.5)).toBeCloseTo(179.5, 10);
  });
});

describe('buildPayPath', () => {
  const built = buildPayPath(dateOfBirth, pay);

  it('matches the invented member\'s pay, year by year', () => {
    for (const year of invented.payPath) {
      const got = built.payFor(year.schemeYearEnd);
      expect(got.basis, `${year.schemeYearEnd}`).toBe(year.basis);
      expect(got.pay, `${year.schemeYearEnd}`)
        .toBeCloseTo(year.pay, 2);
    }
  });

  it('says what every year is, and covers every kind', () => {
    const kinds = new Set(invented.payPath.map(
      (y) => built.payFor(y.schemeYearEnd).basis,
    ));
    expect([...kinds].sort()).toEqual(
      ['contractual', 'declared', 'projected', 'reconstructed'],
    );
  });

  it('prefers a year the member declared over any worked figure',
    () => {
      const withDeclared = buildPayPath(dateOfBirth, {
        ...pay,
        declared: [{schemeYearEnd: 2020, todaysMoney: 44_000}],
      });
      expect(withDeclared.payFor(2020))
        .toEqual({pay: 44_000, basis: 'declared'});
      expect(withDeclared.payFor(2019)).toEqual(built.payFor(2019));
    });

  it('projects from today on the curve when no steps remain', () => {
    const flat = buildPayPath(dateOfBirth, {...pay, ladder: null});
    expect(flat.payFor(2028).basis).toBe('projected');
    expect(flat.payFor(2028).pay).toBeCloseTo(
      member.currentPay * promotionalIndex(49) / promotionalIndex(48),
      6,
    );
  });

  it('keeps a part-time member\'s steps in proportion', () => {
    const half = buildPayPath(dateOfBirth, {
      ...pay,
      current: {...pay.current, todaysMoney: member.currentPay / 2},
    });
    for (const year of [2020, 2028, 2030, 2040]) {
      expect(half.payFor(year).pay)
        .toBeCloseTo(built.payFor(year).pay / 2, 6);
    }
  });

  it('refuses a current pay that is not a figure', () => {
    expect(() => buildPayPath(dateOfBirth, {
      ...pay, current: {...pay.current, todaysMoney: -1},
    })).toThrow(PayPathUnavailable);
  });

  it('does not compile a ladder whose points do not say when they pay', () => {
    // A rung is a `SteppedPoint`, so a point with no year of service is
    // refused by the compiler; this fails the typecheck if it is ever
    // accepted.
    const entryAndTop = [{label: 'Entry', salary: 1}, {label: 'Top', salary: 2}];
    const neverRun = () => buildPayPath(dateOfBirth, {
      ...pay,
      // @ts-expect-error a point with no year of service is not a rung
      ladder: {points: entryAndTop, current: entryAndTop[0]},
    });
    expect(neverRun).toBeTypeOf('function');
  });
});
