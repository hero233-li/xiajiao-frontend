/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * 先等待选项保存成功；后端以最后保存答案判分。截止前指纹变化返回40902，避免最后一次选项尚未保存就交卷；到时按已保存答案自动结算，未答错。
 */
export interface AssessmentSubmit {
  /**
   * SHA-256十六进制
   * @pattern ^[0-9a-f]{64}$
   */
  answerFingerprint: string;
  /** 本人明确确认 */
  confirm: boolean;
}
