/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ScoreRecord } from './scoreRecord';
import type { GetScoreResponseMessage } from './getScoreResponseMessage';

export interface GetScoreResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: ScoreRecord;
  message: GetScoreResponseMessage;
}
