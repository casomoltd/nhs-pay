/**
 * Role — a Post's domain identity: which published pay-scale
 * position it represents (band / point / region, or a bare
 * salary). Identity ONLY; never presentation copy (labels,
 * role descriptions, colour) — that lives in the consumer.
 *
 * Resolvers set it and every Post carries one, so a Post is
 * never an anonymous salary that has forgotten what it is.
 *
 * `afc` and `vsm` ship today; `medical` / `dental` variants
 * join when their scales land (Phase 2).
 */

import type {AfcBandId, ScalePoint} from './scales.js';
import type {AfcRegionId} from './regions.js';

/** An Agenda-for-Change post: a band at a point, in a region. */
export interface AfcRole {
  readonly kind: 'afc';
  readonly band: AfcBandId;
  readonly point: ScalePoint;
  readonly region: AfcRegionId;
}

/**
 * A bare custom salary — an off-scale / very-senior-manager
 * post with no published scale point. Its identity is the
 * salary itself, so it carries no further fields.
 */
export interface VsmRole {
  readonly kind: 'vsm';
}

export type Role = AfcRole | VsmRole;

export type RoleKind = Role['kind'];
