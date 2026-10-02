/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type PlanProgress = {
  /** @minimum 0 */
  completedMinutes: number;
  /** @minimum 0 */
  totalEstimatedMinutes: number;
  /**
   * @minimum 0
   * @maximum 100
   */
  percent: number;
};
