/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface LocalApply {
  practicedOn: string;
  /**
   * @minimum 1
   * @maximum 1440
   */
  minutes: number;
  /**
   * @minimum 1
   * @maximum 1440
   */
  limitMinutes: number;
  complete: boolean;
  closedBook: boolean;
  answersSeenBefore: boolean;
  /** @minimum 0 */
  expectedRevision: number;
}
