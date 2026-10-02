/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { BankAlert } from './bankAlert';
import type { AdminAcknowledgeAlertResponseMessage } from './adminAcknowledgeAlertResponseMessage';

export interface AdminAcknowledgeAlertResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: BankAlert;
  message: AdminAcknowledgeAlertResponseMessage;
}
