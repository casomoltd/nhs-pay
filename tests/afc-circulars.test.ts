/**
 * The AfC circular layer: does the translation say what the documents
 * say?
 *
 * `pay-scales.csv` already pins every salary against its publisher.
 * What that cannot check is the STRUCTURE this layer adds — the point
 * labels derived from each publisher's own progression column, and the
 * agreement between two annexes of one circular. Those are the claims
 * the layer exists to make, so they are asserted here.
 */

import {describe, expect, it} from 'vitest';
import {
  NI_SCALES_2025_26,
  SCOTLAND_SCALES_2025_26,
  SCOTLAND_SCALES_2026_27,
  WALES_SCALES_2025_26,
  WALES_SCALES_2026_27,
  scotlandAnnexB,
} from '../src/afc-scales.js';
import {AFC_BAND_IDS} from '../src/afc-band.js';
import {
  SCOTLAND_PCS_AFC_2026_01,
} from '../src/circulars/scotland-pcs-afc-2026-01.js';
import {WALES_AFC_W_02_2026} from '../src/circulars/wales-afc-w-02-2026.js';
import {NI_HSC_AFC_06_2025} from '../src/circulars/ni-hsc-afc-06-2025.js';

const YEARS = ['2025-26', '2026-27'] as const;

describe("Scotland's two annexes agree", () => {
  // Annex B prints the salaries against a bare point number; Annex C
  // prints them against the year of service. The labels come from C
  // and the figures a reader sees come from the same circular, so a
  // transcription slip in either annex has to show up here — nothing
  // else compares them.
  it.each(YEARS)('%s salaries match Annex B, in order', (year) => {
    const annexB = scotlandAnnexB(year);
    const derived = year === '2025-26'
      ? SCOTLAND_SCALES_2025_26
      : SCOTLAND_SCALES_2026_27;
    expect(annexB.size).toBe(AFC_BAND_IDS.length);
    for (const band of AFC_BAND_IDS) {
      expect(
        derived[band].map((p) => p.salary),
        `Scotland ${year} band ${band}`,
      ).toEqual(annexB.get(band));
    }
  });
});

describe('point labels are derived from the published interval', () => {
  // Wales prints "Years until eligible for pay progression". A band
  // whose entry waits 2 years reaches its next point in year 3 — so
  // the label has to read Year 3, and the top point carries a `+`.
  // The expected labels are TYPED OUT, not recomputed from the row
  // being tested. Deriving them the same way the code does would make
  // this agree with whatever the code is changed to — the defect this
  // repo has hit before, and one it hit again while this test was
  // being written.
  it.each([
    ['2', ['Year 1', 'Year 3+']],
    ['3', ['Year 1', 'Year 3+']],
    ['4', ['Year 1', 'Year 4+']],
    ['5', ['Year 1', 'Year 3', 'Year 5+']],
    ['6', ['Year 1', 'Year 3', 'Year 6+']],
    ['7', ['Year 1', 'Year 3', 'Year 6+']],
    ['8a', ['Year 1', 'Year 3', 'Year 6+']],
    ['8b', ['Year 1', 'Year 3', 'Year 6+']],
    ['8c', ['Year 1', 'Year 3', 'Year 6+']],
    ['8d', ['Year 1', 'Year 3', 'Year 6+']],
    ['9', ['Year 1', 'Year 3', 'Year 6+']],
  ] as const)("Wales band %s reads as the circular prints", (
    band, labels,
  ) => {
    const points = WALES_SCALES_2026_27[
      band as keyof typeof WALES_SCALES_2026_27
    ];
    expect(points.map((p) => p.label)).toEqual([...labels]);
  });

  it('covers every Welsh band the circular prints', () => {
    // A guard on the table above: if the circular grows a band, the
    // list stops being exhaustive and this says so.
    const printed = WALES_AFC_W_02_2026.steppedBands
      .filter((r) => r.band !== 'Band 1').length;
    expect(printed).toBe(11);
  });

  it("matches Scotland's Annex C increments", () => {
    // Band 8a upward sit at one rate for five increments and step at
    // the sixth — four years longer than a labelling convention could
    // account for, and the reason Scotland's labels are read from its
    // own annex rather than assumed to match England's.
    expect(SCOTLAND_SCALES_2026_27['8a'].map((p) => p.label))
      .toEqual(['Year 1', 'Year 6+']);
    expect(SCOTLAND_SCALES_2026_27['5'].map((p) => p.label))
      .toEqual(['Year 1', 'Year 3', 'Year 5+']);
  });
});

