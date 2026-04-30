import {describe, expect, it} from 'vitest';
import {
  getHcasPcts,
  getHcasZone,
} from '../src/hcas-pcts.js';

describe('getHcasZone', () => {
  it('finds Camden in inner-london', () => {
    expect(getHcasZone('Camden'))
      .toBe('inner-london');
  });

  it('is case-insensitive', () => {
    expect(getHcasZone('camden'))
      .toBe('inner-london');
  });

  it('returns null for unknown PCT', () => {
    expect(getHcasZone('Nonexistent'))
      .toBeNull();
  });

  it('finds Brent in outer-london', () => {
    expect(getHcasZone('Brent'))
      .toBe('outer-london');
  });

  it('finds Slough in fringe', () => {
    expect(getHcasZone('Slough'))
      .toBe('fringe');
  });
});

describe('getHcasPcts', () => {
  const pcts = getHcasPcts();

  it('returns 53 PCTs total', () => {
    expect(pcts).toHaveLength(53);
  });

  it('has 11 inner-london PCTs', () => {
    const inner = pcts.filter(
      (p) => p.zone === 'inner-london',
    );
    expect(inner).toHaveLength(11);
  });

  it('has 20 outer-london PCTs', () => {
    const outer = pcts.filter(
      (p) => p.zone === 'outer-london',
    );
    expect(outer).toHaveLength(20);
  });

  it('has 22 fringe PCTs', () => {
    const fringe = pcts.filter(
      (p) => p.zone === 'fringe',
    );
    expect(fringe).toHaveLength(22);
  });
});
