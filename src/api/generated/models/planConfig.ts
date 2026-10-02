/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PlanConfigDayCapacitiesItem } from './planConfigDayCapacitiesItem';

/**
 * 每一天显式容量，可为0；起止不硬编码35天/2026；课程顺序与每日时长由用户配置，估时由ADMIN维护。
 */
export interface PlanConfig {
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
