/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface PracticeHistoryRow {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  questionId: string;
  /** 稳定UUID */
  revisionId: string;
  /** @minimum 0 */
  selectedOption: number;
  correct: boolean;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  submittedAt: string;
}
