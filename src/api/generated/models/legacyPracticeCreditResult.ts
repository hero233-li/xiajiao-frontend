/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LegacyPracticeSummary } from './legacyPracticeSummary';
import type { PracticeStats } from './practiceStats';

export interface LegacyPracticeCreditResult {
  summary: LegacyPracticeSummary;
  stats: PracticeStats;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  auditedAt: string;
}
