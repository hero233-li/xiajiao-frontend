/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { CoursePage } from './coursePage';
import type { ListCoursesResponseMessage } from './listCoursesResponseMessage';

export interface ListCoursesResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: CoursePage;
  message: ListCoursesResponseMessage;
}
