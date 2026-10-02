/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AssessmentSession } from './assessmentSession';
import type { GetAssessmentResponseMessage } from './getAssessmentResponseMessage';

export interface GetAssessmentResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: AssessmentSession;
  message: GetAssessmentResponseMessage;
}
