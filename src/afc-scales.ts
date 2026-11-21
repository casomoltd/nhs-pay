/**
 * Translation layer: AfC tables as printed → canonical scale points.
 *
 * The counterpart to `medical-scales.ts` for Agenda for Change. The
 * verbatim transcriptions hold each publisher's own table shape: the
 * devolved nations' circulars in `src/circulars/*`, and England's NHS
 * Employers page in `published/england-afc.ts`, since England publishes
 * no AfC circular (the README's AfC pay scales rule). This module maps
 * them to the uniform `Record<AfcBandId, SteppedPoint[]>` the rest of the
 * library speaks, and reads each one's Band 1 beside it. `scales.ts`
 * pairs each result with its source.
 *
 * ── Point labels are DERIVED here, not authored ──
 *
 * No publisher prints a "Year N" label. Every label this library
 * renders is our reading of an interval the publisher DOES print:
 * England, Wales and Northern Ireland head that column "Years until
 * eligible for pay progression", and Scotland's Annex C heads it
 * "Yearly Increment". One convention, all four nations — a point's
 * label is the year of service in which a member first reaches it, and
 * the top point takes a `+` because service continues past it.
 *
 * Deriving rather than typing them is the point. Held as literals
 * beside the salaries, a label and its interval could disagree with
 * nothing to catch it; computed from the transcribed interval, a
 * mis-read interval produces a wrong label that a fixture row fails on.
 */

import {YEAR_LABELS} from '@casomoltd/paye-calc';
import type {AfcBandId} from './afc-band.js';
import {AFC_BANDS} from './afc-band.js';
import type {SteppedPoint} from './scale-point.js';
import {invariant} from './errors.js';
import type {
  FlatBandRow,
  PayJourneyRow,
  PrintedAfcTables,
  SteppedBandRow,
} from './circulars/afc-shapes.js';
import {WALES_AFC_W_02_2025} from './circulars/wales-afc-w-02-2025.js';
import {WALES_AFC_W_02_2026} from './circulars/wales-afc-w-02-2026.js';
import {
  ENGLAND_AFC_2025_26, ENGLAND_AFC_2026_27,
} from './published/england-afc.js';
import {NI_HSC_AFC_06_2025} from './circulars/ni-hsc-afc-06-2025.js';
import {
  SCOTLAND_PCS_AFC_2026_01,
} from './circulars/scotland-pcs-afc-2026-01.js';

/** Band 1 as a publisher prints it, before `scales.ts` attaches the year
 *  and source it is held under. */
export interface PrintedBand1 {
  readonly salary: number;
  /** The publisher's words for the band's status where it gives any:
   *  "closed to new entrants" in England, Wales and Northern Ireland,
   *  each of which footnotes it so. Absent for Scotland, whose
   *  PCS(AFC)2026/1 carries no closure statement and gives Band 1 a full
   *  Annex C pay journey, so it is a band people are still hired onto. */
  readonly note?: string;
}

/** One nation-year's tables, translated: its ladder, and its Band 1. */
export interface AfcTables {
  readonly scales: Record<AfcBandId, SteppedPoint[]>;
  readonly band1: PrintedBand1;
}

/**
 * Band 1, which every AfC publisher still prints and this library does
 * not model as a rung.
 *
 * Closed to new entrants in England, Wales and Northern Ireland, and
 * **open in Scotland**, whose PCS(AFC)2026/1 carries no closure
 * statement and gives it a full Annex C pay journey.
 *
 * Absent from `AFC_BANDS`, so the ladder translation skips it by name
 * here and anything else unmapped throws. That is the whole job of this
 * list — take it away and every nation's Band 1 row fails at module
 * load. Making it a rung shifts every index that reads the band list by
 * position, a separate piece of work; it is reachable as each
 * nation-year's `band1` instead.
 *
 * Declared above the tables because their initialisation reads it.
 */
const UNMODELLED_BANDS: readonly string[] = ['band 1'];

/**
 * England's tables, read from the NHS Employers pay-scales pages,
 * "NHS Employers — AfC pay scales 2025/26" (#sa-25) and "… 2026/27"
 * (#sa-26), transcribed in `published/england-afc.ts`.
 */
