/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Prediction } from './prediction';
import type { GetPredictionResponseMessage } from './getPredictionResponseMessage';

export interface GetPredictionResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: Prediction;
  message: GetPredictionResponseMessage;
}
