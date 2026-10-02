/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { QuestionMark } from './questionMark';
import type { SaveQuestionMarkResponseMessage } from './saveQuestionMarkResponseMessage';

export interface SaveQuestionMarkResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: QuestionMark;
  message: SaveQuestionMarkResponseMessage;
}