describe('the circulars are transcribed as printed', () => {
  it('NI prints Bands 1 and 2 flat, with no progression', () => {
    // England's publisher prints Band 2 with an entry point, a
    // two-year interval and a top point. NI's prints one figure. Same
    // cash, different published structure — and copying England's
    // shape across is a mistake this library has already made once.
    const flat = NI_HSC_AFC_06_2025.flatBands.map((r) => r.band);
    expect(flat).toEqual(['Band 1', 'Band 2']);
    expect(NI_SCALES_2025_26['2']).toHaveLength(1);
    expect(NI_HSC_AFC_06_2025.steppedBands[0].band).toBe('Band 3');
  });

  it("Wales's Band 2 is compressed by the living-wage floor", () => {
    // Entry and top print as the same figure. Transcribed as printed
    // rather than collapsed, because the publisher still prints it as
    // a progression.
    const points = WALES_SCALES_2025_26['2'];
    expect(new Set(points.map((p) => p.salary)).size).toBe(1);
  });

  it('Scotland records the revision that superseded 4.25%', () => {
    // The single most expensive fact in this file's history: the
    // superseded column stood on 50 pay points for a year.
    expect(SCOTLAND_PCS_AFC_2026_01.uplifts['2025-26'])
      .toEqual({pct: 4.4, supersededPct: 4.25});
  });

  it("Scotland's published hourly rates change divisor in 2026", () => {
    // 37 hours for 2025-26, 36 from 1 April 2026. The change is
    // visible only in the hourly column — no annual salary reveals it.
    const b1From2025 = SCOTLAND_PCS_AFC_2026_01.annexB2025
      .find((r) => r.band === 'Band 1');
    const b1From2026 = SCOTLAND_PCS_AFC_2026_01.annexB2026
      .find((r) => r.band === 'Band 1');
    expect(b1From2025?.hourly).toBe(13.27);
    expect(b1From2026?.hourly).toBe(14.15);
  });
});

// ── Scotland 2025-26, against the annex it is NOT built from ──

/**
 * Read straight off Annex C's 2025-26 "Full pay journey" in the PDF.
 *
 * `SCOTLAND_SCALES_2025_26` is built from the 2026-27 journey's SHAPE
 * with Annex B's 2025-26 salaries, because the circular prints an
 * identical increment structure for both years. That is a shortcut,
 * and this table is the independent oracle for it: these values come
 * from the 2025-26 table the build does not read, so if the shape
 * ever stops being shared this fails rather than agreeing with
 * whatever the code was changed to.
 */
const ANNEX_C_2025: Record<string, ReadonlyArray<readonly [string, number]>> = {
  '2': [['Year 1', 25731], ['Year 3+', 27941]],
  '3': [['Year 1', 28051], ['Year 3+', 30274]],
  '4': [['Year 1', 30397], ['Year 4+', 33063]],
  '5': [['Year 1', 33295], ['Year 3', 35576], ['Year 5+', 41483]],
  '6': [['Year 1', 41668], ['Year 3', 43503], ['Year 6+', 50775]],
  '7': [['Year 1', 50935], ['Year 3', 52880], ['Year 6+', 59244]],
  '8a': [['Year 1', 62772], ['Year 6+', 67762]],
  '8b': [['Year 1', 74109], ['Year 6+', 79278]],
  '8c': [['Year 1', 87526], ['Year 6+', 93820]],
  '8d': [['Year 1', 103913], ['Year 6+', 108362]],
  '9': [['Year 1', 122912], ['Year 6+', 128236]],
};

describe("Scotland 2025-26 matches Annex C's own table", () => {
  it.each(Object.entries(ANNEX_C_2025))('band %s', (band, expected) => {
    const got = SCOTLAND_SCALES_2025_26[
      band as keyof typeof SCOTLAND_SCALES_2025_26
    ];
    expect(got.map((p) => [p.label, p.salary]))
      .toEqual(expected.map((e) => [...e]));
  });
});
