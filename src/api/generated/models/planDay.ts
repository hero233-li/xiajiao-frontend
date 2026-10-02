/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { TaskSegment } from './taskSegment';

export interface PlanDay {
  /** 上海时区业务日期 */
  day: string;
  /**
   * @minimum 0
   * @maximum 1440
   */
  capacityMinutes: number;
  /**
   * 当天已有分段总分钟
   * @minimum 0
   */
  reservedMinutes: number;
  /**
   * 后端计算剩余容量，不得为负
   * @minimum 0
   */
  remainingMinutes: number;
  /** @minItems 0 */
  segments: TaskSegment[];
  /** @minimum 0 */
  completedMinutes: number;
  /**
   * @minimum 0
   * @maximum 100
   */
  percent: number;
}
