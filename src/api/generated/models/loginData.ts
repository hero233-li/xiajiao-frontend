/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LoginDataTokenType } from './loginDataTokenType';
import type { User } from './user';

/**
 * 阶段4实现HS256签名JWT；默认访问15分钟、刷新7天，可通过部署配置修改。刷新锁定用户并轮换token_version，旧访问/刷新令牌全部失效，不支持独立设备会话。
 */
export interface LoginData {
  /** Bearer JWT；示例不是可用令牌 */
  accessToken: string;
  tokenType: LoginDataTokenType;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  expiresAt: string;
  user: User;
  /** 仅用于刷新，不得作为Bearer访问业务接口 */
  refreshToken: string;
  refreshExpiresAt: string;
}
