/**
 * NHS Agenda for Change pay scales by pay year, for every nation, and the
 * lookups over them.
 *
 * Pure salary data — no metadata (labels, slugs, role
 * descriptions); presentation copy is a consumer concern.
 *
 * ── Where each nation's figures come from ──
 *
 * Scotland, Wales and Northern Ireland each publish an AfC pay
 * CIRCULAR, so each is transcribed verbatim in `src/circulars/*` and
 * translated to canonical points by `afc-scales.ts`. This module holds
 * the result, not the transcription.
 *
 * England publishes no AfC circular, so its tables are transcribed from
 * the publisher's page in `src/published/england-afc.ts` (CLAUDE.md has
 * the rule). The HCAS zones, the National Living Wage and the Welsh
 * living-wage floor sit beside it in `src/published/`, each citing its own
 * source. The other three nations' sources are cited in their own
 * circular files, beside the data they justify — including the warning
 * that Scotland's MSG consolidated table prints superseded 4.25% rates and
 * must not be read instead of the circular.
 *
 * POINT LABELS — one convention, all four nations. A point's label is
 * the year of service in which a member first reaches it: increment 1
 * is `Year 1`, and the top point takes a `+` because service continues
 * past it. No publisher prints such a label; every one is our reading
 * of an interval the publisher does print. For the three circular
 * nations the year is derived in `afc-scales.ts` from the transcribed
 * interval; England's are authored as years in `published/`. All four go through
 * `afcPoint`, which writes the label and the year from one number, so
 * a label and the timing a pay path reads from it cannot disagree.
 *
 * Labels are lookup keys for `afcResolver.fromScalePoint`, so changing
 * one is an API change, and the fixtures assert them.
 */

import type {
  Nation, PayYear, YearLabel,
} from '@casomoltd/paye-calc';
import {
  NATION_KEYS,
  TAX_YEARS,
  CURRENT_TAX_YEAR,
} from '@casomoltd/paye-calc';
import {ScaleUnavailable, invariant} from './errors.js';
import type {DocumentSource} from './document-source.js';
import {
  AFC_ENGLAND_SCALES_2025,
  AFC_ENGLAND_SCALES_2026,
  AFC_NI_2025,
  AFC_SCOTLAND,
  AFC_W_02_2025,
  AFC_W_02_2026,
} from './sources.js';
import type {SteppedPoint} from './scale-point.js';
import {
  NI_SCALES_2025_26,
  SCOTLAND_SCALES_2025_26,
  SCOTLAND_SCALES_2026_27,
  WALES_SCALES_2025_26,
  WALES_SCALES_2026_27,
} from './afc-scales.js';
import type {AfcBandId} from './afc-band.js';
import {ENGLAND_AFC_2025_26, ENGLAND_AFC_2026_27} from './published/england-afc.js';
import {HCAS_2025_26, HCAS_2026_27} from './published/hcas-zones.js';
import type {HcasZones} from './hcas.js';
import {hoursPerYear} from './working-week.js';
import {schemeYearOfPayYear} from './pay-year.js';
import type {SchemeYearEnd} from './pension/scheme-year.js';

// The band registry lives in its own module so the translation layer
// can name a band without importing this one — see `afc-band.ts`.
export {AFC_BANDS, AFC_BAND_IDS} from './afc-band.js';
export type {AfcBandId} from './afc-band.js';
export type {HcasZone, HcasZones} from './hcas.js';
export {NLW_HOURLY} from './published/nlw.js';
export {WALES_LIVING_WAGE} from './published/wales-living-wage.js';
export type {WalesLivingWage} from './published/wales-living-wage.js';

interface AfcScaleYear {
  hcas: HcasZones;
  scales: Record<AfcBandId, SteppedPoint[]>;
}

// ── England ──────────────────────────────────────

const AFC_SCALES_2025_26: AfcScaleYear = {
  hcas: HCAS_2025_26,
  scales: ENGLAND_AFC_2025_26,
};

