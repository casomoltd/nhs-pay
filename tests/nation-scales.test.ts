/**
 * Nation-aware getAfcScales tests — Scotland uplift,
 * Wales floor, and backward compatibility.
 */

import {describe, it, expect} from 'vitest';
import {
  applyScotlandUplift,
  getAfcScales,
} from '../src/index.js';

describe('applyScotlandUplift', () => {
  it('applies 3.75% for 2026-27', () => {
    expect(
      applyScotlandUplift(31049, '2026-27'),
    ).toBe(32213);
  });

  it('returns salary unchanged for 2025-26', () => {
    expect(
      applyScotlandUplift(31049, '2025-26'),
    ).toBe(31049);
  });
});

describe('getAfcScales nation param', () => {
  it('Scotland Band 5(1) = 32213 for 2026-27', () => {
    const {bands} =
      getAfcScales('2026-27', 'scotland');
    const b5 = bands.find((b) => b.band === '5');
    expect(b5?.points[0].salary).toBe(32213);
  });

  it('england explicit === no nation (compat)', () => {
    const eng =
      getAfcScales('2026-27', 'england');
    const def = getAfcScales('2026-27');
    expect(eng).toEqual(def);
  });

  it('Wales Band 2 >= 26300 for 2026-27', () => {
    const {bands} =
      getAfcScales('2026-27', 'wales');
    const b2 = bands.find((b) => b.band === '2');
    expect(b2?.points[0].salary).toBeGreaterThanOrEqual(
      26300,
    );
  });

  it('Scotland 2025-26 === default (no uplift)', () => {
    const sco =
      getAfcScales('2025-26', 'scotland');
    const def = getAfcScales('2025-26');
    expect(sco).toEqual(def);
  });
});
