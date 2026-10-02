/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PlanTaskKind } from './planTaskKind';
import type { Navigation } from './navigation';

export interface PlanTask {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  courseId: string;
  /**
   * 稳定UUID
   * @nullable
   */
  itemId: string | null;
  /**
   * 稳定UUID
   * @nullable
   */
  templateId: string | null;
  kind: PlanTaskKind;
  title: string;
  /** @minimum 1 */
  estimatedMinutes: number;
  /** 稳定UUID */
  releaseId: string;
  completed: boolean;
  /**
   * UTC事件时间（RFC3339）；客户端不可当作本地时间写入
   * @nullable
   */
  completedAt: string | null;
  target: Navigation;
}
