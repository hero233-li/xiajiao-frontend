/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { EmptyData } from './emptyData';
import type { LogoutResponseMessage } from './logoutResponseMessage';

export interface LogoutResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: EmptyData;
  message: LogoutResponseMessage;
}
