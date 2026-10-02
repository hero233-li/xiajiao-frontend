/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AssessmentPolicy } from './assessmentPolicy';
import type { AdminPutAssessmentPolicyResponseMessage } from './adminPutAssessmentPolicyResponseMessage';

export interface AdminPutAssessmentPolicyResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: AssessmentPolicy;
  message: AdminPutAssessmentPolicyResponseMessage;
}
