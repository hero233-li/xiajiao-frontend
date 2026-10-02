/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { CourseCourseType } from './courseCourseType';
import type { Progress } from './progress';
import type { CourseEnrollment } from './courseEnrollment';
import type { CourseCapabilities } from './courseCapabilities';

export interface Course {
  /** 稳定UUID */
  id: string;
  /** @pattern ^[0-9]{5}$ */
  code: string;
  name: string;
  courseType: CourseCourseType;
  active: boolean;
  /**
   * 稳定UUID
   * @nullable
   */
  releaseId: string | null;
  progress: Progress;
  /** @nullable */
  enrollment: CourseEnrollment;
  capabilities: CourseCapabilities;
}
