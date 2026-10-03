/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AdminCourseEntryCourseType } from './adminCourseEntryCourseType';

export interface AdminCourseEntry {
  id: string;
  code: string;
  name: string;
  courseType: AdminCourseEntryCourseType;
  active: boolean;
  /** @nullable */
  releaseId: string | null;
}
