/**
 * Each additional pension purchase table with its mirror fixture, so the
 * suite that reads the mirrors and the check that every mirror is read
 * name them from one list.
 */
import {AP_0_703} from '../src/gad/additional-pension-0-703-2026-07-08.js';
import {AP_0_712} from '../src/gad/additional-pension-0-712-2026-07-08.js';
import {AP_0_713} from '../src/gad/additional-pension-0-713-2026-07-08.js';
import {AP_0_714} from '../src/gad/additional-pension-0-714-2026-07-08.js';
import {AP_0_715} from '../src/gad/additional-pension-0-715-2026-07-08.js';
import {AP_0_716} from '../src/gad/additional-pension-0-716-2026-07-08.js';
import {AP_0_717} from '../src/gad/additional-pension-0-717-2026-07-08.js';
import {AP_0_718} from '../src/gad/additional-pension-0-718-2026-07-08.js';
import {AP_0_719} from '../src/gad/additional-pension-0-719-2026-07-08.js';

/** Table S, the lump-sum prices. */
export const AP_LUMP_SUM_MIRROR = {
  data: AP_0_703,
  mirror: 'gad-ap-0-703-2026-07-08.csv',
};

/** The instalment tables. `cellCount` is a third pin, from the tables'
 *  shape: a row stops where age plus the payment period would pass the
 *  pension age. */
export const AP_INSTALMENT_MIRRORS = [
  {data: AP_0_712, mirror: 'gad-ap-0-712-2026-07-08.csv', cellCount: 790},
  {data: AP_0_713, mirror: 'gad-ap-0-713-2026-07-08.csv', cellCount: 810},
  {data: AP_0_714, mirror: 'gad-ap-0-714-2026-07-08.csv', cellCount: 830},
  {data: AP_0_715, mirror: 'gad-ap-0-715-2026-07-08.csv', cellCount: 850},
  {data: AP_0_716, mirror: 'gad-ap-0-716-2026-07-08.csv', cellCount: 790},
  {data: AP_0_717, mirror: 'gad-ap-0-717-2026-07-08.csv', cellCount: 810},
  {data: AP_0_718, mirror: 'gad-ap-0-718-2026-07-08.csv', cellCount: 830},
  {data: AP_0_719, mirror: 'gad-ap-0-719-2026-07-08.csv', cellCount: 850},
];
