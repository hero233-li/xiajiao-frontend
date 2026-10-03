/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PlanConfigStrategy } from './planConfigStrategy';
import type { PlanConfigDayCapacitiesItem } from './planConfigDayCapacitiesItem';

/**
 * 每一天显式容量，可为0；起止不硬编码35天/2026；课程顺序与每日时长由用户配置，估时由ADMIN维护。
 */
export interface PlanConfig {
  /**
   * 用户计划名称；旧计划未设置时显示日期范围
   * @minLength 1
   * @maxLength 100
   */
  name?: string;
  /** 省略为原连续排期；WEEKLY_35固定35天、4门理论科目，前4周各1门，第5周真题与复习 */
  strategy?: PlanConfigStrategy;
  /** 稳定UUID */
  cycleId: string;
  /** 上海时区业务日期 */
  startDate: string;
  /** 上海时区业务日期 */
  endDate: string;
  /** @minItems 1 */
  coursePriority: string[];
  /** @minItems 1 */
  dayCapacities: PlanConfigDayCapacitiesItem[];
  /** @minItems 1 */
  courseScope: string[];
}
