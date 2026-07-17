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
   * The 2016-contract nodal pay point (1–5) this step sits on, for the
   * resident/training scales the source keys by nodal point. Absent where
   * the scale has no nodal-point axis (consultant, SAS, dental spine).
   */
  nodalPoint?: number;
}
