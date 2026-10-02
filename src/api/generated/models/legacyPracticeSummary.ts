/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface LegacyPracticeSummary {
  /** 稳定UUID */
  id: string;
  /**
   * 稳定UUID
   * @nullable
   */
  questionId: string | null;
  oldQuestionId: string;
  /**
   * @minimum 1
   * @nullable
   */
  attempts: number | null;
  /**
   * @minimum 0
   * @nullable
   */
  selectedOption: number | null;
  /** @nullable */
  correct: boolean | null;
  /**
   * UTC事件时间（RFC3339）；客户端不可当作本地时间写入
   * @nullable
   */
  lastUpdatedAt: string | null;
  gateCreditApproved: boolean;
  /**
   * 稳定UUID
   * @nullable
   */
  readonly courseId: string | null;
  /**
   * 稳定UUID
   * @nullable
   */
  readonly chapterId: string | null;
}
