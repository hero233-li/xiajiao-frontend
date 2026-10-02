/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface LoginRequest {
  /**
   * 按用户名或邮箱匹配；原值规则暂沿用数据库，规范化待确认
   * @minLength 1
   * @maxLength 254
   */
  identifier: string;
  /**
   * 密码原值；UTF-8最多72字节（BCrypt限制），不trim或记录日志
   * @minLength 1
   */
  password: string;
}
