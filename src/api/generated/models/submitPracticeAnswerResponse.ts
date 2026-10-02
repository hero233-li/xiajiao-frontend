/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PracticeResult } from './practiceResult';
import type { SubmitPracticeAnswerResponseMessage } from './submitPracticeAnswerResponseMessage';

export interface SubmitPracticeAnswerResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: PracticeResult;
  message: SubmitPracticeAnswerResponseMessage;
}
