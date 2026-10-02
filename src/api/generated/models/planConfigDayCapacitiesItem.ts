/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export type PlanConfigDayCapacitiesItem = {
  /** 上海时区业务日期 */
  day: string;
  /**
   * @minimum 0
   * @maximum 1440
   */
  capacityMinutes: number;
};
