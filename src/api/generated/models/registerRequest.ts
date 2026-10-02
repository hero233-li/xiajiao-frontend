/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface RegisterRequest {
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^\S+$
   */
  username: string;
  /**
   * @maxLength 254
   * @pattern ^\S+$
   */
  email: string;
  /**
   * 至少8个字符，且UTF-8总长度最多72字节；字符maxLength不足以替代服务端字节校验
   * @minLength 8
   * @maxLength 72
   */
  password: string;
}
