/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AdminCourseEntry } from './adminCourseEntry';

export type ListAdminCourses200Data = {
  items: AdminCourseEntry[];
  page: number;
  size: number;
  total: number;
};
