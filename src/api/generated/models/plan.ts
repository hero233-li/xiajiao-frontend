/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PlanConfig } from './planConfig';
import type { PlanTask } from './planTask';
import type { PlanDay } from './planDay';
import type { TaskSegment } from './taskSegment';
import type { PlanProgress } from './planProgress';
import type { PlanWeek } from './planWeek';
import type { Course } from './course';

/**
 * ITEM完成与目录双向同步；其余任务独立状态。计划进度按快照估时而非实际计时。日/周按已排分段分钟计算；completedDayCount仅统计有任务且全部完成的日期，dayCount为配置日期数，逾期分钟为今天之前未完成分段；均后端派生，无新增持久化字段。courseSummaries沿用当前目录进度口径。
 */
export interface Plan {
  /** 稳定UUID */
  id: string;
  /** @minimum 1 */
  revision: number;
  config: PlanConfig;
  /** @minItems 0 */
  tasks: PlanTask[];
  /** @minItems 0 */
  days: PlanDay[];
  /** @minItems 0 */
  unscheduled: TaskSegment[];
  /** @minItems 0 */
  awaitingDate: TaskSegment[];
  progress: PlanProgress;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  createdAt: string;
  /**
   * UTC事件时间（RFC3339）；客户端不可当作本地时间写入
   * @nullable
   */
  confirmedAt: string | null;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  asOf: string;
  /** @minItems 0 */
  weeks: PlanWeek[];
  /** @minimum 0 */
  completedDayCount: number;
  /** @minimum 0 */
  dayCount: number;
  /** @minimum 0 */
  overdueUncompletedMinutes: number;
  /** @minItems 0 */
  courseSummaries: Course[];
}
