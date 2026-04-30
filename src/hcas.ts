/**
 * HCAS (High Cost Area Supplement) zone identifiers
 * and pure supplement calculation.
 *
 * Zone IDs match the YAML keys used in hub-site's
 * hcas-zones.yaml. This module is safe for client
 * and server — no node:fs dependency.
 */

export const HCAS_ZONE_IDS = {
  INNER_LONDON: 'inner-london',
  OUTER_LONDON: 'outer-london',
  FRINGE: 'fringe',
} as const;

export type HcasZoneId =
  (typeof HCAS_ZONE_IDS)[
    keyof typeof HCAS_ZONE_IDS
  ];

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

/**
 * Calculate HCAS supplement for a base salary.
 * Applies percentage rate clamped between min/max.
 */
export function calculateHcasSupplement(
  baseSalary: number,
  zone: {rate: number; min: number; max: number},
): number {
  const raw =
    Math.round(baseSalary * zone.rate) / 100;
  return Math.min(Math.max(raw, zone.min), zone.max);
}
