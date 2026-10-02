/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { SavedAssessmentAnswer } from './savedAssessmentAnswer';
import type { SaveAssessmentAnswerResponseMessage } from './saveAssessmentAnswerResponseMessage';

export interface SaveAssessmentAnswerResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: SavedAssessmentAnswer;
  message: SaveAssessmentAnswerResponseMessage;
}
