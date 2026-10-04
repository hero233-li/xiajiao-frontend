/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface LocalEarned {
  pointId: string;
  /**
   * @minimum 0
   * @maximum 100
   */
  score: number;
  reason: string;
}
