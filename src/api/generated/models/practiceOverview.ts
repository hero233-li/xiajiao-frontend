/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PracticeChapter } from './practiceChapter';
import type { PracticeStats } from './practiceStats';

export interface PracticeOverview {
  /** 稳定UUID */
  courseId: string;
  /** 稳定UUID */
  releaseId: string;
  /** @minItems 0 */
  chapters: PracticeChapter[];
  stats: PracticeStats;
  /** @minimum 0 */
  variantQuestionCount: number;
}
