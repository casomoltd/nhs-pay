/**
 * The 2015 Section: career average at 1/54, a pension age that is the
 * member's State Pension age with a floor of 65. Internal: reached only
 * through the member's benefits.
 */
import {npaDate} from '../dates.js';
import {FACTOR_SOURCES, readFactor} from '../factor-basis.js';
import type {FactorBasis, FactorOutcome} from '../factor-basis.js';
import {normalPensionAge} from '../npa.js';
import {atDrawing, buildLedger} from '../pension/ledger.js';
import type {MemberLedger, PayIn} from '../pension/ledger.js';
import type {Prices} from '../pension/prices.js';
import type {LedgerSeed} from '../pension/seed.js';

/**
 * The factor for a pension determined under the 2015 Section's rules,
 * drawn on `drawn`: 0-420 early and 0-421 late, by the period to or
 * after the member's own pension age. The remedy window valued on the
 * 2015 basis reads this too, because its benefits are determined under
 * these rules although the legacy section pays them.
 */
export function factor2015(
  dateOfBirth: Date,
  drawn: Date,
): FactorOutcome {
  const npa = normalPensionAge(dateOfBirth);
  const at = npaDate(dateOfBirth, npa);
  const basis: FactorBasis = {
    against: 'npa', npa, direction: drawn < at ? 'early' : 'late',
  };
  return readFactor(basis, dateOfBirth, drawn);
}

/** One career average walk in one ruler, and the pension it draws. */
interface CareerAverageRun {
  readonly ledger: MemberLedger;
  readonly seed: LedgerSeed;
  /** At the drawing, before its factor. */
  readonly revalued: number;
  /** At the drawing, after its factor. */
  readonly drawn: number;
}

/**
 * Walk a career average pot in one ruler: the 2015 Section's own, or a
 * remedy window valued on its rules. The same engine either way, on
 * the same revaluation, to the same drawing — which is what makes the
 * two elections comparable, because revaluation is linear in each
 * year's accrual and the window's pot is exactly its own term.
 *
 * `through` is the last scheme year walked, so a caller drawing a
 * curve past the drawing has rows to draw.
 */
export function careerAverage({
  seed, payIn, dateOfBirth, leaving, drawing, prices, through,
}: {
  readonly seed: LedgerSeed;
  readonly payIn: PayIn;
  readonly dateOfBirth: Date;
  readonly leaving: Date;
  readonly drawing: Date;
  readonly prices: Prices;
  readonly through: number;
}): CareerAverageRun & {readonly factor: FactorOutcome} {
  const factor = factor2015(dateOfBirth, drawing);
  const ledger = buildLedger({
    seed,
    payIn,
    exitDate: leaving,
    retirementDate: drawing,
    prices,
    through,
    drawingFor: () => ({
      on: drawing,
      factor: factor.factor,
      table: factor.source === FACTOR_SOURCES.table
        ? {kind: factor.tableKind, provenance: factor.provenance}
        : null,
    }),
  });
  return {
    ledger, seed, factor,
    ...atDrawing(ledger, drawing, factor.factor),
  };
}
