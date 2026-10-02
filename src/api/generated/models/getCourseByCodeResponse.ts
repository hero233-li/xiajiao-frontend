/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Course } from './course';
import type { GetCourseByCodeResponseMessage } from './getCourseByCodeResponseMessage';

export interface GetCourseByCodeResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: Course;
  message: GetCourseByCodeResponseMessage;
}
