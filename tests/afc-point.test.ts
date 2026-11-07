/**
 * afcPointOf: one AfC point by band and label, read off the same scale
 * `getAfcScales` publishes, so the two cannot disagree.
 */
import {describe, expect, it} from 'vitest';
import {payYear} from '@casomoltd/paye-calc';
import {
  afcPointOf, getAfcScales, ScaleUnavailable,
} from '../src/index.js';

const YEAR = payYear('2026-27');

describe('afcPointOf', () => {
  it('is the band\'s own point, among the band\'s own points', () => {
    const band = getAfcScales(YEAR, 'england').bands
      .find((b) => b.band === '5');
    const on = afcPointOf(YEAR, 'england', '5', 'Year 1');
    expect(on.points).toBe(band?.points);
    expect(on.current.label).toBe('Year 1');
    // The point itself, not a copy, so a ladder built on it finds it.
    expect(on.points).toContain(on.current);
  });

  it('refuses a label the band does not have', () => {
    expect(() => afcPointOf(YEAR, 'england', '5', 'Year 99'))
      .toThrow(ScaleUnavailable);
  });

  it('refuses a year the nation has not published', () => {
    expect(() => afcPointOf(payYear('2024-25'), 'england', '5', 'Year 1'))
      .toThrow(ScaleUnavailable);
  });

  it('resolves every point of every band by its label', () => {
    // A label naming two points would throw AmbiguousScalePoint; no AfC
    // band repeats one, so that refusal is unreachable on today's data and
    // each label resolves to its own point.
    for (const {band, points} of getAfcScales(YEAR, 'england').bands) {
      for (const point of points) {
        expect(afcPointOf(YEAR, 'england', band, point.label).current)
          .toBe(point);
      }
    }
  });
});
