/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface LocalFailure {
  leaseToken: string;
  /**
   * @minLength 1
   * @maxLength 500
   */
  reason: string;
  retryable: boolean;
  pause: boolean;
}
