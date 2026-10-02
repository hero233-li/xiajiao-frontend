/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { QuestionPublic } from './questionPublic';
import type { GetQuestionResponseMessage } from './getQuestionResponseMessage';

export interface GetQuestionResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: QuestionPublic;
  message: GetQuestionResponseMessage;
}
