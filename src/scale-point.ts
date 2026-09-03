/**
 * The canonical pay-scale point — the single shape every pay scale
 * reduces to (AfC band points, medical grades, dental spines), read by
 * the resolvers to build a Post. Domain-neutral: it belongs to no one
 * pay family, which is why it lives here rather than in any one scale
 * file.
 */
export interface ScalePoint {
  /** The point's own step identity: a band point, pay-scale code,
   *  training stage, consultant threshold, or dental band + point. */
  label: string;
  /** Annual gross salary at this point. */
  salary: number;
  /**
   * Years of experience this point maps to (0-indexed), for scales the
   * source lists *by year of service* — the SAS and consultant scales,
   * whose figures step by year. Absent where the step is self-describing
   * (a training stage, a dental band + point) and carries no year axis.
   */
  yearsExperience?: number;
  /**
   * The 2016-contract nodal pay point this step sits on, for the scales
   * the source keys by nodal point — the training grades, and England's
   * locally employed doctors. Absent where the scale has no nodal-point
   * axis (consultant, SAS, dental spine).
   *
   * The publisher's own LABEL, not a number: England's ten points from
   * PC(M&D) 1/2026 R2 subdivide the original five ('3a', '3b', '4a',
   * '4b', '4c', '5a', '5b', '5c'), so the identifier is not ordinal and
   * two points can pay the same while remaining distinct. A `string`
   * rather than one nation's union, because each publisher labels its
   * own scale; `tests/scale-invariants.test.ts` pins England's ten
   * against the circular, so widening here cannot hide a typo there.
   */
  nodalPoint?: string;
}
