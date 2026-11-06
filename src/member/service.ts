/**
 * A member's service, checked: the periods they hold, derived from what
 * they declared, with the McCloud remedy window split out of a legacy
 * section where they have one, and the dates the remedy turns on.
 */
import {dayAfter, dayBefore} from '../dates.js';
import {BenefitNotModelled, invariant, NOT_MODELLED} from '../errors.js';
import {isoDate, isoDateOf, isoToDate} from '../iso-date.js';
import {PERIOD_KINDS, SECTIONS} from './types.js';
import type {
  DeclaredPeriod, LegacySectionId, SectionId, ServicePeriod,
} from './types.js';

/** A legacy holding: its section, its own service, and the remedy window
 *  held in it after that service where the member has one. */
export interface LegacyHolding {
  readonly section: LegacySectionId;
  /** Its own service: to the day before the 2015 Section opened where a
   *  remedy window follows, else to the declared leaving. */
  readonly own: ServicePeriod;
  /** The McCloud remedy window; null where the member has none, which is
   *  the one record of whether they do. */
  readonly window: ServicePeriod | null;
}

/** What a member holds: a legacy holding, if any, and the 2015 Section's
 *  own service after it. */
interface Held {
  readonly legacy: LegacyHolding | null;
  readonly ordinary2015: ServicePeriod;
}

/** A legacy period, if any, and the one 2015 Section period. */
interface Sections {
  readonly legacy: DeclaredPeriod | undefined;
  readonly current: DeclaredPeriod;
}

/** The remedy period, 1 April 2015 to 31 March 2022, as PSPJOA 2022
 *  s.1 defines it. The days either side are derived from it. */
const REMEDY_FROM = isoDate('2015-04-01');
const REMEDY_TO = isoDate('2022-03-31');
/** PSPJOA 2022 s.1: in pensionable service "on 31 March 2012 or any
 *  earlier day". */
const ELIGIBLE_BY = isoDate('2012-03-31');
/** Rollback put remedy service back in the legacy section on this
 *  date (SI 2023/985), so a statement before it counts the remedy
 *  years in the 2015 Section. */
const ROLLBACK = isoDate('2023-10-01');

/**
 * The dates the McCloud remedy turns on, for a caller that has to read
 * a member's answers against them before it can declare their service.
 */
export const REMEDY = {
  eligibleBy: ELIGIBLE_BY,
  from: REMEDY_FROM,
  to: REMEDY_TO,
  rollback: ROLLBACK,
} as const;

/**
 * The day each later section opened: the 2008 Section to new joiners
 * under SI 2008/653, and the 2015 Section, which every member moved to
 * for service from that day, under SI 2015/94. The 1995 Section is
 * absent: no answer a member gives turns on its opening.
 */
export const SECTION_OPENED = {
  [SECTIONS.s2008]: isoDate('2008-04-01'),
  [SECTIONS.s2015]: REMEDY_FROM,
} as const;

const LAST_BEFORE_2015 = isoDateOf(dayBefore(isoToDate(REMEDY_FROM)));
const AFTER_REMEDY = isoDateOf(dayAfter(isoToDate(REMEDY_TO)));

/**
 * The periods a member holds, derived from what they declared and
 * refused where it describes something the library does not model.
 *
 * Service is taken as continuous. A break — a gap between one period
 * and the next — decides whether remedy service qualifies, and how a
 * member comes to hold both legacy sections; both are deferred, so a
 * declared break is refused rather than priced as though it were
 * continuous: https://github.com/casomoltd/nhs-pay/issues/16
 *
 * A member with no 2015 Section service after rollback is refused
 * too: https://github.com/casomoltd/nhs-pay/issues/19
 *
 * A declaration that cannot be true — nothing declared, leaving
 * before joining, periods that overlap — is a caller's mistake and
 * throws RangeError.
 */
export function servicePeriods(declared: readonly DeclaredPeriod[]): Held {
  const sections = sectionsOf(contiguous(declared));
  const remedy = remedyApplies(sections);
  return {
    legacy: legacyHolding(sections.legacy, remedy),
    ordinary2015: {
      section: SECTIONS.s2015,
      from: remedy ? AFTER_REMEDY : sections.current.joined,
      to: sections.current.left,
      kind: PERIOD_KINDS.ordinary,
    },
  };
}

