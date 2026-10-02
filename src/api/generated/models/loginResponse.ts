/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LoginData } from './loginData';
import type { LoginResponseMessage } from './loginResponseMessage';

export interface LoginResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: LoginData;
  message: LoginResponseMessage;
}
