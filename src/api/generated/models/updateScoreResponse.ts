/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ScoreChange } from './scoreChange';
import type { UpdateScoreResponseMessage } from './updateScoreResponseMessage';

export interface UpdateScoreResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: ScoreChange;
  message: UpdateScoreResponseMessage;
}
