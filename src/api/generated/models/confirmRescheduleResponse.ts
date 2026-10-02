/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Plan } from './plan';
import type { ConfirmRescheduleResponseMessage } from './confirmRescheduleResponseMessage';

export interface ConfirmRescheduleResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: Plan;
  message: ConfirmRescheduleResponseMessage;
}
