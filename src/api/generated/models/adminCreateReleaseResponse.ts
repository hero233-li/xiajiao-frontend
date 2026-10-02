/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ContentRelease } from './contentRelease';
import type { AdminCreateReleaseResponseMessage } from './adminCreateReleaseResponseMessage';

export interface AdminCreateReleaseResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: ContentRelease;
  message: AdminCreateReleaseResponseMessage;
}
