/**
 * The one GAD factor set every drawing reads, and the checks that guard
 * its transcription.
 */
import {describe, expect, it} from 'vitest';
import {factorTable, tablesOf} from '../src/gad/factor-set.js';
import {ERF_0_420} from '../src/gad/erf-0-420-2026-07-08.js';
import {LRF_0_421} from '../src/gad/lrf-0-421-2026-07-08.js';
import {LRF_0_422} from '../src/gad/lrf-0-422-2026-07-08.js';
import {ERF_1_401} from '../src/gad/erf-1-401-2026-07-08.js';
import {ERF_1_402} from '../src/gad/erf-1-402-2026-07-08.js';
import {ERF_1_407} from '../src/gad/erf-1-407-2026-07-08.js';
import {LRF_2_416} from '../src/gad/lrf-2-416-2026-07-08.js';
import {isoDate} from '../src/iso-date.js';

describe('tablesOf', () => {
  const issue = {
    early2015: ERF_0_420,
    late2015: LRF_0_421,
    late2015AdditionalPension: LRF_0_422,
    early1995Pension: ERF_1_401,
    early1995LumpSum: ERF_1_407,
    earlyAge65: ERF_1_402,
    late2008: LRF_2_416,
  };

  it('refuses a table held under a purpose that names another', () => {
    expect(() => tablesOf({...issue, late2015: LRF_0_422}))
      .toThrow(/0-422/);
  });

  it('refuses a set whose tables came into use on different days', () => {
    const late = {
      ...LRF_2_416,
      provenance: {...LRF_2_416.provenance, implemented: isoDate('2024-01-01')},
    };
    expect(() => tablesOf({...issue, late2008: late}))
      .toThrow(/2-416/);
  });
});

describe('factorTable', () => {
  it('reads the 2026 factor review set', () => {
    expect(factorTable('early2015').provenance).toBe(ERF_0_420.provenance);
    expect(factorTable('late2008').provenance).toBe(LRF_2_416.provenance);
  });
});
