/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { SessionSummaryKind } from './sessionSummaryKind';
import type { SessionSummaryStatus } from './sessionSummaryStatus';

export interface SessionSummary {
  /** 稳定UUID */
  id: string;
  kind: SessionSummaryKind;
  /**
   * 稳定UUID
   * @nullable
   */
  chapterId: string | null;
  status: SessionSummaryStatus;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  startedAt: string;
  /**
   * UTC事件时间（RFC3339）；客户端不可当作本地时间写入
   * @nullable
   */
  submittedAt: string | null;
  /**
   * @minimum 0
   * @maximum 100
   * @nullable
   */
  score: number | null;
  /** @nullable */
  passed: boolean | null;
  /** 稳定UUID */
  releaseId: string;
}
