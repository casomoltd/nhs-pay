/**
 * PCT-to-HCAS-zone reference data.
 *
 * Zones use 2005 PCT boundaries — do not substitute
 * London boroughs or modern trust names. Spellings
 * preserved verbatim from NHS Employers source
 * (e.g. "Forrest", "Harpendon").
 *
 * Browser-safe — no node:fs dependency.
 */

import type {HcasZoneId} from './hcas.js';

// ── PCT data (from NHS Employers Annex 8) ───────

const INNER_LONDON_PCTS: readonly string[] = [
  'Hammersmith & Fulham',
  'Kensington & Chelsea',
  'Westminster',
  'Camden',
  'Islington',
  'City & Hackney',
  'Tower Hamlets',
  'Lambeth',
  'Lewisham',
  'Southwark',
  'Wandsworth',
];

const OUTER_LONDON_PCTS: readonly string[] = [
  'Brent',
  'Ealing',
  'Harrow',
  'Hillingdon',
  'Hounslow',
  'Barnet',
  'Enfield',
  'Haringey',
  'Barking & Dagenham',
  'Havering',
  'Newham',
  'Redbridge',
  'Waltham Forrest',
  'Bexley',
  'Bromley',
  'Greenwich',
  'Croydon',
  'Kingston',
  'Richmond & Twickenham',
  'Sutton & Merton',
];

const FRINGE_PCTS: readonly string[] = [
  'Dartford, Gravesham & Swanley',
  'Basildon',
  'Billericay, Brentwood & Wickford',
  'Epping Forrest',
  'Harlow',
  'Thurrock',
  'Dacorum',
  'Hertsmere',
  'Royston, Buntingford & Bishop Stortford',
  'South East Hertfordshire',
  'St Albans & Harpendon',
  'Watford & Three Rivers',
  'Welwyn, Hatfield',
  'Bracknell Forrest',
  'Slough',
  'Windsor, Ascot & Maidenhead',
  'Wokingham',
  'East Elmbridge & Mid Surrey',
  'East Surrey',
  'Guildford & Waverley',
  'North Surrey',
  'Surrey Heath and Woking',
];

const ZONE_PCTS: readonly {
  zone: HcasZoneId;
  pcts: readonly string[];
}[] = [
  {zone: 'inner-london', pcts: INNER_LONDON_PCTS},
  {zone: 'outer-london', pcts: OUTER_LONDON_PCTS},
  {zone: 'fringe', pcts: FRINGE_PCTS},
];

// ── Case-insensitive lookup map ─────────────────

const pctToZone: Map<string, HcasZoneId> =
  new Map();

for (const {zone, pcts} of ZONE_PCTS) {
  for (const pct of pcts) {
    pctToZone.set(pct.toLowerCase(), zone);
  }
}

// ── Public API ──────────────────────────────────

export interface HcasPct {
  zone: HcasZoneId;
  pct: string;
}

/** Look up which HCAS zone a PCT belongs to. */
export function getHcasZone(
  pct: string,
): HcasZoneId | null {
  return pctToZone.get(pct.toLowerCase()) ?? null;
}

/** All PCTs with their zone, in canonical order. */
export function getHcasPcts(): HcasPct[] {
  const result: HcasPct[] = [];
  for (const {zone, pcts} of ZONE_PCTS) {
    for (const pct of pcts) {
      result.push({zone, pct});
    }
  }
  return result;
}