export const ENGLAND_TABLES_2025_26 =
  tablesFrom(ENGLAND_AFC_2025_26, 'NHS Employers 2025/26');
export const ENGLAND_TABLES_2026_27 =
  tablesFrom(ENGLAND_AFC_2026_27, 'NHS Employers 2026/27');

/**
 * Wales's own tables, read from Annex 1 of "Wales, AfC(W) 02/2025"
 * (#sa-44) and "Wales, AfC(W) 02/2026" (#sa-45). They differ from
 * England's at every band from 4 upward, so England's figures plus a
 * living-wage floor reproduce neither year: the floor lifts the bottom of
 * a ladder and cannot raise its top. Band 2 carries two points, as
 * England's does.
 */
export const WALES_TABLES_2025_26 =
  tablesFrom(WALES_AFC_W_02_2025, 'AfC(W) 02/2025');
export const WALES_TABLES_2026_27 =
  tablesFrom(WALES_AFC_W_02_2026, 'AfC(W) 02/2026');

/**
 * Northern Ireland's tables, from HSC (AfC) 06/2025 (3 December 2025,
 * effective 1 April 2025). One year only: the circular's header says why
 * NI has no 2026-27 round.
 *
 * The figures are England's for every band, because NI's circular prints
 * the same numbers. They are read from NI's circular, not England's table,
 * so they coincide as a fact about the two documents and NI can diverge
 * without a code change. Its Basic Pay block prints Bands 1 and 2 as
 * single flat figures and starts its entry/interval/top table at Band 3,
 * so Band 2 is ONE point where England's is two.
 *
 * All 29 values are pinned against the circular in
 * `tests/fixtures/pay-scales.csv`.
 */
export const NI_TABLES_2025_26 =
  tablesFrom(NI_HSC_AFC_06_2025, 'HSC (AfC) 06/2025');

/**
 * Scotland's Annex B by year: the salaries against bare point numbers.
 * It gives each year's Band 1, and 2025-26's salaries; only Annex C
 * carries the year of service a label needs.
 */
const SCOTLAND_ANNEX_B = {
  [YEAR_LABELS.Y2025_26]: SCOTLAND_PCS_AFC_2026_01.annexB2025,
  [YEAR_LABELS.Y2026_27]: SCOTLAND_PCS_AFC_2026_01.annexB2026,
} as const;

/**
 * Scotland 2026-27, from Annex C: 3.75% on the revised 2025-26 base, so
 * the inflation guarantee reaches this year too. Source: "Scotland,
 * PCS(AFC)2026/1" (#sa-13), effective 1 April 2026.
 *
 * Annex C rather than Annex B because only Annex C carries the year of
 * service. Annex B gives the same salaries against a bare point number,
 * which cannot produce a label — `scotlandAnnexB` exists so a fixture
 * can check the two annexes agree.
 */
export const SCOTLAND_TABLES_2026_27: AfcTables = {
  scales: scotlandScales(SCOTLAND_PCS_AFC_2026_01.payJourney2026),
  band1: band1Of(SCOTLAND_ANNEX_B[YEAR_LABELS.Y2026_27],
    'PCS(AFC)2026/1 Annex B 2026-27'),
};

/**
 * Scotland 2025-26. Scotland negotiates its own award: the 2025-26
 * settlement was 4.25% with an inflation guarantee of at least one point
 * above the calendar year's average CPI. 2025 CPI confirmed at 3.4%, so
 * the rate became 4.4%, backdated to 1 April 2025. Source: "Scotland,
 * PCS(AFC)2026/1" (#sa-13), Annex B, the revised 4.4% column.
 *
 * Built from the 2026-27 journey's SHAPE with Annex B's 2025-26
 * salaries: the circular prints an identical increment structure for
 * both years — the settlement changed the rates, not the ladder — and
 * Annex C's 2025-26 table restates that structure rather than adding
 * to it. Building the year from Annex B against a shape the circular
 * publishes twice is faithful; re-typing the same increments would
 * only add a second place to mistype them.
 */
