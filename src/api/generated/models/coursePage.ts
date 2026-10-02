/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Course } from './course';

export interface CoursePage {
  /** @minItems 0 */
  items: Course[];
  /**
   * 页码，从1开始
   * @minimum 1
   */
  page: number;
  /**
   * 每页条数，1–100
   * @minimum 1
   * @maximum 100
   */
  size: number;
  /**
   * 符合筛选条件的总条数，不是当前页长度
   * @minimum 0
   */
  total: number;
}
