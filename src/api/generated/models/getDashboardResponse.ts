/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Dashboard } from './dashboard';
import type { GetDashboardResponseMessage } from './getDashboardResponseMessage';

export interface GetDashboardResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: Dashboard;
  message: GetDashboardResponseMessage;
}
