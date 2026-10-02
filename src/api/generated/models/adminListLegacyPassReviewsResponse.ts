/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LegacyReviewPage } from './legacyReviewPage';
import type { AdminListLegacyPassReviewsResponseMessage } from './adminListLegacyPassReviewsResponseMessage';

export interface AdminListLegacyPassReviewsResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: LegacyReviewPage;
  message: AdminListLegacyPassReviewsResponseMessage;
}
