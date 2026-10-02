/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { QuestionPage } from './questionPage';
import type { ListQuestionsResponseMessage } from './listQuestionsResponseMessage';

export interface ListQuestionsResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: QuestionPage;
  message: ListQuestionsResponseMessage;
}
