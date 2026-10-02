/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { TaskSegment } from './taskSegment';

export type PlanPreviewMovesItem = {
  /** 稳定UUID */
  segmentId: string;
  /** 上海时区业务日期 */
  fromDate: string;
  /** @minItems 0 */
  toSegments: TaskSegment[];
};
