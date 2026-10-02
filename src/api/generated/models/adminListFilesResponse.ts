/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { FilePage } from './filePage';
import type { AdminListFilesResponseMessage } from './adminListFilesResponseMessage';

export interface AdminListFilesResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: FilePage;
  message: AdminListFilesResponseMessage;
}