export const SCOTLAND_TABLES_2025_26: AfcTables = {
  scales: withAnnexBSalaries(
    SCOTLAND_TABLES_2026_27.scales,
    scotlandAnnexB(YEAR_LABELS.Y2025_26),
  ),
  band1: band1Of(SCOTLAND_ANNEX_B[YEAR_LABELS.Y2025_26],
    'PCS(AFC)2026/1 Annex B 2025-26'),
};

/**
 * Annex B's salaries for a year, keyed by band, in printed order.
 *
 * Exposed so a test can assert that the annex a label came from and
 * the annex the salaries were published in agree. Two annexes of one
 * circular disagreeing would mean a transcription error in one of
 * them, and nothing else would notice.
 */
export function scotlandAnnexB(
  year: keyof typeof SCOTLAND_ANNEX_B,
): Map<AfcBandId, number[]> {
  const out = new Map<AfcBandId, number[]>();
  for (const [id, rows] of rowsByBand(SCOTLAND_ANNEX_B[year])) {
    out.set(id, rows.map((row) => row.salary));
  }
  return out;
}

/** A publisher's tables in the shared shape → its ladder and Band 1.
 *  `which` names the document in an error. */
function tablesFrom(printed: PrintedAfcTables, which: string): AfcTables {
  return {
    scales: scalesFrom(printed),
    band1: band1Of(printed.flatBands, which),
  };
}

/**
 * Band 1 from the rows a publisher prints it in: the flat-band table,
 * above the stepped one, for the three nations that close it, and
 * Annex B for Scotland. The count is asserted rather than the first
 * match taken: Band 1 has one point today, and a table giving it two
 * would otherwise return point 1 silently while a consumer says entry
 * and top are the same.
 */
function band1Of(
  rows: readonly {band: string; salary: number; note?: string}[],
  which: string,
): PrintedBand1 {
  const found = rows.filter((r) => r.band === 'Band 1');
  invariant(
    found.length === 1,
    `afc-scales: ${which} prints ${found.length} Band 1 rows, expected 1`,
  );
  const [row] = found;
  return row.note === undefined
    ? {salary: row.salary}
    : {salary: row.salary, note: row.note};
}

/**
 * A band as a publisher prints it → the id this library uses, or `null`
 * where the band is deliberately not modelled.
 *
 * Case and spacing differ by publisher — Scotland prints `Band 8A`
 * where Wales prints `Band 8a` — so the mapping normalises, then
 * checks against the registry rather than trusting the normalisation:
 * a band the library does not know is an error, not a silent skip.
 */
function bandIdOf(printed: string): AfcBandId | null {
  const key = printed.replace(/^Band\s+/i, '').toLowerCase();
  if (UNMODELLED_BANDS.includes(`band ${key}`)) {
    return null;
  }
  const id = (Object.values(AFC_BANDS) as string[])
    .find((b) => b === key);
  invariant(
    id !== undefined,
    `afc-scales: no band id for the printed band "${printed}"`,
  );
  return id as AfcBandId;
}

/** A publisher's rows grouped by the band they print, in printed order,
 *  with the unmodelled bands left out. */
function rowsByBand<Row extends {band: string}>(
  rows: readonly Row[],
): Map<AfcBandId, Row[]> {
  const out = new Map<AfcBandId, Row[]>();
  for (const row of rows) {
    const id = bandIdOf(row.band);
    if (id) {
      out.set(id, [...(out.get(id) ?? []), row]);
    }
  }
  return out;
}

/**
 * An Agenda for Change point from the year of service it is first
 * reached in: the label every nation's scale prints, and the same year
 * as a number, so a reader that needs the timing never has to parse it
 * back out of the label. The one producer of both, for all four nations.
 */
function afcPoint(
  year: number, isTop: boolean, salary: number,
): SteppedPoint {
  return {
    label: isTop ? `Year ${year}+` : `Year ${year}`,
    salary,
    yearsExperience: year - 1,
  };
}

/**
 * A stepped row → its points.
 *
 * The entry point is always Year 1. Each later step is reached after
 * the printed interval, so its year is the running total plus one.
 */
