/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface PlanSummary {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  cycleId: string;
  /** 上海时区业务日期 */
  startDate: string;
  /** 上海时区业务日期 */
  endDate: string;
  /** @minimum 1 */
  revision: number;
  /**
   * @minimum 0
   * @maximum 100
   */
  completedPercent: number;
}
