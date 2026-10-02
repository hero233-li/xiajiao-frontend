/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * 从配置起始日每7天分组，最后一组可不足7天；按分段快照分钟计算，空组0。
 */
export interface PlanWeek {
  /** @minimum 1 */
  index: number;
  /** 上海时区业务日期 */
  startDate: string;
  /** 上海时区业务日期 */
  endDate: string;
  /** @minimum 0 */
  scheduledMinutes: number;
  /** @minimum 0 */
  completedMinutes: number;
  /**
   * @minimum 0
   * @maximum 100
   */
  percent: number;
}
