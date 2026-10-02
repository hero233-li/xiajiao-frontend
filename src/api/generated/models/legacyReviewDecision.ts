/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LegacyReviewDecisionDecision } from './legacyReviewDecisionDecision';

/**
 * ACCEPT须完整稳定映射，旧版本未知不冒充新版本；本人认领后生成LEGACY_CONFIRMED pass，不能伪造新检测session。
 */
export interface LegacyReviewDecision {
  decision: LegacyReviewDecisionDecision;
  /** @minLength 1 */
  reason: string;
  /** 稳定UUID */
  courseId: string;
  /**
   * 稳定UUID
   * @nullable
   */
  chapterId: string | null;
  /**
   * 稳定UUID
   * @nullable
   */
  mappingReleaseId: string | null;
}
