/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AlertPage } from './alertPage';
import type { AdminListAlertsResponseMessage } from './adminListAlertsResponseMessage';

export interface AdminListAlertsResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: AlertPage;
  message: AdminListAlertsResponseMessage;
}
