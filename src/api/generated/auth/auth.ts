/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type {
  GetCurrentUserResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  RefreshRequest,
  RegisterRequest,
  RegisterResponse
} from '.././models';

import { apiRequest } from '../../http';
import type { BodyType } from '../../http';


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];


  /**
 * 初始化本人ADMIN；关闭注册。对密码错误和不存在账号给同一错误，不泄漏账号存在性。
公开登录入口；禁止公开注册。 阶段4已实现：标识按原值区分，不自动trim/大小写转换；账号不存在、密码错误或停用均返回40102，避免登录时泄漏账号状态。
 * @summary 用户名或邮箱登录
 */
export const login = (
    loginRequest: BodyType<LoginRequest>,
 options?: SecondParameter<typeof apiRequest<LoginResponse>>,) => {
      return apiRequest<LoginResponse>(
      {url: `/api/v1/auth/login`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: loginRequest
    },
      options);
    }
  /**
 * 本人数据，身份来自JWT。
 * @summary 读取当前账号
 */
export const getCurrentUser = (
    
 options?: SecondParameter<typeof apiRequest<GetCurrentUserResponse>>,) => {
      return apiRequest<GetCurrentUserResponse>(
      {url: `/api/v1/auth/me`, method: 'GET'
    },
      options);
    }
  /**
 * token_version递增，撤销当前账号所有已签发JWT；客户端同时清理私有缓存。首版没有独立令牌会话表，不能声称仅退出这一设备。
本人数据，身份来自JWT。
 * @summary 退出当前账号的全部登录会话
 */
export const logout = (
    
 options?: SecondParameter<typeof apiRequest<LogoutResponse>>,) => {
      return apiRequest<LogoutResponse>(
      {url: `/api/v1/auth/logout`, method: 'POST'
    },
      options);
    }
  /**
 * 验证签名、issuer/audience、有效期、refresh类型、账号启用及token_version；事务锁用户后版本加一并签发新令牌对。同一旧刷新令牌重复/并发仅首次成功，其余40101；访问令牌不能用于刷新。每次轮换撤销该账号所有设备旧令牌。请求不需要访问令牌；若主动附上无效Bearer，认证过滤器仍拒绝。
 * @summary 轮换刷新令牌并撤销账号旧令牌
 */
export const refreshTokens = (
    refreshRequest: BodyType<RefreshRequest>,
 options?: SecondParameter<typeof apiRequest<LoginResponse>>,) => {
      return apiRequest<LoginResponse>(
      {url: `/api/v1/auth/refresh`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: refreshRequest
    },
      options);
    }
  /**
 * 注册范围尚待用户确认，部署默认DISABLED（所有调用40301）。已准备ADMIN_ONLY和PUBLIC两种配置：ADMIN_ONLY要求当前启用ADMIN的访问令牌，无登录40101、USER40301；PUBLIC无需登录。启用范围必须先取得用户确认。所有模式创建结果仅USER，不接受role/userId；用户名和邮箱按原值唯一，统一登录标识同时禁止跨账号用户名/邮箱冲突；BCrypt12，不返回哈希。当前仅通过初始化配置创建本人ADMIN。
 * @summary 创建USER账号（默认关闭）
 */
export const registerUser = (
    registerRequest: BodyType<RegisterRequest>,
 options?: SecondParameter<typeof apiRequest<RegisterResponse>>,) => {
      return apiRequest<RegisterResponse>(
      {url: `/api/v1/auth/register`, method: 'POST',
      headers: {'Content-Type': 'application/json', },
      data: registerRequest
    },
      options);
    }
  export type LoginResult = NonNullable<Awaited<ReturnType<typeof login>>>
export type GetCurrentUserResult = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
export type LogoutResult = NonNullable<Awaited<ReturnType<typeof logout>>>
export type RefreshTokensResult = NonNullable<Awaited<ReturnType<typeof refreshTokens>>>
export type RegisterUserResult = NonNullable<Awaited<ReturnType<typeof registerUser>>>
