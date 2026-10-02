/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * CAS对比上次保存时间，第一次为NULL；只允许deadline之前，追加改选历史；响应不反馈对错。
 */
export interface AssessmentAnswerWrite {
  /** @minimum 0 */
  selectedOption: number;
  /**
   * UTC事件时间（RFC3339）；客户端不可当作本地时间写入
   * @nullable
   */
  expectedSavedAt: string | null;
}
