/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * 本人ADMIN核对原记录确实已答及原创题映射。approved=true需canonicalQuestionId；不能因旧attempts次数复制题或补造历史。
 */
export interface LegacyPracticeCreditDecision {
  /** 允许计入或撤销认领 */
  approved: boolean;
  /**
   * 稳定UUID
   * @nullable
   */
  canonicalQuestionId: string | null;
  /** @minLength 1 */
  reason: string;
  /** 本人明确确认 */
  confirm: boolean;
}
