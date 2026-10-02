/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AssessmentQuestion } from './assessmentQuestion';

export interface SessionQuestion {
  /** @minimum 1 */
  position: number;
  question: AssessmentQuestion;
  /**
   * @minimum 0
   * @nullable
   */
  selectedOption: number | null;
  /**
   * UTC事件时间（RFC3339）；客户端不可当作本地时间写入
   * @nullable
   */
  answerSavedAt: string | null;
}