const AFC_SCALES_2026_27: AfcScaleYear = {
  hcas: HCAS_2026_27,
  scales: ENGLAND_AFC_2026_27,
};

// ── Scotland and Wales ───────────────────────────
// Their points come from the verbatim circulars via the translation
// layer, so the labels are DERIVED from the publisher's own progression
// column rather than typed beside the salaries where the two could
// disagree.

// ── Scotland 2025-26 ─────────────────────────────
// Scotland negotiates its own AfC award. The 2025-26
// settlement was 4.25%, but carried an inflation
// guarantee: at least one percentage point above average
// CPI for the calendar year of the uplift. 2025 CPI
// confirmed at 3.4%, so the guarantee bit and the rate
// became 4.4%, backdated to 1 April 2025 with arrears.
// Band structures differ from England (Band 2 has 2
// points, Bands 8a–9 have 2 points each).
// Source: "Scotland, PCS(AFC)2026/1" (#sa-13), Annex B,
// the revised 4.4% column.

const AFC_SCALES_2025_26_SCOTLAND: AfcScaleYear = {
  hcas: HCAS_2025_26,
  scales: SCOTLAND_SCALES_2025_26,
};

// ── Scotland 2026-27 ─────────────────────────────
// 3.75% on the REVISED 2025-26 base, so the inflation
// guarantee reaches this year too.
// Source: "Scotland, PCS(AFC)2026/1" (#sa-13), Annex B,
// effective 1 April 2026.

const AFC_SCALES_2026_27_SCOTLAND: AfcScaleYear = {
  hcas: HCAS_2026_27,
  scales: SCOTLAND_SCALES_2026_27,
};

// ── Wales ────────────────────────────────────────
//
// Wales runs its OWN pay ladder, transcribed from its own
// circular rather than derived from the England table. Both years are read
// from the Welsh circular's Annex 1: the ladders differ at
// every band from 4 upward, so England's figures plus a
// living-wage floor reproduce neither year. The floor lifts
// the bottom of a ladder and cannot raise its top.
//
// Band 2 carries two points, as England's does; Northern
// Ireland's has one.
//
// Band 1 is published in both years and closed to new
// entrants. It is absent from this ladder because
// AFC_BANDS starts at B2, and reachable through
// `afcBand1`, which reads it off the circular.
//
// Sources: "Wales, AfC(W) 02/2025" (#sa-44) and "Wales,
// AfC(W) 02/2026" (#sa-45), Annex 1 of each.

const AFC_SCALES_2025_26_WALES: AfcScaleYear = {
  hcas: HCAS_2025_26,
  scales: WALES_SCALES_2025_26,
};

const AFC_SCALES_2026_27_WALES: AfcScaleYear = {
  hcas: HCAS_2026_27,
  scales: WALES_SCALES_2026_27,
};

const AFC_SCALES_WALES: Partial<
  Record<YearLabel, AfcScaleYear>
> = {
  [TAX_YEARS.Y2025_26]: AFC_SCALES_2025_26_WALES,
  [TAX_YEARS.Y2026_27]: AFC_SCALES_2026_27_WALES,
};

/**
 * Annualise an hourly rate at given weekly hours.
 *
 * `weeklyHours` is required: the standard week varies by
 * nation and year (`afcWeeklyHours`), so defaulting it
 * would silently return an rUK answer for a Scottish rate.
 * Pass `afcWeeklyHours(year, nation)`.
 *
 * The inverse of dividing by `hoursPerYear`, which it reads, so the two
 * agree up to the rounding of the hourly rate and of the result.
 */
export function annualiseHourly(
  hourly: number,
  weeklyHours: number,
): number {
  return Math.round(hourly * hoursPerYear(weeklyHours));
}

// ── Lookup by pay year ──────────────────────────

const AFC_SCALES: Partial<
  Record<YearLabel, AfcScaleYear>
