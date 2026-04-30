/**
 * AFC region codes — collapse nation + HCAS into
 * a single query parameter.
 *
 * HCAS is England-only and mutually exclusive with
 * non-England nations, so one param covers both.
 *
 * UI-specific concerns (cookies, URL params, selector
 * options, zone labels) stay in hub-site.
 */

import {
  TAX_REGIONS,
  NATIONS,
} from '@casomoltd/paye-calc';
import type {
  TaxRegion,
  Nation,
} from '@casomoltd/paye-calc';
import type {HcasZones} from './scales.js';

// ── Region codes ────────────────────────────────

export const AFC_REGIONS = {
  ENG: 'eng',
  ENG_IL: 'eng-il',
  ENG_OL: 'eng-ol',
  ENG_FR: 'eng-fr',
  WAL: 'wal',
  SCO: 'sco',
  NI: 'ni',
} as const;

export type AfcRegionId =
  (typeof AFC_REGIONS)[keyof typeof AFC_REGIONS];

const AFC_REGION_ID_LIST: AfcRegionId[] =
  Object.values(AFC_REGIONS);

/** Type guard for region codes. */
export function isAfcRegionId(
  raw: string,
): raw is AfcRegionId {
  return (
    AFC_REGION_ID_LIST as string[]
  ).includes(raw);
}

// ── Resolved region info ────────────────────────

export interface ResolvedRegion {
  id: AfcRegionId;
  taxRegion: TaxRegion;
  /** Key into AfcScaleYear.hcas, if applicable */
  hcasProp: keyof HcasZones | null;
  /** Short label for page titles */
  label: string;
  /** Tax system description for intro copy */
  taxNote: string;
  isWales: boolean;
}

const REGION_INFO: Record<
  AfcRegionId,
  Omit<ResolvedRegion, 'id'>
> = {
  [AFC_REGIONS.ENG]: {
    taxRegion: TAX_REGIONS.rUK,
    hcasProp: null,
    label: 'England',
    taxNote:
      'England and Wales tax rates',
    isWales: false,
  },
  [AFC_REGIONS.ENG_IL]: {
    taxRegion: TAX_REGIONS.rUK,
    hcasProp: 'innerLondon',
    label:
      'England \u2014 Inner London HCAS',
    taxNote:
      'England and Wales tax rates',
    isWales: false,
  },
  [AFC_REGIONS.ENG_OL]: {
    taxRegion: TAX_REGIONS.rUK,
    hcasProp: 'outerLondon',
    label:
      'England \u2014 Outer London HCAS',
    taxNote:
      'England and Wales tax rates',
    isWales: false,
  },
  [AFC_REGIONS.ENG_FR]: {
    taxRegion: TAX_REGIONS.rUK,
    hcasProp: 'fringe',
    label:
      'England \u2014 Fringe HCAS',
    taxNote:
      'England and Wales tax rates',
    isWales: false,
  },
  [AFC_REGIONS.WAL]: {
    taxRegion: TAX_REGIONS.rUK,
    hcasProp: null,
    label: 'Wales',
    taxNote:
      'England and Wales tax rates',
    isWales: true,
  },
  [AFC_REGIONS.SCO]: {
    taxRegion: TAX_REGIONS.scotland,
    hcasProp: null,
    label: 'Scotland',
    taxNote: 'Scottish income tax rates',
    isWales: false,
  },
  [AFC_REGIONS.NI]: {
    taxRegion: TAX_REGIONS.rUK,
    hcasProp: null,
    label: 'Northern Ireland',
    taxNote:
      'England and Wales tax rates',
    isWales: false,
  },
};

/** Resolve a region code to tax/HCAS/label info. */
export function resolveRegion(
  id: AfcRegionId,
): ResolvedRegion {
  return {id, ...REGION_INFO[id]};
}

// ── Legacy ?hcas= compat ───────────────────────

const LEGACY_HCAS_MAP: Record<
  string,
  AfcRegionId
> = {
  'inner-london': AFC_REGIONS.ENG_IL,
  'outer-london': AFC_REGIONS.ENG_OL,
  fringe: AFC_REGIONS.ENG_FR,
};

/**
 * Map old `?hcas=` values to the new region code.
 * Returns null if the value is not recognised.
 */
export function legacyHcasToRegion(
  hcas: string,
): AfcRegionId | null {
  return LEGACY_HCAS_MAP[hcas] ?? null;
}

// ── Region → Nation mapping ────────────────

const REGION_TO_NATION: Record<
  AfcRegionId, Nation
> = {
  [AFC_REGIONS.ENG]: 'england',
  [AFC_REGIONS.ENG_IL]: 'england',
  [AFC_REGIONS.ENG_OL]: 'england',
  [AFC_REGIONS.ENG_FR]: 'england',
  [AFC_REGIONS.WAL]: 'wales',
  [AFC_REGIONS.SCO]: 'scotland',
  [AFC_REGIONS.NI]: 'northern-ireland',
};

/** Map an AfC region code to a paye-calc Nation. */
export function afcRegionToNation(
  id: AfcRegionId,
): Nation {
  return REGION_TO_NATION[id];
}

// ── Nation type guard ──────────────────────

const NATION_SET: ReadonlySet<string> =
  new Set(Object.keys(NATIONS));

/** Type guard for paye-calc Nation strings. */
export function isNation(
  raw: string | null | undefined,
): raw is Nation {
  return typeof raw === 'string'
    && NATION_SET.has(raw);
}
