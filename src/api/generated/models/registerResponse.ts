/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { RegisterResponseCode } from './registerResponseCode';
import type { User } from './user';
import type { RegisterResponseMessage } from './registerResponseMessage';

export interface RegisterResponse {
  code: RegisterResponseCode;
  data: User;
  message: RegisterResponseMessage;
}
