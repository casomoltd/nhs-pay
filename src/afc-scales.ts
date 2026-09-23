/**
 * Translation layer: AfC circulars → canonical scale points.
 *
 * The counterpart to `medical-scales.ts` for Agenda for Change. The
 * verbatim transcriptions in `src/circulars/*` hold each publisher's
 * own table shape; this module maps them to the uniform
 * `Record<AfcBandId, SteppedPoint[]>` the rest of the library speaks.
 *
 * **England is a deliberate exception and stays in `scales.ts`.** It
 * publishes no AfC circular — its scales are an NHS Employers web page
 * plus a poster — so there is nothing to transcribe. The rule this
 * layer follows is: *where the publisher issues a circular, transcribe
 * it verbatim; where it publishes a web table, cite it and pin it with
 * fixtures.* Inventing a pseudo-circular file for England to make the
 * four shapes match would assert a document that does not exist, which
 * is worse than the asymmetry.
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

import type {Nation, PayYear} from '@casomoltd/paye-calc';
import {NATION_KEYS, TAX_YEARS, payYear} from '@casomoltd/paye-calc';
import type {DocumentSource} from './document-source.js';
import {
  AFC_NI_2025,
  AFC_SCOTLAND,
  AFC_W_02_2025,
  AFC_W_02_2026,
} from './sources.js';
import type {AfcBandId} from './afc-band.js';
import {AFC_BANDS} from './afc-band.js';
import type {SteppedPoint} from './scale-point.js';
import {invariant} from './errors.js';
import type {
  FlatBandRow,
  PayJourneyRow,
  SteppedBandRow,
} from './circulars/afc-shapes.js';
import {WALES_AFC_W_02_2025} from './circulars/wales-afc-w-02-2025.js';
import {WALES_AFC_W_02_2026} from './circulars/wales-afc-w-02-2026.js';
import {NI_HSC_AFC_06_2025} from './circulars/ni-hsc-afc-06-2025.js';
import {
  SCOTLAND_PCS_AFC_2026_01,
} from './circulars/scotland-pcs-afc-2026-01.js';

/**
 * Band 1, which every AfC circular still prints and this library does
 * not model.
 *
 * Closed to new entrants in England, Wales and Northern Ireland, and
 * **open in Scotland**, whose PCS(AFC)2026/1 carries no closure
 * statement and gives it a full Annex C pay journey. England is down
 * to about 1,200 FTE and falling.
 *
 * Not modelled as a RUNG: it is absent from `AFC_BANDS`, so the ladder
 * translation skips it by name here and anything else unmapped throws.
 * That is the whole job of this list — take it away and every nation's
 * Band 1 row fails at module load.
 *
 * It is reachable, though, through {@link afcBand1}, which is a lookup
 * beside the ladder rather than a rung added to it. Making it a rung
 * shifts every index that reads the band list by position, and that is
 * a separate piece of work.
 */
const UNMODELLED_BANDS: readonly string[] = ['band 1'];

/** Band 1 as a nation publishes it, for the one nation still paying it
 *  to new entrants. */
export interface AfcBand1 {
  readonly year: PayYear;
  readonly salary: number;
  /** What the circular says about the band's status, verbatim, where it
   *  says anything — "closed to new entrants" for the three nations
   *  that print it. Absent for Scotland, whose PCS(AFC)2026/1 carries no
   *  closure statement and gives Band 1 a full Annex C pay journey, so
   *  it is a band people are still hired onto. Carried with the figure
   *  so a consumer stops typing the closure list by hand. */
  readonly note?: string;
  readonly source: DocumentSource;
}

/** A band's nation, attached from the key it is stored under rather
 *  than stored beside it — one fact, one producer. */
export interface AfcBand1Published extends AfcBand1 {
  readonly nation: Nation;
}

/**
 * What we hold for Band 1, per nation.
 *
 * **Total over `Nation`, so an absence is a claim somebody made rather
 * than a silence.** An empty array is a sentence a reviewer can check
 * against the circular; no entry at all is indistinguishable from
 * nobody having looked.
 *
 * Read off the transcription, never retyped: the circular file is the
 * producer, and a second copy is a figure free to drift from the
 * document it claims to quote.
 */
