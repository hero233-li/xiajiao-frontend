/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { DeleteReceipt } from './deleteReceipt';
import type { DeleteScoreImageResponseMessage } from './deleteScoreImageResponseMessage';

export interface DeleteScoreImageResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: DeleteReceipt;
  message: DeleteScoreImageResponseMessage;
}
