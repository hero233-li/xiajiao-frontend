/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ScoreTrend } from './scoreTrend';
import type { GetScoreTrendResponseMessage } from './getScoreTrendResponseMessage';

export interface GetScoreTrendResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: ScoreTrend;
  message: GetScoreTrendResponseMessage;
}
