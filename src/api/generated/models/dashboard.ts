/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { DashboardCycle } from './dashboardCycle';
import type { DashboardContinueLearning } from './dashboardContinueLearning';
import type { DashboardTodaySuggestion } from './dashboardTodaySuggestion';
import type { Progress } from './progress';
import type { Countdown } from './countdown';
import type { Course } from './course';

/**
 * 同一次后端一致性读取生成全部字段；学习中心和备考总览共用此聚合。snapshotId仅标识本次快照，不用于排序，不要求新增数据库列。
 */
export interface Dashboard {
  /** 稳定UUID */
  snapshotId: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  asOf: string;
  /** 上海时区业务日期 */
  localDate: string;
  /** @nullable */
  cycle: DashboardCycle;
  /** @nullable */
  continueLearning: DashboardContinueLearning;
  /** @nullable */
  todaySuggestion: DashboardTodaySuggestion;
  overallProgress: Progress;
  /** @minItems 0 */
  countdowns: Countdown[];
  /** @minItems 0 */
  courses: Course[];
  /**
   * 显式指定的本人本周期计划，或按createdAt/ID倒序选出的最近创建计划；无计划为NULL
   * @nullable
   */
  selectedPlanId: string | null;
  /** 有建议时为中文摘要；没有计划或今日无未完成任务时固定暂无今日安排 */
  todaySuggestionMessage: string;
}
