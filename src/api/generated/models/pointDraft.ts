/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface PointDraft {
  /** 稳定UUID */
  id: string;
  /**
   * @minLength 1
   * @maxLength 150
   */
  stableKey: string;
  /**
   * @minLength 1
   * @maxLength 250
   */
  title: string;
}
