/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LegacyRecordSummaryKind } from './legacyRecordSummaryKind';

export interface LegacyRecordSummary {
  /** 稳定UUID */
  id: string;
  kind: LegacyRecordSummaryKind;
  /**
   * 稳定UUID
   * @nullable
   */
  courseId: string | null;
  title: string;
  /**
   * UTC事件时间（RFC3339）；客户端不可当作本地时间写入
   * @nullable
   */
  createdAt: string | null;
  readOnly: boolean;
  /** @minimum 0 */
  fileCount: number;
}
