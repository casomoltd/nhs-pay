/**
 * Nation-aware getAfcScales tests — Scotland tables,
 * Wales floor, and backward compatibility.
 */

import {describe, it, expect} from 'vitest';
import {getAfcScales} from '../src/index.js';

describe('getAfcScales nation param', () => {
  it('Scotland B5(1) = 33295 for 2025-26', () => {
    const {bands} =
      getAfcScales('2025-26', 'scotland');
    const b5 = bands.find((b) => b.band === '5');
    expect(b5?.points[0].salary).toBe(33295);
  });

  it('Scotland B5(1) = 34544 for 2026-27', () => {
    const {bands} =
      getAfcScales('2026-27', 'scotland');
    const b5 = bands.find((b) => b.band === '5');
    expect(b5?.points[0].salary).toBe(34544);
  });

  it('Scotland B8a has 2 points', () => {
    const {bands} =
      getAfcScales('2026-27', 'scotland');
    const b8a = bands.find(
      (b) => b.band === '8a',
    );
    expect(b8a?.points).toHaveLength(2);
  });

  it('Scotland differs from England', () => {
    const sco =
      getAfcScales('2025-26', 'scotland');
    const eng = getAfcScales('2025-26');
    const scoB5 = sco.bands.find(
      (b) => b.band === '5',
    );
    const engB5 = eng.bands.find(
      (b) => b.band === '5',
    );
    expect(scoB5?.salaryMin).not.toBe(
      engB5?.salaryMin,
    );
  });

  it('england explicit === no nation', () => {
    const eng =
      getAfcScales('2026-27', 'england');
    const def = getAfcScales('2026-27');
    expect(eng).toEqual(def);
  });

  it('Wales B2 >= 26300 for 2026-27', () => {
    const {bands} =
      getAfcScales('2026-27', 'wales');
    const b2 = bands.find((b) => b.band === '2');
    expect(
      b2?.points[0].salary,
    ).toBeGreaterThanOrEqual(26300);
  });
});
