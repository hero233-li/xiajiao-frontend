/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Paper } from './paper';
import type { AdminUpdatePaperResponseMessage } from './adminUpdatePaperResponseMessage';

export interface AdminUpdatePaperResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: Paper;
  message: AdminUpdatePaperResponseMessage;
}
