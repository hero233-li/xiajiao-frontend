/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * 创建新草稿，复用稳定实体ID；发布后不能原地修改。
 */
export interface ReleaseCreate {
  /**
   * 稳定UUID
   * @nullable
   */
  basedOnReleaseId: string | null;
  /**
   * @maxLength 64
   * @nullable
   */
  sourceSha: string | null;
}
