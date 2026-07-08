/**
 * Role — a Post's domain identity: which published pay-scale
 * position it represents (band / point / region, or a bare
 * salary). Identity ONLY; never presentation copy (labels,
 * role descriptions, colour) — that lives in the consumer.
 *
 * Resolvers set it and every Post carries one, so a Post is
 * never an anonymous salary that has forgotten what it is.
 *
 * `afc`, `vsm`, `medical` and `dental` all ship today.
 */

import type {AfcBandId, ScalePoint} from './scales.js';
import type {AfcRegionId} from './regions.js';
import type {MedicalGradeId} from './medical-scales.js';
import type {DentalGradeId} from './dental-scales.js';
import type {Nation} from '@casomoltd/paye-calc';

/** An Agenda-for-Change post: a band at a point, in a region. */
export interface AfcRole {
  readonly kind: 'afc';
  readonly band: AfcBandId;
  readonly point: ScalePoint;
  readonly region: AfcRegionId;
}

/**
 * A doctor post: a medical grade at a scale point, in a nation.
 * Basic medical pay has no HCAS/region model, so the identity
 * carries a bare {@link Nation}, not an AfC region.
 */
export interface MedicalRole {
  readonly kind: 'medical';
  readonly grade: MedicalGradeId;
  readonly point: ScalePoint;
  readonly nation: Nation;
}

/** A salaried dental post: a dental grade at a scale point, in a nation. */
export interface DentalRole {
  readonly kind: 'dental';
  readonly grade: DentalGradeId;
  readonly point: ScalePoint;
  readonly nation: Nation;
}

/**
 * A bare custom salary — an off-scale / very-senior-manager
 * post with no published scale point. Its identity is the
 * salary itself, so it carries no further fields.
 */
export interface VsmRole {
  readonly kind: 'vsm';
}

export type Role = AfcRole | VsmRole | MedicalRole | DentalRole;

export type RoleKind = Role['kind'];