const BAND_1: Record<Nation, readonly AfcBand1[]> = {
  // Empty because there is no transcription to read it OFF, not because
  // the publisher withholds it. NHS Employers prints Band 1 like every
  // other nation — £25,272 for 2026/27, footnoted "Band 1 closed to new
  // entrants", on both the pay-scales poster and the web table. But
  // England issues no AfC circular, so it has no file under
  // `circulars/` and `band1Of` has nothing to read; authoring the
  // figure here instead would be the first hand-typed scale value in
  // this record, against the rule stated above it. Reaching England's
  // Band 1 means deciding that separately.
  [NATION_KEYS.england]: [],
  [NATION_KEYS.wales]: [
    band1Of(WALES_AFC_W_02_2025.flatBands, payYear(TAX_YEARS.Y2025_26),
      AFC_W_02_2025, 'AfC(W) 02/2025'),
    band1Of(WALES_AFC_W_02_2026.flatBands, payYear(TAX_YEARS.Y2026_27),
      AFC_W_02_2026, 'AfC(W) 02/2026'),
  ],
  [NATION_KEYS.northernIreland]: [
    band1Of(NI_HSC_AFC_06_2025.flatBands, payYear(TAX_YEARS.Y2025_26),
      AFC_NI_2025, 'HSC (AfC) 06/2025'),
  ],
  // Scotland is the exception the whole accessor exists for: its
  // PCS(AFC)2026/1 carries no closure statement for Band 1 and gives it
  // a full Annex C pay journey, so it is a band people are hired onto.
  [NATION_KEYS.scotland]: [
    band1FromAnnexB(SCOTLAND_PCS_AFC_2026_01.annexB2025,
      payYear(TAX_YEARS.Y2025_26)),
    band1FromAnnexB(SCOTLAND_PCS_AFC_2026_01.annexB2026,
      payYear(TAX_YEARS.Y2026_27)),
  ],
};

/** Band 1 from a circular's flat-band table, which is where the three
 *  nations that close it print it — above the stepped table, on its own,
 *  with no progression columns. */
function band1Of(
  rows: readonly {band: string; salary: number; note?: string}[],
  year: PayYear,
  source: DocumentSource,
  which: string,
): AfcBand1 {
  const found = rows.filter((r) => r.band === 'Band 1');
  invariant(
    found.length === 1,
    `afcBand1: ${which} prints ${found.length} Band 1 rows, expected 1`,
  );
  const [row] = found;
  return {
    year,
    salary: row.salary,
    ...(row.note !== undefined ? {note: row.note} : {}),
    source,
  };
}

/** Band 1 from Scotland's Annex B, which prints one row per point. The
 *  count is asserted rather than the first match taken: Band 1 has one
 *  point today, and a circular giving it two would otherwise return
 *  point 1 silently while a consumer says entry and top are the same. */
function band1FromAnnexB(
  rows: readonly {band: string; salary: number}[],
  year: PayYear,
): AfcBand1 {
  const found = rows.filter((r) => r.band === 'Band 1');
  invariant(
    found.length === 1,
    `afcBand1: Scotland's ${year} Annex B prints ${found.length} `
    + 'Band 1 rows, expected 1',
  );
  return {year, salary: found[0].salary, source: AFC_SCOTLAND};
}

/**
 * Band 1 for a nation and pay year, or `undefined` where that nation
 * publishes none we hold.
 *
 * Deliberately NOT part of `AFC_BANDS` or the scale list. Band 1 joining
 * either shifts every index that reads the list by position, and this
 * needs to shift nothing — it is a lookup beside the ladder, not a rung
 * added to it.
 */
export function afcBand1(
  year: PayYear,
  nation: Nation,
): AfcBand1Published | undefined {
  const found = BAND_1[nation].find((b) => b.year === year);
  return found ? {...found, nation} : undefined;
}

/**
 * A band as a circular prints it → the id this library uses, or `null`
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

/**
 * An Agenda for Change point from the year of service it is first
 * reached in: the label every nation's scale prints, and the same year
 * as a number, so a reader that needs the timing never has to parse it
 * back out of the label. The one producer of both, for all four nations.
 */
