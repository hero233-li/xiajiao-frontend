/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LearningPosition } from './learningPosition';
import type { GetLearningPositionResponseMessage } from './getLearningPositionResponseMessage';

export interface GetLearningPositionResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: LearningPosition;
  message: GetLearningPositionResponseMessage;
}