> = {
  [TAX_YEARS.Y2025_26]: AFC_SCALES_2025_26,
  [TAX_YEARS.Y2026_27]: AFC_SCALES_2026_27,
};

const AFC_SCALES_SCOTLAND: Partial<
  Record<YearLabel, AfcScaleYear>
> = {
  [TAX_YEARS.Y2025_26]:
    AFC_SCALES_2025_26_SCOTLAND,
  [TAX_YEARS.Y2026_27]:
    AFC_SCALES_2026_27_SCOTLAND,
};

/**
 * Northern Ireland's ladder, from HSC (AfC) 06/2025 (3 December 2025,
 * effective 1 April 2025), translated from NI's own circular.
 *
 * ONE year. NI has issued no 2026-27 AfC pay circular: the Health
 * Minister stated a desire to proceed with 3.3% on 12 February 2026
 * "subject to my budgetary position", and as at the most recent
 * Assembly answer (AQW 49635/22-27, 15 July 2026) he "cannot" pay it
 * "until I have clarity on my Department's budget". HSC staff are
 * still on these rates. The 3.3% is still recorded in `award.ts` —
 * announced and published are different things.
 *
 * The figures are England's for every band, because NI's circular prints
 * the same numbers. They are read from NI's circular, not England's table,
 * so they coincide as a fact about the two documents and NI can diverge
 * without a code change. Its Basic Pay block prints Bands 1 and 2 as
 * single flat figures and starts its entry/interval/top table at Band 3,
 * so Band 2 is ONE point where England's is two.
 *
 * All 29 values are pinned against the circular in
 * `tests/fixtures/pay-scales.csv`.
 */
const AFC_SCALES_NI: Partial<Record<YearLabel, AfcScaleYear>> = {
  [TAX_YEARS.Y2025_26]: {
    // NI operates no high cost area supplement; the field carries
    // England's zones because the type holds one for every nation, and
    // no NI region resolves an HCAS zone.
    hcas: HCAS_2025_26,
    scales: NI_SCALES_2025_26,
  },
};

/** Every nation's published scale family — each nation its own, even
 *  where the figures coincide. Total over Nation, so adding a nation
 *  is a compile error here rather than a silent fall-through to
 *  England's. */
const SCALE_FAMILIES: Record<
  Nation, Partial<Record<YearLabel, AfcScaleYear>>
> = {
  [NATION_KEYS.england]: AFC_SCALES,
  [NATION_KEYS.northernIreland]: AFC_SCALES_NI,
  [NATION_KEYS.scotland]: AFC_SCALES_SCOTLAND,
  [NATION_KEYS.wales]: AFC_SCALES_WALES,
};

/**
 * The document that PUBLISHES each nation's AfC scales for a year.
 *
 * Held per (nation, year), not per nation: a year-blind citation puts
 * the 2026/27 pay-scales page beneath a 2025-26 table, which reads as
 * a claim the reader cannot check.
 *
 * England and Northern Ireland share a salary TABLE and do not share a
 * SOURCE. NI publishes its own circular, with its own issuer, reference
 * and date, and its figures matching England's is a fact about the two
 * publishers rather than a licence to cite one for the other.
 *
 * Northern Ireland has one row, not two: it has published no 2026-27
 * scales, so there is no 2026-27 table to cite.
 */
const AFC_SCALE_SOURCES: Record<
  Nation, Partial<Record<YearLabel, DocumentSource>>
