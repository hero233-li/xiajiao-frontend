/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PracticeStats } from './practiceStats';

export interface PracticeChapter {
  /** 稳定UUID */
  chapterId: string;
  title: string;
  stats: PracticeStats;
  passed: boolean;
  /** @minItems 0 */
  passReleaseIds: string[];
}
