/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PlanTask } from './planTask';
import type { Progress } from './progress';

/**
 * ITEM更新目录状态，再同步所有相关计划；通过plan revision与任务/目录完成状态锁防并发覆盖。
 */
export interface TaskCompletion {
  task: PlanTask;
  /** @minimum 1 */
  planRevision: number;
  courseProgress: Progress;
  overallProgress: Progress;
  /** @minItems 0 */
  affectedPlanIds: string[];
  /** 稳定UUID */
  clientMutationId: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  asOf: string;
}