> = {
  [NATION_KEYS.england]: {
    [TAX_YEARS.Y2025_26]: AFC_ENGLAND_SCALES_2025,
    [TAX_YEARS.Y2026_27]: AFC_ENGLAND_SCALES_2026,
  },
  [NATION_KEYS.northernIreland]: {
    // One year, matching the scales. There is no 2026-27 entry because
    // there are no 2026-27 NI scales to cite — a source for a table
    // that does not exist would be the false claim this map exists to
    // prevent.
    [TAX_YEARS.Y2025_26]: AFC_NI_2025,
  },
  [NATION_KEYS.scotland]: {
    // One circular restates both years: PCS(AFC)2026/1 revised the
    // 2025-26 figure when the inflation guarantee triggered and
    // restates 2026-27, so it is current for each.
    [TAX_YEARS.Y2025_26]: AFC_SCOTLAND,
    [TAX_YEARS.Y2026_27]: AFC_SCOTLAND,
  },
  [NATION_KEYS.wales]: {
    [TAX_YEARS.Y2025_26]: AFC_W_02_2025,
    [TAX_YEARS.Y2026_27]: AFC_W_02_2026,
  },
};

/** The circular or page that publishes a nation's AfC scales for a
 *  year. Throws for a combination that has no published scale, in step
 *  with {@link getScalesForYear} — a scale we cannot cite is a scale we
 *  should not be serving. */
export function afcScaleSource(
  year: PayYear,
  nation: Nation,
): DocumentSource {
  // The tables key on the label; the signature carries the basis.
  const key: YearLabel = year;
  const source = AFC_SCALE_SOURCES[nation][key];
  if (!source) {
    throw new ScaleUnavailable(nation, year);
  }
  return source;
}

/** PAY years a given nation publishes AfC scales for, oldest
 *  first. Nations do not move in lockstep — a year one has
 *  published may be outstanding for another — so a caller
 *  resolving figures for a nation must ask for that nation's
 *  years rather than assuming England's.
 *
 *  Pay years, not tax years: this answers "which scale can I ask
 *  for", never "which tax rules apply". Northern Ireland publishes
 *  one pay year while every nation shares the same tax year. */
export function afcPayYears(nation: Nation): PayYear[] {
  // Sorted, not authoring order: the "oldest first" above is a
  // guarantee callers rely on (`resolver.ts` reverses it to find the
  // latest year), and object-literal order would silently break it if
  // a new year were authored above an old one. Year labels collate in year
  // order because they are fixed-width and zero-padded.
  return (
    Object.keys(SCALE_FAMILIES[nation]) as PayYear[]
  ).sort((a, b) => a.localeCompare(b));
}

/**
 * How far a nation's newest published pay scales sit from the tax year
 * in force. Positive means the pay scales are BEHIND.
 *
 * ## The domain rule this exists to state
 *
 * A person's salary comes from an Agenda for Change round; the tax, NI
 * and pension tiers applied to it come from the tax year they are
 * being paid IN. Those are different facts that normally name the
 * same year, so one value serving both looks right until the day they
 * diverge.
 *
 * They diverge in exactly one way. An AfC round is agreed and
 * implemented by each nation separately, and a nation whose award is
 * not yet funded keeps paying last year's scales into this tax year;
 * this function says which nations are. Tax never waits: the thresholds
 * change on 6 April whatever the employer has settled.
 *
 * So the legitimate values are:
 *
 * | lag | meaning |
 * |---|---|
 * | `0` | the award is implemented; pay year and tax year agree |
 * | `1` | the award for this year is not yet in payment |
 * | `-1` | next year's circular is out but its tax year has not begun |
 *
 * Anything else is a defect in THIS library's data, not a fact about
 * the world: a lag of 2 means a whole round was never transcribed.
 * {@link assertPayYearLagIsSane} is where that is enforced.
 *
 * What this cannot catch is a pay year passed where a tax year was
 * wanted: the values here would look perfectly legal. The distinct
 * `PayYear` and `TaxYear` types are what stop that.
 */
export function payYearLag(nation: Nation): number {
  const order = Object.values(TAX_YEARS);
  const pay = order.indexOf(latestAfcYear(nation));
  const tax = order.indexOf(CURRENT_TAX_YEAR);
  invariant(
    pay >= 0 && tax >= 0,
    `payYearLag: ${nation} resolves a year outside TAX_YEARS`,
  );
  return tax - pay;
}

