/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface LocalPageOrder {
  /** @minimum 0 */
  expectedRevision: number;
  /**
   * @minItems 1
   * @maxItems 20
   */
  fileIds: string[];
}
