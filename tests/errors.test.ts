import {describe, expect, it} from 'vitest';
import {
  BeforeStatement, isBeforeStatement, STATEMENT_READS,
} from '../src/errors.js';

describe('BeforeStatement', () => {
  const statement = new Date(2025, 2, 31);

  it('holds a read made before the statement\'s 31 March', () => {
    const on = new Date(2024, 8, 30);
    const refused = new BeforeStatement(STATEMENT_READS.balance, on, statement);
    expect(refused.on).toBe(on);
    expect(refused.name).toBe('BeforeStatement');
  });

  it.each([
    ['on', new Date(2025, 2, 31)],
    ['after', new Date(2025, 3, 1)],
  ])('refuses to be made for a read %s the statement', (_, on) => {
    // The statement holds a balance from its own day, so refusing a read
    // there or later is a bug.
    expect(() => new BeforeStatement(STATEMENT_READS.balance, on, statement))
      .toThrow(/not before the statement/);
  });
});

describe('isBeforeStatement', () => {
  const statement = new Date(2025, 2, 31);

  it('is before only strictly before the statement\'s day', () => {
    expect(isBeforeStatement(new Date(2025, 2, 30), statement)).toBe(true);
    expect(isBeforeStatement(statement, statement)).toBe(false);
    expect(isBeforeStatement(new Date(2025, 3, 1), statement)).toBe(false);
  });

  it('answers every date where there is no statement', () => {
    expect(isBeforeStatement(new Date(2000, 0, 1), null)).toBe(false);
  });
});
