/**
 * The newest medical document a nation has published, pinned against the
 * two claims its doc makes: Scotland's 2026/27 round is split across two
 * circulars and the later one wins, and a nation with no current round
 * falls back to its newest.
 */
import {describe, it, expect} from 'vitest';
import {
  HSC_TC8_05_2025,
  NATION_KEYS,
  PCS_DD_2026_02,
  latestMedicalSource,
} from '../src/index.js';

describe('latestMedicalSource', () => {
  it('picks the later of Scotland\'s two 2026/27 circulars', () => {
    expect(latestMedicalSource(NATION_KEYS.scotland)).toBe(PCS_DD_2026_02);
  });

  it('falls back to Northern Ireland\'s 2025-26 circular', () => {
    expect(latestMedicalSource(NATION_KEYS.northernIreland)).toBe(HSC_TC8_05_2025);
  });
});
