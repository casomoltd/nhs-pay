/**
 * Translation layer: AfC circulars → canonical scale points.
 *
 * The counterpart to `medical-scales.ts` for Agenda for Change. The
 * verbatim transcriptions in `src/circulars/*` hold each publisher's
 * own table shape; this module maps them to the uniform
 * `Record<AfcBandId, ScalePoint[]>` the rest of the library speaks.
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

import type {AfcBandId} from './afc-band.js';
import {AFC_BANDS} from './afc-band.js';
import type {ScalePoint} from './scale-point.js';
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
 * Closed to new entrants in all four nations, and England is down to
 * about 1,200 FTE and falling. Skipping it is a deliberate scope
 * choice, NOT a transcription gap — which is why it is named here and
 * anything else unmapped throws. Adding it later is a change to
 * `AFC_BANDS`, and the transcriptions already carry the figures.
 */
const UNMODELLED_BANDS: readonly string[] = ['band 1'];

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

/** A point's label from the year of service it is first reached in. */
function yearLabelAt(year: number, isTop: boolean): string {
  return isTop ? `Year ${year}+` : `Year ${year}`;
}

/**
 * A stepped row → its points.
 *
 * The entry point is always Year 1. Each later step is reached after
 * the printed interval, so its year is the running total plus one.
 */
function pointsFromStepped(row: SteppedBandRow): ScalePoint[] {
  const points: ScalePoint[] = [];
  let year = 1;
  points.push({
    label: yearLabelAt(year, false),
    salary: row.entry,
  });

  if (row.intermediate !== undefined) {
    year += row.yearsToNext;
    points.push({
      label: yearLabelAt(year, false),
      salary: row.intermediate,
    });
    invariant(
      row.yearsToTop !== undefined,
      `afc-scales: ${row.band} prints an intermediate step with no `
      + 'interval to the top',
    );
    year += row.yearsToTop;
  } else {
    year += row.yearsToNext;
  }

  points.push({label: yearLabelAt(year, true), salary: row.top});
  return points;
}

/** A flat row → its single point. */
function pointsFromFlat(row: FlatBandRow): ScalePoint[] {
  // Year 1 without a `+`: the circular prints one figure and no
  // progression, so there is no service beyond the point to signal.
  return [{label: 'Year 1', salary: row.salary}];
}

/**
 * Scotland's Annex C → points.
 *
 * Consecutive increments at one salary are one pay point, and the
 * increment the run starts at is that point's year. The last run is
 * the top.
 */
function pointsFromJourney(rows: readonly PayJourneyRow[]): ScalePoint[] {
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
  return runs.map((run, i) => ({
    label: yearLabelAt(run.year, i === runs.length - 1),
    salary: run.salary,
  }));
}

/** Every band a circular prints, keyed by id. */
function scalesFrom(
  flat: readonly FlatBandRow[],
  stepped: readonly SteppedBandRow[],
): Record<AfcBandId, ScalePoint[]> {
  const out: Partial<Record<AfcBandId, ScalePoint[]>> = {};
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
  out: Partial<Record<AfcBandId, ScalePoint[]>>,
): Record<AfcBandId, ScalePoint[]> {
  for (const band of Object.values(AFC_BANDS)) {
    invariant(
      out[band] !== undefined,
      `afc-scales: no points transcribed for band ${band}`,
    );
  }
  return out as Record<AfcBandId, ScalePoint[]>;
}

/** Scotland's bands, from the Annex C pay journey. */
function scotlandScales(
  journey: readonly PayJourneyRow[],
): Record<AfcBandId, ScalePoint[]> {
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
  const out: Partial<Record<AfcBandId, ScalePoint[]>> = {};
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
  AfcBandId, ScalePoint[]
> => {
  const salaries = scotlandAnnexB('2025-26');
  const out: Partial<Record<AfcBandId, ScalePoint[]>> = {};
  for (const [band, points] of Object.entries(
    SCOTLAND_SCALES_2026_27,
  ) as [AfcBandId, ScalePoint[]][]) {
    const yearSalaries = salaries.get(band);
    invariant(
      yearSalaries !== undefined
      && yearSalaries.length === points.length,
      `afc-scales: Scotland ${band} has ${points.length} points in `
      + `Annex C but ${yearSalaries?.length ?? 0} in Annex B 2025-26`,
    );
    out[band] = points.map((point, i) => ({
      label: point.label,
      salary: yearSalaries[i]!,
    }));
  }
  return assertEveryBand(out);
})();
