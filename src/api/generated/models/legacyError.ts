/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface LegacyError {
  question: string;
  reason: string;
  /**
   * @minimum 0
   * @maximum 100
   * @nullable
   */
  deduction: number | null;
  solution: string;
}