/**
 * True while a nation is still paying an older round than the tax year
 * in force — its award is announced or awaited, but not in payment.
 *
 * The domain question ("is this nation behind?") rather than a
 * comparison against some particular year, so a consumer cannot get
 * the comparison subtly wrong: testing against a fixed year answers
 * "is it exactly 2025-26" and quietly says no for a nation two rounds
 * behind, which is the case that most needs saying yes.
 */
export function isAwaitingPayAward(nation: Nation): boolean {
  return payYearLag(nation) > 0;
}

/**
 * Fail loudly if any nation's pay scales have drifted further from the
 * tax year than the domain allows. See {@link payYearLag}.
 *
 * A function rather than a module-scope check: this library is
 * published, and a throw at import time would take down every consumer
 * over a data problem they cannot fix. It runs in this repo's tests,
 * which is where a transcription gap should surface.
 */
export function assertPayYearLagIsSane(): void {
  for (const nation of Object.keys(SCALE_FAMILIES) as Nation[]) {
    const lag = payYearLag(nation);
    invariant(
      lag >= -1 && lag <= 1,
      `${nation} is ${lag} years from the tax year in force `
      + `(${CURRENT_TAX_YEAR}): its newest published scale is `
      + `${latestAfcYear(nation)}. A gap beyond one year means a pay `
      + 'round was never transcribed, not that a nation skipped one.',
    );
  }
}

/**
 * The AfC pay year whose round runs over one scheme year, where this
 * library holds its scale for the nation; null where it holds none: a year
 * before the earliest scale it carries, or one after the latest the nation
 * has published. A pay year is one scheme year (`pay-year.ts`).
 *
 * The round a scheme year names is not always the scale staff were paid
 * on in it: a nation whose award is late still pays the previous round's
 * scale (`payYearLag`, `latestAfcYear`). Ask those for that.
 */
export function afcPayYearFor(
  end: SchemeYearEnd,
  nation: Nation,
): PayYear | null {
  return (
    afcPayYears(nation).find((year) => schemeYearOfPayYear(year) === end)
    ?? null
  );
}

/**
 * The most recent year a nation has actually published AfC scales for.
 *
 * Nations do not move together. Northern Ireland has issued no 2026-27
 * pay circular — its 3.3% is announced, unfunded and undated — so its
 * latest published year is 2025-26 while the other three are on
 * 2026-27. A consumer that asks for a site-wide "current year" gets
 * `ScaleUnavailable` there, which is correct but is not an answer; this
 * is the answer.
 *
 * Lives here rather than in a consumer because it is a fact about what
 * this library holds. A consumer deriving it would be re-computing,
 * from the outside, something only these tables know.
 */
export function latestAfcYear(nation: Nation): PayYear {
  const years = afcPayYears(nation);
  const latest = years[years.length - 1];
  if (!latest) {
    // A plain Error, not ScaleUnavailable: that type's `year` is a
    // TaxYear, and there is no year to name here. Casting a filler
    // string into the union would make `error.year` lie to any caller
    // that reads it.
    throw new Error(
      `latestAfcYear: ${nation} publishes no AfC scale in any year`,
    );
  }
  return latest;
}

/** Resolve a nation's published scale table for a year.
 *  Every figure returned is transcribed from that nation's
 *  own instrument. Where two nations' circulars print the
 *  same numbers the tables share an object literal for
 *  brevity, and each nation's fixture rows pin its values
 *  against its OWN document, so a divergence fails rather
 *  than propagating. Throws {@link ScaleUnavailable} for a
 *  year that nation has not published, rather than silently
 *  substituting another year's or nation's figures. */
export function getScalesForYear(
  year: PayYear,
  nation: Nation,
): AfcScaleYear {
  const key: YearLabel = year;
  const base = SCALE_FAMILIES[nation][key];
  if (!base) {
    throw new ScaleUnavailable(nation, year);
  }
  return base;
}
