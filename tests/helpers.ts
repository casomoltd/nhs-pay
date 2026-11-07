/**
 * Shared fixtures for the test suite: the loader for every CSV oracle in
 * tests/fixtures/, which takes the fixture's basename so the directory and
 * the csv-parse options are spelled out once, and the invented member, read
 * from its oracle's JSON into the shape this library takes.
 */

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {parse} from 'csv-parse/sync';
import {getAfcScales} from '../src/index.js';
import {isoDate} from '../src/iso-date.js';
import type {
  Member, REMEDY_BASES, RemedyBasis, SectionId,
} from '../src/member/index.js';
import type {SteppedPoint} from '../src/scale-point.js';

/** An election a remedy member makes: either basis, never none. */
export type MadeElection = Exclude<RemedyBasis, typeof REMEDY_BASES.none>;

/** The invented member's pay ladder as its oracle states it: labels
 *  and salaries, the form an implementation that does not import this
 *  library can write. */
interface OracleLadder {
  points: {label: string; salary: number}[];
  current: string;
}

/** The invented member's oracle, `fixtures/invented-member.json`: an
 *  independent implementation's working, which does not import this
 *  library. The member is invented: no figure belongs to anybody. */
interface InventedFixture {
  member: {
    dateOfBirth: string;
    currentPay: number;
    currentAsAt: string;
    ladder: OracleLadder;
    service: {section: SectionId; joined: string; left: string | null}[];
  };
  promotionalIndex: Record<string, number>;
  payPath: {schemeYearEnd: number; pay: number; basis: string}[];
  positions: {
    drawn: string;
    election: MadeElection;
    service1995: number;
    finalPay: number;
    factors: {'1995Pension': number; '1995LumpSum': number; '2015': number};
    awards: {
      section: string; basis: string; pension: number; lump: number;
    }[];
    pension: number;
    automaticLumpSum: number;
    maximumCash: number;
    residualAtMaximum: number;
  }[];
}

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

/** Parse a fixture CSV into header-keyed string rows */
export function parseCsv<Row = Record<string, string>>(
  fixture: string,
): Row[] {
  const raw = fs.readFileSync(
    path.join(FIXTURES, fixture), 'utf-8',
  );
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Row[];
  // An empty fixture is never legitimate here, and it is the one
  // failure that hides itself: `it.each([])` registers no cases and
  // the suite reports green. Fail at the read so no sweep has to
  // remember its own row-count guard.
  if (rows.length === 0) {
    throw new Error(
      `${fixture}: fixture has no rows — a sweep over it would `
      + 'silently assert nothing',
    );
  }
  return rows;
}

/** The invented member's oracle, read from its fixture. */
export function inventedFixture(): InventedFixture {
  return JSON.parse(fs.readFileSync(
    path.join(FIXTURES, 'invented-member.json'), 'utf-8',
  )) as InventedFixture;
}

/**
 * The invented member as this library takes one: no statement, and pay on
 * the published 2026-27 England band the oracle's ladder matches. Read
 * from the fixture, not retyped: two copies of one service history is how
 * a test and the oracle come to price different members.
 */
export function inventedMember(): Member {
  const {member} = inventedFixture();
  return {
    dateOfBirth: isoDate(member.dateOfBirth),
    service: member.service.map((p) => ({
      section: p.section,
      joined: isoDate(p.joined),
      left: p.left === null ? null : isoDate(p.left),
    })),
    pay: {
      declared: [],
      current: {
        todaysMoney: member.currentPay, asAt: isoDate(member.currentAsAt),
      },
      ladder: publishedLadder(member.ladder, '2026-27', 'england'),
      partTime: false,
    },
    statement: null,
  };
}

/**
 * The oracle's ladder as the library's own published band, found by
 * matching every point. Failing to find one means the oracle priced a
 * ladder the library does not publish, and every figure built on it
 * would be checking the wrong pay.
 */
function publishedLadder(
  oracle: OracleLadder,
  year: Parameters<typeof getAfcScales>[0],
  nation: Parameters<typeof getAfcScales>[1],
): {points: readonly SteppedPoint[]; current: SteppedPoint} {
  const band = getAfcScales(year, nation).bands.find((b) =>
    b.points.length === oracle.points.length
    && b.points.every((p, i) =>
      p.label === oracle.points[i].label
      && p.salary === oracle.points[i].salary));
  const current = band?.points.find((p) => p.label === oracle.current);
  if (band === undefined || current === undefined) {
    throw new Error(
      `no ${nation} ${year} band matches the oracle's ladder`,
    );
  }
  return {points: band.points, current};
}
