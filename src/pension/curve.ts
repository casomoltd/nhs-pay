/**
 * The 2015 Section's balance drawn as a curve: one point per scheme
 * year, on both rulers, from where the ledger starts to five years of
 * age past the later of the drawing and the pension age.
 *
 * Shared by `projectPension` and `memberBenefits`, which each walk
 * the same ledger and plot it the same way, so it belongs to neither.
 */
import {yearsBetween} from '../dates.js';
import type {EstimatedHistory} from './history.js';
import type {MemberLedger} from './ledger.js';
import {schemeYearEndDate, schemeYearEndFor} from './seed.js';
import {phaseAt} from './uplift.js';
import type {MemberPhase} from './uplift.js';

/** A point on the projection curve */
export interface ProjectionPoint {
  /** Age in years (can be fractional) */
  age: number;
  /** Annual pension in actual £ of that year. Below today's
   * age this is SMALLER than `real`: past pounds bought more. */
  nominal: number;
  /** Annual pension in today's £ — what the projection
   * computes; `nominal` is this scaled by CPI. */
  real: number;
  /** Whether this is accrued (known) or projected — i.e.
   * whether the point falls on or before today. Deliberately
   * NOT `phase === 'active'`: a consumer uses this to separate
   * history from forecast, and a future working year is
   * forecast. */
  accrued: boolean;
  /** Which lifecycle phase the point falls in. */
  phase: MemberPhase;
}

/** What drawing the curve needs of one walk: its ledger, its dates,
 *  and where it starts. */
interface CurveRun {
  readonly today: Date;
  readonly dateOfBirth: Date;
  readonly exitDate: Date;
  readonly retirementDate: Date;
  readonly npa: number;
  readonly ledger: MemberLedger;
  readonly history: EstimatedHistory | null;
  readonly curveFrom: Date;
}

/**
 * The last scheme year a walk reaches: six past the later of the
 * drawing and the pension age. The curve draws five years of age
 * beyond that point, and a birthday can fall in the scheme year after
 * the one the age is counted from, so five years of age can span six
 * scheme years.
 */
export function walkThrough(drawing: Date, pensionAge: Date): number {
  return Math.max(
    schemeYearEndFor(drawing), schemeYearEndFor(pensionAge),
  ) + 6;
}

/**
 * A member's age on a date, as WHOLE YEARS plus the fraction of
 * the year since their birthday.
 *
 * The whole part is calendar arithmetic, so it is the age they
 * would give if asked. The fraction only orders points within a
 * year, which is all the chart needs it for.
 */
function ageAtYearEnd(dateOfBirth: Date, on: Date): number {
  const birthdayIn = (year: number) => new Date(
    year, dateOfBirth.getMonth(), dateOfBirth.getDate(),
  );
  const thisYear = birthdayIn(on.getFullYear());
  const reached = thisYear <= on;
  const whole = on.getFullYear() - dateOfBirth.getFullYear()
    - (reached ? 0 : 1);
  const last = reached ? thisYear : birthdayIn(on.getFullYear() - 1);
  const next = reached ? birthdayIn(on.getFullYear() + 1) : thisYear;
  return whole
    + (on.getTime() - last.getTime())
      / (next.getTime() - last.getTime());
}

/**
 * The curve is the ledger's own steps, plotted ON THEM.
 *
 * **One point per scheme year, at its 31 March close** — the
 * date an Annual Benefit Statement is drawn to, so every
 * plotted value is a figure a member can lay beside paper.
 *
 * **Never at BIRTHDAYS**, which is the plotting the age axis
 * invites. A birthday falls somewhere inside a scheme year:
 * after the April uplift but before the year's slice lands, or
 * the other way about. So a member born in January reads their
 * 43rd-birthday point as "the 2026 figure" and gets a balance
 * with neither the year's accrual in it nor any relation to a
 * year end — values right for their dates and wrong for every
 * question anyone asks of them, which surfaces as "the chart
 * disagrees with my statement".
 *
 * The x-axis stays an AGE, because that is how people think
 * about retiring. Age N is plotted at the close of the scheme
 * year N's birthday falls in — the year that birthday belongs
 * to — so the axis is unchanged and only the dates behind it
 * move onto the scheme's own calendar.
 *
 * Nothing is drawn before the ledger's own start. For a
 * statement that is the statement's date, and the reason is
 * not tidiness: a member enters one figure, not their history,
 * so anything earlier would be that figure run BACKWARDS
 * through rates nobody checked. An inverse calculation drawn
 * as history is a claim the tool cannot support.
 */
export function buildCurve(
  cash: CurveRun,
  todays: CurveRun,
): ProjectionPoint[] {
  const {today, dateOfBirth, retirementDate, npa} = cash;

  const endAge = Math.max(
    npa + 5, yearsBetween(dateOfBirth, retirementDate) + 5,
  );

  /** The scheme year an age's birthday falls in. */
  const yearOfAge = (age: number) => schemeYearEndFor(
    new Date(
      dateOfBirth.getFullYear() + age,
      dateOfBirth.getMonth(),
      dateOfBirth.getDate(),
    ),
  );

  /** The age whose birthday falls in a scheme year — the
   * inverse, used once to find where the axis starts. */
  const ageInYear = (schemeYearEnd: number) => {
    const end = schemeYearEndDate(schemeYearEnd);
    const birthday = new Date(
      schemeYearEnd, dateOfBirth.getMonth(), dateOfBirth.getDate(),
    );
    return schemeYearEnd - dateOfBirth.getFullYear()
      - (birthday > end ? 1 : 0);
  };

  const startAge = ageInYear(schemeYearEndFor(cash.curveFrom));

  const points: ProjectionPoint[] = [];
  for (let label = startAge; label <= Math.ceil(endAge); label++) {
    const year = yearOfAge(label);
    const on = schemeYearEndDate(year);
    /* The age the member actually IS on that 31 March, not the
       whole age whose birthday the scheme year contains.

       Those differ by anything from nought to twelve months —
       the gap between a birthday and the following 31 March —
       so plotting at the whole age would put a value up to a
       year early on the x-axis, and a "today" point falling in
       that gap would sit out of order with its neighbours.

       Built as WHOLE AGE + fraction rather than as a span in
       365.25-day years, so that `Math.floor(age)` is the age
       the member actually is on that 31 March — by calendar
       arithmetic, not within a rounding of it. Someone born on
       1 April reads 42.997 at the year end before their 43rd
       birthday, which floors correctly today and sits three
       thousandths from flooring wrongly after enough leap
       days. The fraction orders the points; the whole part is
       exact. */
    const age = ageAtYearEnd(dateOfBirth, on);
    /* Two walks meet here, and the estimate owns everything up
       to and including the statement's own year — its last row
       IS the stated balance, so reading it there rather than
       the main ledger changes nothing and keeps the join
       seamless. */
    const from = (r: CurveRun) =>
      r.history !== null && year <= r.history.to
        ? r.history.ledger
        : r.ledger;
    const row = from(cash).years.find(
      (r) => r.schemeYearEnd === year,
    );
    points.push({
      age,
      nominal: from(cash).atDate(on),
      real: from(todays).atDate(on),
      accrued: on <= today,
      /* Off the row where there is one, and otherwise from the
         SAME rule the row was built by — never a second copy of
         it here. Compared by scheme YEAR, matching the ledger:
         a point sits at a 31 March close, so a member who left
         in January of that year would read as deferred on the
         very year they were still paying in. */
      phase: row?.phase ?? phaseAt(
        year,
        schemeYearEndFor(cash.exitDate),
        schemeYearEndFor(cash.retirementDate),
      ),
    });
  }
  return points;
}
