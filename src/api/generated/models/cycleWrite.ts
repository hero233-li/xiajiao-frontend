/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { CycleCourse } from './cycleCourse';

/**
 * 首版仅六科；考试时段只能ADMIN维护，date未知NULL；更新不得自动重排已确认计划。
 */
export interface CycleWrite {
  /**
   * @minLength 1
   * @maxLength 200
   */
  name: string;
  /** 上海时区业务日期 */
  startDate: string;
  /** 上海时区业务日期 */
  endDate: string;
  /** @minItems 0 */
  courses: CycleCourse[];
}
