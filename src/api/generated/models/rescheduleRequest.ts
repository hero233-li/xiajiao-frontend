/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PlanConfig } from './planConfig';
import type { RescheduleRequestDayCapacitiesItem } from './rescheduleRequestDayCapacitiesItem';

/**
 * 仅调整逾期重排预算/优先级。已完成、今天和未来安排不动；新的容量不得小于保留分段分钟。
 */
export interface RescheduleRequest {
  /** 完整配置编辑预览；原版本与学习记录保留。不提供时仍仅顺延逾期任务。 */
  config?: PlanConfig;
  /** @minimum 1 */
  baseRevision: number;
  /** @minItems 0 */
  dayCapacities?: RescheduleRequestDayCapacitiesItem[];
  /** @minItems 0 */
  coursePriority?: string[];
}