function pointsFromStepped(row: SteppedBandRow): SteppedPoint[] {
  const nextYear = 1 + row.yearsToNext;
  if (row.intermediate === undefined) {
    return [
      afcPoint(1, false, row.entry),
      afcPoint(nextYear, true, row.top),
    ];
  }
  return [
    afcPoint(1, false, row.entry),
    afcPoint(nextYear, false, row.intermediate),
    afcPoint(nextYear + row.yearsToTop, true, row.top),
  ];
}

/** A flat row → its single point. */
function pointsFromFlat(row: FlatBandRow): SteppedPoint[] {
  // Year 1 without a `+`: the circular prints one figure and no
  // progression, so there is no service beyond the point to signal.
  return [afcPoint(1, false, row.salary)];
}

/**
 * Scotland's Annex C → points.
 *
 * Consecutive increments at one salary are one pay point, and the
 * increment the run starts at is that point's year. The last run is
 * the top.
 */
function pointsFromJourney(rows: readonly PayJourneyRow[]): SteppedPoint[] {
  const runs: {year: number; salary: number}[] = [];
  for (const row of rows) {
    const last = runs.at(-1);
    if (!last || last.salary !== row.salary) {
      runs.push({year: row.increment, salary: row.salary});
    }
  }
  invariant(
    runs.length > 0,
    'afc-scales: a pay journey with no increments',
  );
  return runs.map((run, i) =>
    afcPoint(run.year, i === runs.length - 1, run.salary));
}

/** Every band a publisher prints in the shared shape, keyed by id. */
function scalesFrom(
  printed: PrintedAfcTables,
): Record<AfcBandId, SteppedPoint[]> {
  const out: Partial<Record<AfcBandId, SteppedPoint[]>> = {};
  for (const row of printed.flatBands) {
    const id = bandIdOf(row.band);
    if (id) {
      out[id] = pointsFromFlat(row);
    }
  }
  for (const row of printed.steppedBands) {
    const id = bandIdOf(row.band);
    if (id) {
      out[id] = pointsFromStepped(row);
    }
  }
  return assertEveryBand(out);
}

/**
 * Every band must be present.
 *
 * A table that omits one is either a transcription that stopped early
 * or a genuine change in what the nation publishes, and both need a
 * person to look. Failing here beats serving a band page with nothing
 * on it.
 */
function assertEveryBand(
  out: Partial<Record<AfcBandId, SteppedPoint[]>>,
): Record<AfcBandId, SteppedPoint[]> {
  for (const band of Object.values(AFC_BANDS)) {
    invariant(
      out[band] !== undefined,
      `afc-scales: no points transcribed for band ${band}`,
    );
  }
  return out as Record<AfcBandId, SteppedPoint[]>;
}

/** Scotland's bands, from the Annex C pay journey. */
function scotlandScales(
  journey: readonly PayJourneyRow[],
): Record<AfcBandId, SteppedPoint[]> {
  const out: Partial<Record<AfcBandId, SteppedPoint[]>> = {};
  for (const [id, rows] of rowsByBand(journey)) {
    out[id] = pointsFromJourney(rows);
  }
  return assertEveryBand(out);
}

/** Scotland's 2026-27 ladder carrying Annex B 2025-26's salaries: the
 *  same points, each with that year's salary at its position. */
function withAnnexBSalaries(
  shape: Record<AfcBandId, SteppedPoint[]>,
  salaries: Map<AfcBandId, number[]>,
): Record<AfcBandId, SteppedPoint[]> {
  const out: Partial<Record<AfcBandId, SteppedPoint[]>> = {};
  for (const [band, points] of Object.entries(shape) as
    [AfcBandId, SteppedPoint[]][]) {
    const yearSalaries = salaries.get(band);
    invariant(
      yearSalaries !== undefined && yearSalaries.length === points.length,
      `afc-scales: Scotland ${band} has ${points.length} points in `
      + `Annex C but ${yearSalaries?.length ?? 0} in Annex B 2025-26`,
    );
    // The lengths are pinned equal above, so every point has its salary.
    out[band] = points.map((point, i) => ({...point, salary: yearSalaries[i]}));
  }
  return assertEveryBand(out);
}
