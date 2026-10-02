/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ExamCycleTimezone } from './examCycleTimezone';
import type { CycleCourse } from './cycleCourse';

export interface ExamCycle {
  /** 稳定UUID */
  id: string;
  name: string;
  /** 上海时区业务日期 */
  startDate: string;
  /** 上海时区业务日期 */
  endDate: string;
  timezone: ExamCycleTimezone;
  /** @minItems 0 */
  courses: CycleCourse[];
}
