/**
 * The dummy ESR payslip (#sa-92) against the library. It reads only what
 * the fixture can be trusted for (its header says why): the basic monthly
 * hours a standard week gives. Its enhancement and overtime lines are
 * transcribed for the day the library prices pay from hours; the totals are
 * never asserted.
 */

import {describe, expect, it} from 'vitest';
import {hoursPerYear} from '../src/index.js';
import {SA92} from './fixtures/payslip-sa92.js';

const MONTHS = 12;

describe('the SA-92 payslip', () => {
  it('prints the basic monthly hours a 37.5-hour week gives', () => {
    const [basic] = SA92.lines;
    expect(basic.description).toBe('Basic Pay');
    if (basic.worked === undefined) throw new Error('Basic Pay has hours');
    const monthly = hoursPerYear(SA92.standardHours) / MONTHS;
    expect(monthly.toFixed(2)).toBe(basic.worked.toFixed(2));
  });
});
