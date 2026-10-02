/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { TaskSegmentState } from './taskSegmentState';

export interface TaskSegment {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  taskId: string;
  /**
   * 上海时区业务日期
   * @nullable
   */
  scheduledOn: string | null;
  /** @minimum 1 */
  minutes: number;
  state: TaskSegmentState;
  /** @minimum 0 */
  sortOrder: number;
}