/** Every period a member holds, in date order. */
export function periodsOf({legacy, ordinary2015}: Held): ServicePeriod[] {
  return [...(legacy === null ? [] : legacyPeriodsOf(legacy)), ordinary2015];
}

/** A legacy holding's periods in date order: its own service, then any
 *  remedy window. */
export function legacyPeriodsOf({own, window}: LegacyHolding): ServicePeriod[] {
  return window === null ? [own] : [own, window];
}

/** The last day a period is valued to: its own end, or the leaving
 *  date where that comes first or the period is still open. */
export function until(p: ServicePeriod, leaving: Date): Date {
  return p.to === null || isoToDate(p.to) > leaving ? leaving : isoToDate(p.to);
}

/** The declared periods in date order, each running into the next. */
function contiguous(declared: readonly DeclaredPeriod[]): DeclaredPeriod[] {
  if (declared.length === 0) {
    throw new RangeError('member: no service declared');
  }
  const sorted = [...declared].sort(
    (a, b) => isoToDate(a.joined).getTime() - isoToDate(b.joined).getTime(),
  );
  sorted.forEach((p, i) => {
    checkFollowedBy(p, sorted.at(i + 1));
  });
  return sorted;
}

/** Refuse a period that cannot be true, or that leaves a gap before
 *  the one after it. */
function checkFollowedBy(p: DeclaredPeriod, next: DeclaredPeriod | undefined) {
  if (p.left !== null && isoToDate(p.left) < isoToDate(p.joined)) {
    throw new RangeError(`member: ${p.section} left before it was joined`);
  }
  if (next === undefined) return;
  if (p.left === null || isoToDate(next.joined) <= isoToDate(p.left)) {
    throw new RangeError(`member: ${p.section} overlaps the next period`);
  }
  if (dayAfter(isoToDate(p.left)).getTime() !== isoToDate(next.joined).getTime()) {
    throw new BenefitNotModelled(
      NOT_MODELLED.breakInService, 'a break in pensionable service',
    );
  }
}

/** At most one legacy period and exactly one 2015 Section period, or
 *  the service is not one the library models. */
function sectionsOf(sorted: readonly DeclaredPeriod[]): Sections {
  const legacy = sorted.filter((p) => isLegacy(p.section));
  const reformed = sorted.filter((p) => p.section === SECTIONS.s2015);
  if (legacy.length > 1) {
    throw new BenefitNotModelled(
      NOT_MODELLED.bothLegacySections, 'service in both legacy sections',
    );
  }
  const current = reformed.at(0);
  if (current === undefined || reformed.length > 1) {
    throw new BenefitNotModelled(
      NOT_MODELLED.no2015Section, 'service without the 2015 Section',
    );
  }
  return {legacy: legacy.at(0), current};
}

/** Whether the member has a remedy window: legacy service by the
 *  eligibility date, and 2015 Section service into the remedy period. */
function remedyApplies({legacy, current}: Sections): boolean {
  const end = current.left;
  const remedy = legacy !== undefined
    && isoToDate(legacy.joined) <= isoToDate(ELIGIBLE_BY)
    && (end === null || isoToDate(end) >= isoToDate(REMEDY_FROM));
  if (remedy && end !== null && isoToDate(end) <= isoToDate(REMEDY_TO)) {
    throw new BenefitNotModelled(
      NOT_MODELLED.remedyMemberLeftEarly,
      'a remedy member who left before 1 April 2022',
    );
  }
  return remedy;
}

/** The legacy section's periods: its own service, and the remedy
 *  window after it where the member has one. */
function legacyHolding(
  held: DeclaredPeriod | undefined,
  remedy: boolean,
): LegacyHolding | null {
  if (held === undefined || !isLegacy(held.section)) return null;
  // A legacy period before a 2015 one has a leaving date: the
  // contiguity check refused an open one.
  invariant(held.left !== null, 'a legacy period with no end');
  return {
    section: held.section,
    own: {
      section: held.section,
      from: held.joined,
      to: remedy ? LAST_BEFORE_2015 : held.left,
      kind: PERIOD_KINDS.ordinary,
    },
    window: remedy
      ? {
        section: held.section, from: REMEDY_FROM, to: REMEDY_TO,
        kind: PERIOD_KINDS.remedyWindow,
      }
      : null,
  };
}

function isLegacy(section: SectionId): section is LegacySectionId {
  return section !== SECTIONS.s2015;
}
