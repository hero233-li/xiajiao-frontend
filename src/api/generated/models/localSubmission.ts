/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalPage } from './localPage';

export interface LocalSubmission {
  id: string;
  courseId: string;
  cycleId: string;
  paperId: string;
  revision: number;
  pages: LocalPage[];
}
