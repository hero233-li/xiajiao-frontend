/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PassInvalidationResult } from './passInvalidationResult';
import type { AdminInvalidatePassResponseMessage } from './adminInvalidatePassResponseMessage';

export interface AdminInvalidatePassResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: PassInvalidationResult;
  message: AdminInvalidatePassResponseMessage;
}
