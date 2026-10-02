/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { QuestionBankDraft } from './questionBankDraft';
import type { AdminGetQuestionsResponseMessage } from './adminGetQuestionsResponseMessage';

export interface AdminGetQuestionsResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: QuestionBankDraft;
  message: AdminGetQuestionsResponseMessage;
}