export function afcPoint(
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
  const points: SteppedPoint[] = [];
  let year = 1;
  points.push(afcPoint(year, false, row.entry));

  if (row.intermediate !== undefined) {
    year += row.yearsToNext;
    points.push(afcPoint(year, false, row.intermediate));
    invariant(
      row.yearsToTop !== undefined,
      `afc-scales: ${row.band} prints an intermediate step with no `
      + 'interval to the top',
    );
    year += row.yearsToTop;
  } else {
    year += row.yearsToNext;
  }

  points.push(afcPoint(year, true, row.top));
  return points;
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
    const last = runs[runs.length - 1];
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

/** Every band a circular prints, keyed by id. */
function scalesFrom(
  flat: readonly FlatBandRow[],
  stepped: readonly SteppedBandRow[],
): Record<AfcBandId, SteppedPoint[]> {
  const out: Partial<Record<AfcBandId, SteppedPoint[]>> = {};
  for (const row of flat) {
    const id = bandIdOf(row.band);
    if (id) {
      out[id] = pointsFromFlat(row);
    }
  }
  for (const row of stepped) {
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
 * A circular that omits one is either a transcription that stopped
 * early or a genuine change in what the nation publishes, and both
 * need a person to look. Failing here beats serving a band page with
 * nothing on it.
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
  const byBand = new Map<AfcBandId, PayJourneyRow[]>();
  for (const row of journey) {
    const id = bandIdOf(row.band);
    if (!id) {
      continue;
    }
    const rows = byBand.get(id) ?? [];
    rows.push(row);
    byBand.set(id, rows);
  }
  const out: Partial<Record<AfcBandId, SteppedPoint[]>> = {};
  for (const [id, rows] of byBand) {
    out[id] = pointsFromJourney(rows);
  }
  return assertEveryBand(out);
}

export const WALES_SCALES_2025_26 = scalesFrom(
  WALES_AFC_W_02_2025.flatBands,
  WALES_AFC_W_02_2025.steppedBands,
);

export const WALES_SCALES_2026_27 = scalesFrom(
  WALES_AFC_W_02_2026.flatBands,
  WALES_AFC_W_02_2026.steppedBands,
);

export const NI_SCALES_2025_26 = scalesFrom(
  NI_HSC_AFC_06_2025.flatBands,
  NI_HSC_AFC_06_2025.steppedBands,
);

/**
 * Scotland 2026-27, from Annex C.
 *
 * Annex C rather than Annex B because only Annex C carries the year of
 * service. Annex B gives the same salaries against a bare point
 * number, which cannot produce a label — `scotlandAnnexB` below exists
 * so a fixture can check the two annexes agree.
 */
export const SCOTLAND_SCALES_2026_27 = scotlandScales(
  SCOTLAND_PCS_AFC_2026_01.payJourney2026,
);

/**
 * Annex B's salaries for a year, keyed by band, in printed order.
 *
 * Exposed so a test can assert that the annex a label came from and
 * the annex the salaries were published in agree. Two annexes of one
 * circular disagreeing would mean a transcription error in one of
 * them, and nothing else would notice.
 */
export function scotlandAnnexB(
  year: '2025-26' | '2026-27',
): Map<AfcBandId, number[]> {
  const rows = year === '2025-26'
    ? SCOTLAND_PCS_AFC_2026_01.annexB2025
    : SCOTLAND_PCS_AFC_2026_01.annexB2026;
  const out = new Map<AfcBandId, number[]>();
  for (const row of rows) {
    const id = bandIdOf(row.band);
    if (!id) {
      continue;
    }
    out.set(id, [...(out.get(id) ?? []), row.salary]);
  }
  return out;
}

/**
 * Scotland 2025-26.
 *
 * Built from the 2026-27 journey's SHAPE with Annex B's 2025-26
 * salaries: the circular prints an identical increment structure for
 * both years — the settlement changed the rates, not the ladder — and
 * Annex C's 2025-26 table restates that structure rather than adding
 * to it. Building the year from Annex B against a shape the circular
 * publishes twice is faithful; re-typing the same increments would
 * only add a second place to mistype them.
 */
export const SCOTLAND_SCALES_2025_26 = ((): Record<
  AfcBandId, SteppedPoint[]
> => {
  const salaries = scotlandAnnexB('2025-26');
  const out: Partial<Record<AfcBandId, SteppedPoint[]>> = {};
  for (const [band, points] of Object.entries(
    SCOTLAND_SCALES_2026_27,
  ) as [AfcBandId, SteppedPoint[]][]) {
    const yearSalaries = salaries.get(band);
    invariant(
      yearSalaries !== undefined
      && yearSalaries.length === points.length,
      `afc-scales: Scotland ${band} has ${points.length} points in `
      + `Annex C but ${yearSalaries?.length ?? 0} in Annex B 2025-26`,
    );
    out[band] = points.map((point, i) => ({
      ...point,
      salary: yearSalaries[i]!,
    }));
  }
  return assertEveryBand(out);
})();
