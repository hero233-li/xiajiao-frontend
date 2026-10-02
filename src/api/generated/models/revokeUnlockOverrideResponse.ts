/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Unlock } from './unlock';
import type { RevokeUnlockOverrideResponseMessage } from './revokeUnlockOverrideResponseMessage';

export interface RevokeUnlockOverrideResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: Unlock;
  message: RevokeUnlockOverrideResponseMessage;
}
