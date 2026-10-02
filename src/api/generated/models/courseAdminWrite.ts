/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { CourseAdminWriteCode } from './courseAdminWriteCode';
import type { CourseAdminWriteCourseType } from './courseAdminWriteCourseType';

export interface CourseAdminWrite {
  /** @pattern ^[0-9]{5}$ */
  code: CourseAdminWriteCode;
  /**
   * @minLength 1
   * @maxLength 200
   */
  name: string;
  courseType: CourseAdminWriteCourseType;
  active: boolean;
}
