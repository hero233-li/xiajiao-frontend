/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { BatchCompletion } from './batchCompletion';
import type { CompleteCatalogBatchResponseMessage } from './completeCatalogBatchResponseMessage';

export interface CompleteCatalogBatchResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: BatchCompletion;
  message: CompleteCatalogBatchResponseMessage;
}
