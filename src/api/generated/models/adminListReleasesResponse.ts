/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ReleasePage } from './releasePage';
import type { AdminListReleasesResponseMessage } from './adminListReleasesResponseMessage';

export interface AdminListReleasesResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: ReleasePage;
  message: AdminListReleasesResponseMessage;
}
