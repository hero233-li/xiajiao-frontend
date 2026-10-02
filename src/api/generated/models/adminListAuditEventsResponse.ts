/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AuditPage } from './auditPage';
import type { AdminListAuditEventsResponseMessage } from './adminListAuditEventsResponseMessage';

export interface AdminListAuditEventsResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: AuditPage;
  message: AdminListAuditEventsResponseMessage;
}
