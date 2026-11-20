/**
 * The family reads consumers decide "published or not" by, held against
 * the published gaps: Northern Ireland has no 2026-27 medical or dental
 * table, and Scotland's 2026/27 medical round is split over two
 * circulars.
 */
import {describe, it, expect} from 'vitest';
import {NATION_KEYS, YEAR_LABELS} from '@casomoltd/paye-calc';
import {
  DENTAL_FAMILY,
  DENTAL_GRADES,
  MEDICAL_FAMILY,
  MEDICAL_GRADES,
  PCS_DD_2026_01,
  PCS_DD_2026_02,
  ScaleUnavailable,
} from '../src/index.js';
import {gradeFamily} from '../src/scale-tables.js';

const {scotland, northernIreland} = NATION_KEYS;
const Y2026 = YEAR_LABELS.Y2026_27;
const Y2025 = YEAR_LABELS.Y2025_26;

describe('GradeFamily', () => {
  it('says Northern Ireland publishes no 2026-27 table, medical or dental', () => {
    expect(MEDICAL_FAMILY.publishes(MEDICAL_GRADES.consultant, Y2026, northernIreland))
      .toBe(false);
    expect(MEDICAL_FAMILY.publishes(MEDICAL_GRADES.consultant, Y2025, northernIreland))
      .toBe(true);
    expect(DENTAL_FAMILY.publishes(
      DENTAL_GRADES.salariedDentist, Y2026, northernIreland)).toBe(false);
    expect(MEDICAL_FAMILY.latestYear(northernIreland)).toBe(Y2025);
    expect(DENTAL_FAMILY.latestYear(northernIreland)).toBe(Y2025);
  });

  it('cites each half of Scotland\'s split 2026/27 round for its own grades', () => {
    expect(MEDICAL_FAMILY.sourceFor(MEDICAL_GRADES.consultant, Y2026, scotland))
      .toBe(PCS_DD_2026_02);
    expect(MEDICAL_FAMILY.sourceFor(MEDICAL_GRADES.fho1, Y2026, scotland))
      .toBe(PCS_DD_2026_01);
  });

  it('refuses the points of a grade the nation and year do not publish', () => {
    expect(() => MEDICAL_FAMILY.pointsFor(
      MEDICAL_GRADES.consultant, Y2026, northernIreland)).toThrow(ScaleUnavailable);
  });

  it('refuses a latest source for a nation that publishes nothing', () => {
    const empty = gradeFamily<'only'>({}, ['only']);
    expect(empty.latestYear(scotland)).toBeNull();
    expect(() => empty.latestSource(scotland)).toThrow(/publishes no scale/);
  });
});
