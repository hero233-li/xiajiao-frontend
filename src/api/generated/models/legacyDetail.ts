/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LegacyRecordSummary } from './legacyRecordSummary';
import type { LegacyError } from './legacyError';
import type { FileMetadata } from './fileMetadata';
import type { LegacyDetailPassReview } from './legacyDetailPassReview';

/**
 * 不直接返回任意legacy payload，防止objectKey/私有URL漏出；下载按fileId授权，旧任务不可改写。
 */
export interface LegacyDetail {
  summary: LegacyRecordSummary;
  oldId: string;
  /** @nullable */
  oldStatus: string | null;
  /**
   * @minimum 0
   * @maximum 100
   * @nullable
   */
  oldScore: number | null;
  /** @nullable */
  summaryText: string | null;
  /** @minItems 0 */
  errors: LegacyError[];
  /** @minItems 0 */
  files: FileMetadata[];
  /** @nullable */
  passReview: LegacyDetailPassReview;
  /** 只读历史JSON/文本的转义展示；所有答案仅此本人历史详情可查看，绝不注入未交卷题干 */
  archivedContent: string;
}
