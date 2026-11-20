/**
 * The HCAS zones' ids and the shape of one zone's rate, in a module that
 * imports nothing, so `regions.ts`, the published zone table and `hcas.ts`
 * can all name a zone without an import cycle (as `afc-band.ts` does for
 * the bands).
 */

/** One zone: its rate as a percentage of basic pay, and the cash floor
 *  and ceiling it is held between. */
export interface HcasZone {
  readonly rate: number;
  readonly min: number;
  readonly max: number;
}

export const HCAS_ZONE_IDS = {
  INNER_LONDON: 'inner-london',
  OUTER_LONDON: 'outer-london',
  FRINGE: 'fringe',
} as const;

export type HcasZoneId =
  (typeof HCAS_ZONE_IDS)[
    keyof typeof HCAS_ZONE_IDS
  ];

/** The three London zones, keyed by the zone id a region resolves to. */
export type HcasZones = Readonly<Record<HcasZoneId, HcasZone>>;

const ZONE_ID_LIST: HcasZoneId[] =
  Object.values(HCAS_ZONE_IDS);

/** Type guard — is this string a valid zone ID? */
export function isHcasZoneId(
  value: string,
): value is HcasZoneId {
  return (
    ZONE_ID_LIST as string[]
  ).includes(value);
}
