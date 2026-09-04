/**
 * The Agenda for Change band registry — the identity of a band,
 * separate from any year's figures.
 *
 * Its own module because a band id is more primitive than the scale
 * data: `scales.ts` holds the canonical tables and `afc-scales.ts`
 * translates the circulars into them, and both need to name a band. If
 * the registry lived with either, the other would import it and the
 * two would form a cycle that fails at module load, when the
 * translation runs.
 *
 * **Band 1 is absent, deliberately.** Every AfC circular still prints
 * it and it is closed to new entrants in all four nations. Adding it
 * is a scope decision, not a transcription fix — `afc-scales.ts` names
 * it as an excluded band so a circular carrying it does not read as a
 * gap.
 */

export const AFC_BANDS = {
  B2: '2',
  B3: '3',
  B4: '4',
  B5: '5',
  B6: '6',
  B7: '7',
  B8a: '8a',
  B8b: '8b',
  B8c: '8c',
  B8d: '8d',
  B9: '9',
} as const;

export type AfcBandId =
  (typeof AFC_BANDS)[keyof typeof AFC_BANDS];

/** Ordered band IDs — use for iteration. */
export const AFC_BAND_IDS: AfcBandId[] =
  Object.values(AFC_BANDS);
