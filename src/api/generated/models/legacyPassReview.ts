/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LegacyPassReviewKind } from './legacyPassReviewKind';
import type { LegacyPassReviewDecision } from './legacyPassReviewDecision';

export interface LegacyPassReview {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  legacyRecordId: string;
  /** 稳定UUID */
  courseId: string;
  /**
   * 稳定UUID
   * @nullable
   */
  chapterId: string | null;
  kind: LegacyPassReviewKind;
  /**
   * @minimum 0
   * @maximum 100
   */
  oldScore: number;
  /**
   * @minimum 0
   * @maximum 100
   */
  oldThreshold: number;
  /** @nullable */
  oldVersion: string | null;
  /**
   * 稳定UUID
   * @nullable
   */
  mappingReleaseId: string | null;
  decision: LegacyPassReviewDecision;
  /** @nullable */
  reason: string | null;
  /**
   * UTC事件时间（RFC3339）；客户端不可当作本地时间写入
   * @nullable
   */
  decidedAt: string | null;
  /**
   * 稳定UUID
   * @nullable
   */
  passId: string | null;
}
