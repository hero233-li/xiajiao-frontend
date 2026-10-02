/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PredictionExclusionReason } from './predictionExclusionReason';

export interface PredictionExclusion {
  /** 稳定UUID */
  paperId: string;
  paperKey: string;
  /**
   * 稳定UUID
   * @nullable
   */
  firstValidRecordId: string | null;
  reason: PredictionExclusionReason;
  detail: string;
}
